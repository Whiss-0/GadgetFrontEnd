import { useCallback, useEffect, useMemo, useState } from "react";
import { reviewsApi } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

const STAR_VALUES = [1, 2, 3, 4, 5];

function Stars({ value, interactive = false, onSelect, label = "Rating" }) {
  const roundedValue = Math.round(Number(value) || 0);

  return (
    <div className={`review-stars ${interactive ? "is-interactive" : ""}`} role={interactive ? "group" : "img"} aria-label={interactive ? label : `${roundedValue} out of 5 stars`}>
      {STAR_VALUES.map((star) => interactive ? (
        <button
          type="button"
          key={star}
          className={`review-star-button ${star <= roundedValue ? "is-filled" : ""}`}
          onClick={() => onSelect(star)}
          aria-label={`Rate ${star} out of 5 stars`}
          aria-pressed={star === roundedValue}
        >
          <span aria-hidden="true">★</span>
        </button>
      ) : (
        <span key={star} className={`review-star ${star <= roundedValue ? "is-filled" : ""}`} aria-hidden="true">★</span>
      ))}
    </div>
  );
}

function formatReviewDate(value) {
  if (!value) return "Recent review";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recent review";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function ProductReviews({ productId }) {
  const { isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await reviewsApi.listForProduct(productId);
      setReviews(Array.isArray(res.data) ? res.data : []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => { load(); }, [load, retryNonce]);

  const summary = useMemo(() => {
    const total = reviews.length;
    const average = total > 0
      ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / total
      : 0;
    const distribution = STAR_VALUES.reduce((result, star) => {
      result[star] = reviews.filter((review) => Number(review.rating) === star).length;
      return result;
    }, {});
    return { total, average, distribution };
  }, [reviews]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await reviewsApi.create({ product_ID: Number(productId), rating, comment: comment.trim() || null });
      setComment("");
      setRating(5);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't submit your review.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="product-reviews" aria-labelledby="reviews-heading">
      <div className="product-reviews-heading">
        <div>
          <p className="review-eyebrow">Customer reviews</p>
          <h2 id="reviews-heading" className="review-title">
            What people are saying{summary.total > 0 && <span className="review-count">{summary.total}</span>}
          </h2>
        </div>
        {summary.total > 0 && (
          <div className="review-heading-score">
            <strong>{summary.average.toFixed(1)}</strong>
            <Stars value={summary.average} label={`${summary.average.toFixed(1)} out of 5 stars`} />
          </div>
        )}
      </div>

      {!loading && !loadError && summary.total > 0 && (
        <div className="review-summary" aria-label={`${summary.total} customer ratings`}>
          <div className="review-summary-score">
            <strong>{summary.average.toFixed(1)}</strong>
            <Stars value={summary.average} />
            <span>Based on {summary.total} review{summary.total === 1 ? "" : "s"}</span>
          </div>
          <div className="review-distribution">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = summary.distribution[star];
              const percentage = summary.total ? (count / summary.total) * 100 : 0;
              return (
                <div key={star} className="review-distribution-row">
                  <span>{star}</span><span aria-hidden="true">★</span>
                  <span className="review-distribution-track"><span style={{ width: `${percentage}%` }} /></span>
                  <span>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="review-composer">
          <div className="review-composer-header">
            <div>
              <p className="review-composer-kicker">Share your experience</p>
              <label className="review-composer-label">Your rating</label>
            </div>
            <span className="review-rating-text">{rating} out of 5</span>
          </div>
          <Stars value={rating} interactive onSelect={setRating} label="Choose a rating from 1 to 5 stars" />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What did you like, and what should shoppers know?"
            rows={4}
            maxLength={1000}
            className="review-textarea"
            aria-label="Your review"
          />
          <div className="review-composer-footer">
            <span className="review-character-count">{comment.length}/1000</span>
            <button type="submit" disabled={submitting} className="btn-primary review-submit">
              {submitting ? "Posting…" : "Post review"}
            </button>
          </div>
          {error && <p className="review-form-error" role="alert">{error}</p>}
        </form>
      ) : (
        <div className="review-sign-in-note">
          <span>Have this product?</span>
          <Link to="/login" state={{ from: { pathname: `/products/${productId}` } }}>Sign in to share your experience</Link>
        </div>
      )}

      {loading ? (
        <div className="review-loading" role="status" aria-live="polite"><span className="review-loading-line" /><span className="review-loading-line short" />Loading customer reviews…</div>
      ) : loadError ? (
        <div className="review-state" role="alert">
          <strong>Reviews are unavailable right now.</strong>
          <span>We couldn’t load the feedback for this product.</span>
          <button type="button" onClick={() => setRetryNonce((value) => value + 1)} className="review-state-action">Try again</button>
        </div>
      ) : summary.total === 0 ? (
        <div className="review-state review-empty">
          <span className="review-empty-mark" aria-hidden="true">★</span>
          <strong>No reviews yet</strong>
          <span>Be the first shopper to share a helpful note about this product.</span>
        </div>
      ) : (
        <div className="review-list">
          {reviews.map((review) => {
            const id = review.review_ID ?? review.review_id ?? review.id;
            const reviewRating = Number(review.rating) || 0;
            return (
              <article key={id} className="review-card">
                <div className="review-card-topline">
                  <div className="review-card-author">
                    <span className="review-avatar" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="8" r="3.5" />
                        <path d="M5 20a7 7 0 0 1 14 0" />
                      </svg>
                    </span>
                    <div><strong>Shopper</strong><time dateTime={review.review_date ?? review.reviewDate}>{formatReviewDate(review.review_date ?? review.reviewDate)}</time></div>
                  </div>
                  <Stars value={reviewRating} />
                </div>
                {review.comment ? <p className="review-comment">{review.comment}</p> : <p className="review-comment is-muted">Rated this product without a written comment.</p>}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

import { useEffect, useState } from "react";
import { reviewsApi } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function ProductReviews({ productId }) {
  const { isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function load() {
    reviewsApi
      .listForProduct(productId)
      .then((res) => setReviews(res.data || []))
      .catch(() => setReviews([]));
  }

  useEffect(load, [productId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await reviewsApi.create({ product_ID: Number(productId), rating, comment });
      setComment("");
      setRating(5);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't submit your review.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-14 max-w-2xl">
      <p className="font-[var(--font-mono)] text-xs text-[var(--color-circuit)] mb-1">REVIEWS</p>
      <h2 className="font-[var(--font-display)] text-xl font-semibold mb-5">
        What people are saying {reviews.length > 0 && `(${reviews.length})`}
      </h2>

      {isAuthenticated && (
        <form onSubmit={handleSubmit} className="spec-ticket rounded-md p-4 mb-6 !before:hidden">
          <div className="flex items-center gap-2 mb-3">
            <label className="text-sm font-medium">Your rating:</label>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                type="button"
                key={n}
                onClick={() => setRating(n)}
                className={`text-lg ${n <= rating ? "text-[var(--color-gold)]" : "text-[var(--color-line)]"}`}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your thoughts on this product…"
            rows={3}
            maxLength={1000}
            className="w-full border border-[var(--color-line)] rounded px-3 py-2 text-sm focus:border-[var(--color-circuit)] outline-none"
          />
          {error && <p className="text-xs text-[var(--color-signal)] mt-2">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="mt-3 btn-primary text-sm font-semibold px-4 py-2 rounded disabled:opacity-50"
          >
            {submitting ? "Posting…" : "Post review"}
          </button>
        </form>
      )}

      {reviews.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-soft)]">No reviews yet — be the first.</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => {
            const id = r.review_ID ?? r.id;
            const rv = r.rating ?? 0;
            return (
              <div key={id} className="border-b border-[var(--color-line)] pb-4">
                <div className="flex items-center gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className={n <= rv ? "text-[var(--color-gold)]" : "text-[var(--color-line)]"}>★</span>
                  ))}
                </div>
                <p className="text-sm text-[var(--color-ink-soft)]">{r.comment}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

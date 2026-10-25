import { useEffect, useRef, useState } from "react";
import { productsApi } from "../api/client";
import ProductCard from "./ProductCard";

export default function BestSellersCarousel({ onAddToCart }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);
  const trackRef = useRef(null);

  useEffect(() => {
    let active = true;
    productsApi.bestSellers(8)
      .then((response) => {
        if (active) setProducts(Array.isArray(response.data) ? response.data : []);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || products.length === 0) return undefined;

    const updateControls = () => {
      setCanScrollBack(track.scrollLeft > 2);
      setCanScrollForward(track.scrollLeft + track.clientWidth < track.scrollWidth - 2);
    };
    updateControls();
    track.addEventListener("scroll", updateControls, { passive: true });
    window.addEventListener("resize", updateControls);
    return () => {
      track.removeEventListener("scroll", updateControls);
      window.removeEventListener("resize", updateControls);
    };
  }, [products.length]);

  function moveCarousel(direction) {
    const track = trackRef.current;
    if (!track) return;
    const slide = track.querySelector(".best-seller-slide");
    const distance = slide ? slide.getBoundingClientRect().width + 18 : track.clientWidth * 0.8;
    track.scrollBy({ left: direction * distance, behavior: "smooth" });
  }

  const maxUnitsSold = Math.max(...products.map((product) => Number(product.units_sold ?? 0)), 1);

  return (
    <section id="best-sellers" className="best-sellers-section mb-10 scroll-mt-24" aria-labelledby="best-sellers-heading">
      <div className="best-sellers-heading-row">
        <div className="best-sellers-copy">
          <span className="best-sellers-eyebrow"><span aria-hidden="true">✦</span> Customer favorites · 30 days</span>
          <h2 id="best-sellers-heading">Best sellers</h2>
          <p>Popular picks, ranked by units ordered in the last 30 days.</p>
        </div>
        {!loading && !error && products.length > 1 && (
          <div className="best-sellers-controls" role="group" aria-label="Best sellers carousel controls">
            <button type="button" onClick={() => moveCarousel(-1)} disabled={!canScrollBack} aria-label="Show previous best sellers">
              <span aria-hidden="true">←</span>
            </button>
            <button type="button" onClick={() => moveCarousel(1)} disabled={!canScrollForward} aria-label="Show more best sellers">
              <span aria-hidden="true">→</span>
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="best-sellers-empty" role="status" aria-live="polite">Finding this month’s most-ordered products…</div>
      ) : error ? (
        <div className="best-sellers-empty" role="status">Best sellers aren’t available right now. You can still browse the full collection below.</div>
      ) : products.length === 0 ? (
        <div className="best-sellers-empty" role="status">The customer favorites will appear here after orders are placed. Cancelled orders are excluded.</div>
      ) : (
        <div className="best-sellers-viewport">
          <div className="best-sellers-track" ref={trackRef} role="list" aria-label="Products ranked by units ordered in the last 30 days">
            {products.map((product, index) => {
              const sold = Number(product.units_sold ?? 0);
              const salesShare = Math.max(8, (sold / maxUnitsSold) * 100);
              return (
                <article className="best-seller-slide" key={product.product_id} role="listitem">
                  <div className="best-seller-rankline">
                    <span className="best-seller-rank">{String(index + 1).padStart(2, "0")}</span>
                    <span className="best-seller-units">{sold} {sold === 1 ? "unit" : "units"} ordered</span>
                  </div>
                  <div className="best-seller-meter" aria-hidden="true"><span style={{ width: `${salesShare}%` }} /></div>
                  <ProductCard product={product} onAddToCart={onAddToCart} />
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

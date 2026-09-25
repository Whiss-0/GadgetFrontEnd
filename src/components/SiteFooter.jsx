import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function SiteFooter() {
  const { isAuthenticated } = useAuth();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <Link to="/" className="site-footer-logo">
            Gadget<span>/</span>Store
          </Link>
          <p>Thoughtful tech for the way you work, play, and live.</p>
        </div>

        <nav className="site-footer-links" aria-label="Footer navigation">
          <Link to="/">Shop</Link>
          {isAuthenticated && <Link to="/orders">Orders</Link>}
          {isAuthenticated && <Link to="/wishlist">Wishlist</Link>}
          <Link to={isAuthenticated ? "/settings" : "/login"}>Account</Link>
        </nav>

        <p className="site-footer-note">Reliable gear. Clear choices.</p>
      </div>
    </footer>
  );
}

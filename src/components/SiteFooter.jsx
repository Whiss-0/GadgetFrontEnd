import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function SiteFooter() {
  const { isAuthenticated } = useAuth();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <Link to="/" className="site-footer-logo brand-wordmark">
            GadgetStore
          </Link>
          <p>The tech you want. Service you can trust.</p>
        </div>

        <div className="site-footer-column">
          <p className="site-footer-heading">Explore</p>
          <nav className="site-footer-links" aria-label="Store navigation">
            <Link to="/">Shop</Link>
            {isAuthenticated && <Link to="/orders">Orders</Link>}
            {isAuthenticated && <Link to="/wishlist">Wishlist</Link>}
            <Link to={isAuthenticated ? "/settings" : "/login"}>Account</Link>
          </nav>
        </div>

        <div className="site-footer-column">
          <p className="site-footer-heading">Information</p>
          <nav className="site-footer-links" aria-label="Store information">
            <Link to="/about">About Us</Link>
            <Link to="/return-policy">Return Policy</Link>
            <Link to="/terms-of-service">Terms of Service</Link>
          </nav>
        </div>

        <div className="site-footer-column site-footer-contact-column">
          <p className="site-footer-heading">Need help?</p>
          <nav className="site-footer-links" aria-label="Customer help">
            <Link to="/contact">Contact Us</Link>
          </nav>
          <p className="site-footer-note">Questions, complaints, return requests, and feedback are welcome.</p>
        </div>
      </div>
    </footer>
  );
}

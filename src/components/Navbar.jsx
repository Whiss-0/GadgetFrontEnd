import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useState, useRef, useEffect } from "react";
import ThemeToggle from "./ThemeToggle";

function Pin() {
  return <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-circuit)] mr-2 align-middle" />;
}

function RoleBadge({ isAdmin, isMod }) {
  if (!isMod) return null;
  return (
    <span className="font-[var(--font-mono)] text-[10px] font-bold tracking-widest px-2 py-0.5 rounded border border-[var(--color-circuit)]/60 text-[var(--color-circuit)] bg-[var(--color-circuit)]/10 select-none">
      {isAdmin ? "ADMIN" : "STAFF"}
    </span>
  );
}

function UserMenu({ user, logout }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="user-menu-container" ref={menuRef}>
      <button
        type="button"
        className="user-menu-trigger flex items-center gap-1.5"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Account menu"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span className="user-menu-name">{user?.username || "Account"}</span>
        <span className="chevron text-[10px] opacity-70" aria-hidden="true">▾</span>
      </button>

      {isOpen && (
        <div className="dropdown-menu" role="menu">
          <Link to="/orders" className="dropdown-item" onClick={() => setIsOpen(false)} role="menuitem">
            <span className="dropdown-item-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </span>
            <span>Orders</span>
          </Link>
          <Link to="/wishlist" className="dropdown-item" onClick={() => setIsOpen(false)} role="menuitem">
            <span className="dropdown-item-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </span>
            <span>Wishlist</span>
          </Link>
          <Link to="/activity" className="dropdown-item" onClick={() => setIsOpen(false)} role="menuitem">
            <span className="dropdown-item-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 15.5 14" />
              </svg>
            </span>
            <span>Activity</span>
          </Link>
          <Link to="/settings" className="dropdown-item" onClick={() => setIsOpen(false)} role="menuitem">
            <span className="dropdown-item-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </span>
            <span>Account</span>
          </Link>
          <button
            type="button"
            className="dropdown-item logout-btn"
            onClick={() => {
              setIsOpen(false);
              logout();
              navigate("/");
            }}
            role="menuitem"
          >
            <span className="dropdown-item-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </span>
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  );
}

function MenuLinks({ isAuthenticated, isMod, isAdmin, className = "", onNavigate, id, isMobile = false }) {
  return (
    <nav id={id} className={className} aria-label="Primary navigation">
      <Link to="/" className="header-nav-link" onClick={onNavigate}>Shop</Link>
      {isAuthenticated && <Link to="/orders" className="header-nav-link" onClick={onNavigate}>Orders</Link>}
      {isAuthenticated && isMobile && (
        <Link to="/wishlist" className="header-nav-link" onClick={onNavigate}>Wishlist</Link>
      )}
      {isMod && (
        <Link to="/admin" className="header-nav-link header-nav-link-accent" onClick={onNavigate}>
          {isAdmin ? "Admin" : "Staff"}
        </Link>
      )}
    </nav>
  );
}

export default function Navbar() {
  const { isAuthenticated, isAdmin, isMod, user, logout } = useAuth();
  const { items } = useCart();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const count = items.reduce((sum, item) => sum + (item.quantity || 1), 0);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-40 top-header border-b relative">
      <div className="header-inner max-w-6xl mx-auto px-5">
        <Link to="/" className="font-[var(--font-display)] font-semibold text-lg tracking-tight flex items-center gap-2 z-10 logo-text" aria-label="Gadget Store home">
          <span className="flex items-center whitespace-nowrap">
            <Pin />
            Gadget<span className="text-[var(--color-circuit)]">/</span>Store
          </span>
          <RoleBadge isAdmin={isAdmin} isMod={isMod} />
        </Link>

        <MenuLinks
          isAuthenticated={isAuthenticated}
          isMod={isMod}
          isAdmin={isAdmin}
          className="header-nav hidden md:flex items-center text-sm font-medium"
        />

        <div className="header-actions flex items-center gap-2 sm:gap-3 z-10">
          {isAuthenticated && (
            <Link
              to="/wishlist"
              className="wishlist-link flex items-center gap-1.5 text-sm font-medium transition-colors hidden sm:flex text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
              aria-label="Wishlist"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span>Wishlist</span>
            </Link>
          )}

          <Link to="/cart" className="cart-link flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full font-semibold transition-colors text-sm" aria-label={`Cart${count > 0 ? `, ${count} items` : ""}`}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
            <span className="hidden sm:inline">Cart</span>{count > 0 && <span className="cart-count">{count}</span>}
          </Link>

          <ThemeToggle />

          {isAuthenticated ? (
            <UserMenu user={user} logout={logout} />
          ) : (
            <Link to="/login" aria-label="Log in" className="btn-primary header-login text-sm px-3 sm:px-4 py-1.5 rounded font-semibold inline-flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span className="header-login-label">Log in</span>
            </Link>
          )}

          <button
            type="button"
            className="mobile-menu-button md:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
          >
            <span /><span /><span />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div id="mobile-navigation" className="mobile-nav md:hidden border-t border-[var(--color-line)] bg-[var(--color-panel)] px-5 py-4 space-y-3">
          <MenuLinks
            isAuthenticated={isAuthenticated}
            isMod={isMod}
            isAdmin={isAdmin}
            isMobile={true}
            className="flex flex-col gap-2.5 text-sm font-medium"
            onNavigate={() => setMobileOpen(false)}
          />
          {!isAuthenticated && (
            <div className="pt-2 border-t border-[var(--color-line)]">
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="btn-primary w-full py-2 rounded text-sm font-semibold flex items-center justify-center gap-2"
              >
                Log in
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

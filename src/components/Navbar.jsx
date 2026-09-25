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
        className="user-menu-trigger font-[var(--font-mono)]"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <span className="user-menu-name">{user?.username}</span>
        <span className="chevron text-[10px] opacity-70" aria-hidden="true">▾</span>
      </button>

      {isOpen && (
        <div className="dropdown-menu" role="menu">
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
            <span>Settings</span>
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

function MenuLinks({ isAuthenticated, isMod, isAdmin, className = "", onNavigate, id }) {
  return (
    <nav id={id} className={className} aria-label="Primary navigation">
      <Link to="/" className="header-nav-link" onClick={onNavigate}>Catalog</Link>
      {isAuthenticated && <Link to="/orders" className="header-nav-link" onClick={onNavigate}>Orders</Link>}
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
            <Link to="/wishlist" className="wishlist-link text-sm font-medium transition-colors hidden sm:block">
              Wishlist
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
            <Link to="/login" className="btn-primary header-login text-sm px-3 sm:px-4 py-1.5 rounded font-semibold">
              Log in
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
        <MenuLinks
          id="mobile-navigation"
          isAuthenticated={isAuthenticated}
          isMod={isMod}
          isAdmin={isAdmin}
          className="mobile-nav md:hidden"
          onNavigate={() => setMobileOpen(false)}
        />
      )}
    </header>
  );
}

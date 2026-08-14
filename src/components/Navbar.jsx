import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useState, useRef, useEffect } from "react";

function Pin() {
  return <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-circuit)] mr-2 align-middle" />;
}

// Role badge only shown when staff/admin is active — uses violet accent in staff theme
function RoleBadge({ isAdmin, isMod }) {
  if (!isMod) return null;
  const label = isAdmin ? "ADMIN" : "STAFF";
  return (
    <span className="font-[var(--font-mono)] text-[10px] font-bold tracking-widest px-2 py-0.5 rounded border border-[var(--color-circuit)]/60 text-[var(--color-circuit)] bg-[var(--color-circuit)]/10 select-none">
      {label}
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
    <div className="user-menu-container ml-2" ref={menuRef}>
      <button 
        className="user-menu-trigger font-[var(--font-mono)] text-[var(--color-dark-ink)]/80 hover:text-[var(--color-dark-ink)]"
        onClick={() => setIsOpen(!isOpen)}
      >
        {user?.username} <span className="chevron text-[10px] opacity-70">▾</span>
      </button>
      
      {isOpen && (
        <div className="dropdown-menu">
          <Link to="/settings" className="dropdown-item" onClick={() => setIsOpen(false)}>
            <span className="dropdown-item-icon opacity-70">⚙</span>
            <span>Settings</span>
          </Link>
          <button 
            className="dropdown-item logout-btn"
            onClick={() => {
              setIsOpen(false);
              logout();
              navigate("/");
            }}
          >
            <span className="dropdown-item-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </span>
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { isAuthenticated, isAdmin, isMod, user, logout } = useAuth();
  const { items } = useCart();
  const navigate = useNavigate();
  const count = items.reduce((sum, i) => sum + (i.quantity || 1), 0);

  return (
    <header className="sticky top-0 z-40 bg-[var(--color-ink)] text-[var(--color-dark-ink)] border-b border-[var(--color-dark-line)] relative">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        {/* Brand (Left) */}
        <Link to="/" className="font-[var(--font-display)] font-semibold text-lg tracking-tight flex items-center gap-2 z-10">
          <span className="flex items-center">
            <Pin />
            GADGET<span className="text-[var(--color-circuit)]">/</span>STORE
          </span>
          <RoleBadge isAdmin={isAdmin} isMod={isMod} />
        </Link>

        {/* Nav links (Center) */}
        <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center text-sm font-medium z-10">
          <Link to="/" className="px-5 py-3 hover:text-[var(--color-circuit)] hover:bg-white/5 rounded-md transition-all">Catalog</Link>
          {isAuthenticated && (
            <Link to="/orders" className="px-5 py-3 hover:text-[var(--color-circuit)] hover:bg-white/5 rounded-md transition-all">Orders</Link>
          )}
          {isMod && (
            <Link
              to="/admin"
              className="px-5 py-3 font-semibold text-[var(--color-circuit)] hover:text-[var(--color-circuit-dark)] hover:bg-white/5 rounded-md transition-all"
            >
              {isAdmin ? "Admin" : "Staff"}
            </Link>
          )}
        </nav>

        {/* Right side (User Actions) */}
        <div className="flex items-center gap-4 z-10">
          {isAuthenticated && (
            <Link to="/wishlist" className="text-sm font-medium hover:text-[var(--color-circuit)] transition-colors hidden sm:block">
              Wishlist
            </Link>
          )}
          <Link
            to="/cart"
            className="flex items-center gap-2 bg-[var(--color-circuit)]/10 text-[var(--color-circuit)] px-4 py-1.5 rounded-full font-semibold hover:bg-[var(--color-circuit)]/20 transition-colors text-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            Cart {count > 0 && `(${count})`}
          </Link>

          {isAuthenticated ? (
            <UserMenu user={user} logout={logout} />
          ) : (
            <Link
              to="/login"
              className="btn-primary text-sm px-4 py-1.5 rounded font-semibold ml-2"
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

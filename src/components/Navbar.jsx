import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

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

export default function Navbar() {
  const { isAuthenticated, isAdmin, isMod, user, logout } = useAuth();
  const { items } = useCart();
  const navigate = useNavigate();
  const count = items.reduce((sum, i) => sum + (i.quantity || 1), 0);

  return (
    <header className="sticky top-0 z-40 bg-[var(--color-ink)] text-[var(--color-dark-ink)] border-b border-[var(--color-dark-line)]">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="font-[var(--font-display)] font-semibold text-lg tracking-tight flex items-center gap-2">
          <span className="flex items-center">
            <Pin />
            GADGET<span className="text-[var(--color-circuit)]">/</span>STORE
          </span>
          <RoleBadge isAdmin={isAdmin} isMod={isMod} />
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link to="/" className="hover:text-[var(--color-circuit)] transition-colors">Catalog</Link>
          {isAuthenticated && (
            <Link to="/orders" className="hover:text-[var(--color-circuit)] transition-colors">Orders</Link>
          )}
          {isMod && (
            <Link
              to="/admin"
              className="font-semibold text-[var(--color-circuit)] hover:text-[var(--color-circuit-dark)] transition-colors"
            >
              {isAdmin ? "Admin" : "Staff"}
            </Link>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <Link
            to="/cart"
            className="relative font-[var(--font-mono)] text-sm border border-[var(--color-dark-line)] rounded px-3 py-1.5 hover:border-[var(--color-circuit)] transition-colors"
          >
            CART
            {count > 0 && (
              <span className="absolute -top-2 -right-2 bg-[var(--color-circuit)] text-[var(--color-ink)] text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                {count}
              </span>
            )}
          </Link>

          {isAuthenticated ? (
            <div className="flex items-center gap-3 text-sm">
              <span className="hidden sm:inline text-[var(--color-dark-ink)]/70 font-[var(--font-mono)]">
                {user?.username}
              </span>
              <button
                onClick={() => { logout(); navigate("/"); }}
                className="text-[var(--color-dark-ink)]/70 hover:text-[var(--color-signal)] transition-colors"
              >
                Log out
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="bg-[var(--color-circuit)] text-[var(--color-ink)] font-semibold text-sm px-4 py-1.5 rounded hover:bg-[var(--color-circuit-dark)] hover:text-white transition-colors"
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

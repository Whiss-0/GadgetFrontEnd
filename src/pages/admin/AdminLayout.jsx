import { NavLink, Outlet } from "react-router-dom";

const tabs = [
  { to: "/admin", label: "Products", end: true },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/users", label: "Users" },
];

export default function AdminLayout() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-[var(--color-dark-bg)] text-[var(--color-dark-ink)]">
      <div className="max-w-6xl mx-auto px-5 py-8">
        <p className="font-[var(--font-mono)] text-xs text-[var(--color-circuit)] mb-1">ADMIN CONSOLE</p>
        <h1 className="font-[var(--font-display)] text-2xl font-semibold mb-6 admin-gradient-text">Store management</h1>

        <div className="flex gap-2 border-b border-[var(--color-dark-line)] mb-8">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `px-5 py-2 text-sm font-medium rounded-full transition-all duration-300 ${
                  isActive
                    ? "bg-[var(--color-circuit)]/15 text-[var(--color-circuit)] shadow-[0_0_15px_rgba(167,139,250,0.2)] border border-[var(--color-circuit)]/30"
                    : "text-[var(--color-dark-ink)]/60 hover:text-[var(--color-dark-ink)] hover:bg-[var(--color-dark-line)]/50 border border-transparent"
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </div>

        <Outlet />
      </div>
    </div>
  );
}

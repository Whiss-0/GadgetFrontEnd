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
        <h1 className="font-[var(--font-display)] text-2xl font-semibold mb-6">Store management</h1>

        <div className="flex gap-2 border-b border-[var(--color-dark-line)] mb-8">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  isActive
                    ? "border-[var(--color-circuit)] text-[var(--color-circuit)]"
                    : "border-transparent text-[var(--color-dark-ink)]/60 hover:text-[var(--color-dark-ink)]"
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

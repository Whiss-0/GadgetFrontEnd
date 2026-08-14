import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { productsApi, ordersApi } from "../../api/client";

const tabs = [
  { to: "/admin", label: "Products", end: true },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/users", label: "Users" },
];

export default function AdminLayout() {
  const [stats, setStats] = useState({ productCount: 0, lowStock: 0, orderCount: 0, revenue: 0 });

  useEffect(() => {
    Promise.all([productsApi.list(), ordersApi.listAllAdmin()])
      .then(([prodRes, orderRes]) => {
        const products = prodRes.data || [];
        const orders = orderRes.data || [];
        setStats({
          productCount: products.length,
          lowStock: products.filter((p) => (p.stock ?? 0) <= 5).length,
          orderCount: orders.length,
          revenue: orders.reduce((sum, o) => sum + Number(o.total_amount ?? o.totalAmount ?? 0), 0),
        });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[var(--color-dark-bg)] text-[var(--color-dark-ink)]">
      <div className="max-w-6xl mx-auto px-5 py-8">
        <p className="font-[var(--font-mono)] text-xs text-[var(--color-circuit)] mb-1">ADMIN CONSOLE</p>
        <h1 className="font-[var(--font-display)] text-2xl font-semibold mb-6 admin-gradient-text">Store management</h1>

        {/* Dashboard summary stats widget */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Products", value: stats.productCount },
            { label: "Low stock", value: stats.lowStock, warn: stats.lowStock > 0 },
            { label: "Orders", value: stats.orderCount },
            { label: "Revenue", value: `$${stats.revenue.toFixed(2)}` },
          ].map((s) => (
            <div key={s.label} className="bg-[var(--color-dark-panel)] border border-[var(--color-dark-line)] rounded p-4">
              <p className="font-[var(--font-mono)] text-xs text-[var(--color-dark-ink)]/50 uppercase mb-1">{s.label}</p>
              <p className={`text-2xl font-semibold ${s.warn ? "text-[var(--color-signal)]" : ""}`}>{s.value}</p>
            </div>
          ))}
        </div>

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

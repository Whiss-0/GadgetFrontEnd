import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { productsApi, ordersApi } from "../../api/client";

const tabs = [
  { to: "/admin", label: "Products", end: true },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/users", label: "Users" },
];

export default function AdminLayout() {
  const [stats, setStats] = useState({ productCount: 0, lowStockItems: [], orderCount: 0, revenue: 0 });
  const [showLowStock, setShowLowStock] = useState(false);

  useEffect(() => {
    Promise.all([productsApi.list(), ordersApi.listAllAdmin()])
      .then(([prodRes, orderRes]) => {
        const products = prodRes.data || [];
        const orders = orderRes.data || [];
        setStats({
          productCount: products.length,
          lowStockItems: products.filter((p) => (p.stock ?? 0) <= 5),
          orderCount: orders.length,
          revenue: orders
            .filter((o) => {
              const status = o.status ?? o.Status;
              const method = o.payment_method ?? o.paymentMethod;
              const isCancelledSimulatedPayment = status === "Cancelled" && (method === "Card" || method === "GCash");
              return !isCancelledSimulatedPayment;
            })
            .reduce((sum, o) => sum + Number(o.total_amount ?? o.totalAmount ?? 0), 0),
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
          <div className="bg-[var(--color-dark-panel)] border border-[var(--color-dark-line)] rounded p-4">
            <p className="font-[var(--font-mono)] text-xs text-[var(--color-dark-ink)]/50 uppercase mb-1">Products</p>
            <p className="text-2xl font-semibold">{stats.productCount}</p>
          </div>

          <button
            onClick={() => setShowLowStock((v) => !v)}
            className="text-left bg-[var(--color-dark-panel)] border border-[var(--color-dark-line)] rounded p-4 hover:border-[var(--color-signal)]/50 transition-colors"
          >
            <p className="font-[var(--font-mono)] text-xs text-[var(--color-dark-ink)]/50 uppercase mb-1">
              Low stock {stats.lowStockItems.length > 0 && "— click to view"}
            </p>
            <p className={`text-2xl font-semibold ${stats.lowStockItems.length > 0 ? "text-[var(--color-signal)]" : ""}`}>
              {stats.lowStockItems.length}
            </p>
          </button>

          <div className="bg-[var(--color-dark-panel)] border border-[var(--color-dark-line)] rounded p-4">
            <p className="font-[var(--font-mono)] text-xs text-[var(--color-dark-ink)]/50 uppercase mb-1">Orders</p>
            <p className="text-2xl font-semibold">{stats.orderCount}</p>
          </div>

          <div className="bg-[var(--color-dark-panel)] border border-[var(--color-dark-line)] rounded p-4">
            <p className="font-[var(--font-mono)] text-xs text-[var(--color-dark-ink)]/50 uppercase mb-1">Revenue</p>
            <p className="text-2xl font-semibold">${stats.revenue.toFixed(2)}</p>
          </div>
        </div>

        {showLowStock && stats.lowStockItems.length > 0 && (
          <div className="bg-[var(--color-dark-panel)] border border-[var(--color-signal)]/30 rounded p-4 mb-8 -mt-4">
            <p className="font-[var(--font-mono)] text-xs text-[var(--color-signal)] uppercase mb-3">Products running low</p>
            <div className="space-y-2">
              {stats.lowStockItems.map((p) => (
                <div key={p.product_id} className="flex items-center justify-between text-sm">
                  <span>{p.product_name}</span>
                  <span className={`font-[var(--font-mono)] ${p.stock === 0 ? "text-[var(--color-signal)] font-semibold" : "text-[var(--color-dark-ink)]/70"}`}>
                    {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

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

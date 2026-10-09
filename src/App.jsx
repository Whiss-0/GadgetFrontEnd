import { Suspense, lazy, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import SiteFooter from "./components/SiteFooter";
import { RequireAuth, RequireAdmin, RequireMod } from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import ToastProvider from "./components/ToastProvider";

import Home from "./pages/Home";
import ProductDetail from "./pages/ProductDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import NotFound from "./pages/NotFound";

// Everything past the storefront and auth screens loads on demand. Leaflet
// (the customer map) is imported only by the admin dashboard, so shoppers
// never download it.
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Orders = lazy(() => import("./pages/Orders"));
const Settings = lazy(() => import("./pages/Settings"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const ActivityLog = lazy(() => import("./pages/ActivityLog"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const ProductsAdmin = lazy(() => import("./pages/admin/ProductsAdmin"));
const OrdersAdmin = lazy(() => import("./pages/admin/OrdersAdmin"));
const UsersAdmin = lazy(() => import("./pages/admin/UsersAdmin"));

function RouteFallback() {
  return (
    <div className="max-w-6xl mx-auto px-5 py-9" aria-busy="true" aria-label="Loading page">
      <div className="skeleton" style={{ height: "14rem", borderRadius: "var(--radius-card, 12px)" }} />
    </div>
  );
}

export default function App() {
  const { isMod } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const titles = {
      "/": "Techstead — Shop gadgets",
      "/cart": "Techstead — Your cart",
      "/orders": "Techstead — Your orders",
      "/checkout": "Techstead — Checkout",
      "/wishlist": "Techstead — Wishlist",
      "/login": "Techstead — Sign in",
      "/register": "Techstead — Create account",
      "/forgot-password": "Techstead — Reset password",
      "/reset-password": "Techstead — Reset password",
      "/settings": "Techstead — Account Settings",
      "/activity": "Techstead — Activity Log",
    };
    if (location.pathname.startsWith("/admin")) {
      document.title = "Techstead Admin — Store overview";
    } else {
      document.title = titles[location.pathname] || "Techstead — Technology for everyday life.";
    }
  }, [location.pathname]);

  // Sync the body background with the active theme so there's no
  // colour mismatch between the <body> and the themed wrapper div.
  useEffect(() => {
    document.body.style.backgroundColor = isMod ? "#080D1A" : "";
  }, [isMod]);

  return (
    <ToastProvider>
      <div
        data-theme={isMod ? "staff" : undefined}
        className="theme-body min-h-screen"
      >
        <Navbar />
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route path="/cart" element={<RequireAuth><Cart /></RequireAuth>} />
          <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
          <Route path="/orders" element={<RequireAuth><Orders /></RequireAuth>} />
          <Route path="/wishlist" element={<RequireAuth><Wishlist /></RequireAuth>} />
          <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
          <Route path="/activity" element={<RequireAuth><ActivityLog /></RequireAuth>} />

          <Route path="/admin" element={<RequireMod><AdminLayout /></RequireMod>}>
            <Route index element={<ProductsAdmin />} />
            <Route path="orders" element={<OrdersAdmin />} />
            <Route path="users" element={<RequireAdmin><UsersAdmin /></RequireAdmin>} />
          </Route>

          {/* Catch-all 404 — must be last */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        <SiteFooter />
      </div>
    </ToastProvider>
  );
}

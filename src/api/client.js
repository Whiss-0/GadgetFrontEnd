import axios from "axios";

// Point this at your running GadgetStore API.
// Create a .env file (see .env.example) to override without editing code.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5064";

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("gs_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Token missing/expired — clear it so the UI reflects logged-out state.
      localStorage.removeItem("gs_token");
      localStorage.removeItem("gs_user");
    }
    return Promise.reject(err);
  }
);

export default client;

// ---- Auth ----
export const authApi = {
  login: (data) => client.post("/api/auth/login", data),
  verifyMfa: (data) => client.post("/api/auth/login/verify-mfa", data),
  register: (data) => client.post("/api/auth/register", data),
  forgotPassword: (data) => client.post("/api/auth/forgot-password", data),
  resetPassword: (data) => client.post("/api/auth/reset-password", data),
  me: () => client.get("/api/auth/me"),
  updateMe: (data) => client.put("/api/auth/me", data),
};

// ---- Products / Categories ----
export const productsApi = {
  list: () => client.get("/api/product"),
  get: (id) => client.get(`/api/product/${id}`),
  // Admin-only: full create / update / delete
  create: (data) => client.post("/api/product", data),
  update: (id, data) => client.put(`/api/product/${id}`, data),
  remove: (id) => client.delete(`/api/product/${id}`),
  // Staff (Moderator) + Admin: update description only
  updateDescription: (id, description) =>
    client.patch(`/api/product/${id}/description`, { Description: description }),
};

export const categoriesApi = {
  list: () => client.get("/api/categories"),
};

// ---- Cart ----
// The cart controller exposes /api/cart/my for the current user's cart.
export const cartApi = {
  list: () => client.get("/api/cart/my"),           // GET /api/cart/my
  add: (data) => client.post("/api/cart", data),    // POST /api/cart  { Product_ID, Quantity }
  updateQuantity: (id, quantity) =>
    client.put(`/api/cart/${id}`, { Quantity: quantity }),  // PUT /api/cart/{id}
  remove: (id) => client.delete(`/api/cart/${id}`), // DELETE /api/cart/{id}
  clear: () => client.delete("/api/cart/clear"),     // DELETE /api/cart/clear
};

// ---- Wishlist ----
export const wishlistApi = {
  list: () => client.get("/api/wishlist"),
  add: (data) => client.post("/api/wishlist", data),
  remove: (id) => client.delete(`/api/wishlist/${id}`),
};

// ---- Orders ----
// /api/order (bare GET) requires AdminAccess. Users must use /api/order/my.
export const ordersApi = {
  myOrders: () => client.get("/api/order/my"),         // GET /api/order/my  (user's own orders)
  get: (id) => client.get(`/api/order/${id}`),
  create: (data) => client.post("/api/order", data),   // POST /api/order  { TotalAmount }
  listAllAdmin: () => client.get("/api/order"),         // GET /api/order   (admin only)
  updateStatus: (id, status) =>
    client.put(`/api/order/${id}`, { Status: status }), // PUT /api/order/{id}  (mod+)
};

// ---- Order Details ----
export const orderDetailApi = {
  create: (data) => client.post("/api/orderdetail", data), // POST /api/orderdetail
  getByOrder: (orderId) => client.get(`/api/orderdetail/order/${orderId}`),
};

// ---- Reviews ----
export const reviewsApi = {
  listForProduct: (productId) => client.get(`/api/review/product/${productId}`),
  create: (data) => client.post("/api/review", data),
};

// ---- Admin: Users ----
// UserController returns UserResponse { User_ID, Name, Email, Address, Role_ID }
export const usersApi = {
  list: () => client.get("/api/user"),
  get: (id) => client.get(`/api/user/${id}`),
  // PUT /api/user/{id} with { Role_ID } — no dedicated /role sub-route exists
  updateRole: (id, roleId) => client.put(`/api/user/${id}`, { Role_ID: roleId }),
};

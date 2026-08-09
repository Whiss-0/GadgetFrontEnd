# GadgetStore Frontend

A React frontend for the GadgetStore API — catalog, cart, orders, and an admin console.

## Setup

```bash
npm install
cp .env.example .env   # then edit VITE_API_BASE_URL if your API isn't on localhost:5064
npm run dev
```

Opens at `http://localhost:5173`.

**Important:** your backend's CORS config needs to allow `http://localhost:5173` as an origin, or the browser will block every request even with a valid token.

## Design

- **Palette:** cool paper background, near-black ink text, PCB-solder-mask green as the primary accent, connector-gold for prices, signal-red for alerts/errors. The admin console switches to a dark terminal-style theme.
- **Type:** Space Grotesk for headings, IBM Plex Sans for body text, IBM Plex Mono for SKUs/prices/order codes — a technical, spec-sheet feel that fits an electronics store.
- **Signature element:** the "spec ticket" product card — a perforated tear-line card with a monospace SKU tag, echoed in cart line items and order codes (`PO-00001`, `PART-0004`) throughout the app.

## Structure

```
src/
  api/client.js        — axios instance + all API calls (edit endpoint paths here if yours differ)
  context/              — AuthContext (JWT/login state), CartContext (server-backed cart)
  components/           — Navbar, ProductCard, route guards
  pages/                — Home, ProductDetail, Login, Register, Forgot/Reset Password, Cart, Orders
  pages/admin/           — Products, Orders, Users management (admin-only)
```

## Notes / things to double check against your actual API

- `src/api/client.js` assumes REST paths like `/api/product`, `/api/cart`, `/api/order`, `/api/user/{id}/role` — adjust these to match your controllers exactly (check casing, e.g. `/api/Product` vs `/api/product`).
- `AuthContext.jsx` decodes the JWT to read role/username claims. If your token's claim names differ from the ASP.NET Core defaults, adjust `decodeUser()`.
- `RequireAdmin` checks for a role claim of `"Admin"` or `"1"` — match this to however your backend actually encodes roles in the token.
- The admin "list all orders" call hits `/api/order/all` — if you haven't built that endpoint yet, add it (admin-only, matching the `AdminAccess` policy pattern from your other controllers).

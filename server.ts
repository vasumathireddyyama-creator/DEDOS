import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import { Product, Order, RealTimeEvent } from "./src/types";
import Stripe from "stripe";

// Lazy loading stripe to prevent crash on startup if API key is missing
let stripeClient: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not configured");
    }
    stripeClient = new Stripe(key, {
      apiVersion: "2025-01-27.acme" as any,
    });
  }
  return stripeClient;
}

export const app = express();
const PORT = 3000;

// Body parsing middleware
app.use(express.json());

// Path to persist data in memory + file backup
const DATA_FILE = path.join(process.cwd(), "data.json");

// Initial mock products
const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "prod_keyboard",
    name: "Nomad Beechwood Keyboard",
    description: "Sleek mechanical keyboard with custom brown switches and hand-finished sustainable beechwood casing.",
    price: 14900, // $149.00
    image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?q=80&w=600&auto=format&fit=crop",
    stock: 12,
    maxStock: 25,
    category: "Workspace"
  },
  {
    id: "prod_headphones",
    name: "Studio AcoustixANC Headphones",
    description: "High-fidelity studio headphones featuring hybrid active noise cancellation and 40-hour battery life.",
    price: 29900, // $299.00
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop",
    stock: 7,
    maxStock: 15,
    category: "Audio"
  },
  {
    id: "prod_deskpad",
    name: "Slate Merino Wool Desk Mat",
    description: "Ultra-thick, raw Australian merino wool desk pad with naturally water-repellent backing.",
    price: 5900, // $59.00
    image: "https://images.unsplash.com/photo-1616440347437-b1c73406efc2?q=80&w=600&auto=format&fit=crop",
    stock: 20,
    maxStock: 30,
    category: "Workspace"
  },
  {
    id: "prod_journal",
    name: "Full-Grain Leather Journal",
    description: "Artisan-bound notebook featuring hand-stitched grain leather cover and 240 pages of fountain-pen friendly paper.",
    price: 3500, // $35.00
    image: "https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=600&auto=format&fit=crop",
    stock: 15,
    maxStock: 25,
    category: "Accessories"
  },
  {
    id: "prod_lamp",
    name: "Aero Brass Table Lamp",
    description: "Precision-machined architectural desk lamp featuring an orbital rotating arm and soft-diffused warm LED.",
    price: 18900, // $189.00
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=600&auto=format&fit=crop",
    stock: 4,
    maxStock: 10,
    category: "Lighting"
  }
];

let products: Product[] = [];
let orders: Order[] = [];

// Load data helper
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
      products = parsed.products || DEFAULT_PRODUCTS;
      orders = parsed.orders || [];
    } else {
      products = DEFAULT_PRODUCTS;
      orders = [];
      saveData();
    }
  } catch (err) {
    console.error("Error loading data file:", err);
    products = DEFAULT_PRODUCTS;
    orders = [];
  }
}

// Save data helper
function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ products, orders }, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving to data file:", err);
  }
}

// Load initial data
loadData();

// Client connection tracking for Server-Sent Events (SSE)
let sseClients: any[] = [];

// Helper to broadcast inventory or order updates to all connected clients in real-time
function broadcastEvent(event: RealTimeEvent) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.write(payload);
    } catch (e) {
      console.error("Failed to broadcast to SSE client:", e);
    }
  });
}

// Heartbeat to keep SSE connections open (sent every 15 seconds)
setInterval(() => {
  sseClients.forEach((client) => {
    try {
      client.write(": ping\n\n");
    } catch (_) {}
  });
}, 15000);

// --- API ROUTES ---

// Express logs
app.use((req, res, next) => {
  console.log(`[Express] ${req.method} ${req.url}`);
  next();
});

// GET /api/stripe-config: check if secret key is present
app.get("/api/stripe-config", (req, res) => {
  res.json({
    hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
    hasAppUrl: !!process.env.APP_URL,
    appUrl: process.env.APP_URL || "http://localhost:3000",
  });
});

// GET /api/products
app.get("/api/products", (req, res) => {
  res.json(products);
});

// GET /api/orders
app.get("/api/orders", (req, res) => {
  res.json(orders);
});

// GET /api/events - Server-Sent Events for real-time inventory updates
app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  // Send initial connected statement
  res.write(": connected\n\n");

  sseClients.push(res);

  req.on("close", () => {
    sseClients = sseClients.filter((client) => client !== res);
  });
});

// PATCH /api/admin/inventory - directly modify product stocks
app.patch("/api/admin/inventory", (req, res) => {
  const { productId, currentStock } = req.body;

  if (typeof productId !== "string" || typeof currentStock !== "number") {
     res.status(400).json({ error: "Invalid parameters" });
     return;
  }

  const pIndex = products.findIndex((p) => p.id === productId);
  if (pIndex === -1) {
     res.status(404).json({ error: "Product not found" });
     return;
  }

  const finalStock = Math.max(0, currentStock);
  products[pIndex].stock = finalStock;
  saveData();

  // Broadcast high-priority inventory update to all connected viewers in real-time!
  broadcastEvent({
    type: "INVENTORY_UPDATE",
    data: { productId, stock: finalStock },
  });

  res.json({ success: true, product: products[pIndex] });
});

// POST /api/checkout/simulated - sandbox bypass fallback for immediate demonstration
app.post("/api/checkout/simulated", (req, res) => {
  const { items, customerEmail } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0 || !customerEmail) {
     res.status(400).json({ error: "Missing checkout parameters" });
     return;
  }

  // Validate and reserve stock
  const orderItems: any[] = [];
  let totalAmount = 0;

  // Let's verify every item's inventory first
  for (const requested of items) {
    const product = products.find((p) => p.id === requested.productId);
    if (!product) {
       res.status(404).json({ error: `Product ${requested.productId} not found` });
       return;
    }
    if (product.stock < requested.quantity) {
       res.status(400).json({ error: `Not enough stock remaining for ${product.name}` });
       return;
    }

    orderItems.push({
      productId: product.id,
      name: product.name,
      quantity: requested.quantity,
      priceAtPurchase: product.price,
    });
    totalAmount += product.price * requested.quantity;
  }

  // Deduct inventory
  for (const requested of items) {
    const pIndex = products.findIndex((p) => p.id === requested.productId);
    products[pIndex].stock -= requested.quantity;

    // Broadcast instant real-time inventory deduction!
    broadcastEvent({
      type: "INVENTORY_UPDATE",
      data: { productId: products[pIndex].id, stock: products[pIndex].stock },
    });
  }

  // Create & save Simulated order
  const newOrder: Order = {
    id: `sim_order_${Math.random().toString(36).substring(2, 11)}`,
    items: orderItems,
    totalAmount,
    status: "Paid",
    customerEmail,
    paymentMethod: "simulated",
    createdAt: new Date().toISOString(),
  };

  orders.unshift(newOrder);
  saveData();

  // Broadcast order created event to listening devices
  broadcastEvent({
    type: "ORDER_CREATED",
    data: newOrder,
  });

  res.json({ success: true, order: newOrder });
});

// POST /api/checkout/stripe - standard production Stripe session endpoint
app.post("/api/checkout/stripe", async (req, res) => {
  const { items, customerEmail } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0 || !customerEmail) {
     res.status(400).json({ error: "Missing checkout parameters" });
     return;
  }

  // Validate items & stock availability
  for (const requested of items) {
    const product = products.find((p) => p.id === requested.productId);
    if (!product) {
       res.status(404).json({ error: `Product ${requested.productId} not found` });
       return;
    }
    if (product.stock < requested.quantity) {
       res.status(400).json({ error: `Insufficient stock remaining for ${product.name}` });
       return;
    }
  }

  try {
    const stripe = getStripe();
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;

    // Create a unique placeholder "Pending" order in memory to await payment success
    const orderId = `str_order_${Math.random().toString(36).substring(2, 11)}`;
    const orderItems = items.map((requested) => {
      const product = products.find((p) => p.id === requested.productId)!;
      return {
        productId: product.id,
        name: product.name,
        quantity: requested.quantity,
        priceAtPurchase: product.price,
      };
    });
    
    const totalAmount = orderItems.reduce((acc, current) => acc + (current.priceAtPurchase * current.quantity), 0);

    const pendingOrder: Order = {
      id: orderId,
      items: orderItems,
      totalAmount,
      status: "Pending",
      customerEmail,
      paymentMethod: "stripe",
      createdAt: new Date().toISOString(),
    };

    orders.unshift(pendingOrder);
    saveData();

    // Line items for Stripe Checkout
    const lineItems = items.map((requested) => {
      const product = products.find((p) => p.id === requested.productId)!;
      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: product.name,
            description: product.description,
            // Ensure valid images
            images: [product.image],
          },
          unit_amount: product.price,
        },
        quantity: requested.quantity,
      };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      customer_email: customerEmail,
      success_url: `${appUrl}/checkout-result?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
      cancel_url: `${appUrl}/checkout-result?session_id=none&order_id=${orderId}&cancel=true`,
      metadata: {
        orderId: orderId,
      },
    });

    // Update index with session id
    const oIdx = orders.findIndex((o) => o.id === orderId);
    if (oIdx !== -1) {
      orders[oIdx].stripeSessionId = session.id;
      saveData();
    }

    res.json({ success: true, checkoutUrl: session.url, sessionId: session.id });
  } catch (err: any) {
    console.error("Stripe SDK Error:", err.message);
    res.status(500).json({
      error: "STRIPE_ERROR",
      message: err.message,
    });
  }
});

// GET /api/orders/verify - handles instant redirect verification of stripe-based success
app.get("/api/orders/verify", async (req, res) => {
  const { session_id, order_id } = req.query;

  if (!session_id || !order_id || typeof session_id !== "string" || typeof order_id !== "string") {
     res.status(400).json({ error: "Missing required parameters" });
     return;
  }

  const oIdx = orders.findIndex((o) => o.id === order_id);
  if (oIdx === -1) {
     res.status(404).json({ error: "Order not found" });
     return;
  }

  const order = orders[oIdx];

  // If already processed, short-circuit
  if (order.status === "Paid") {
     res.json({ success: true, order });
     return;
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === "paid") {
      // Transition status
      orders[oIdx].status = "Paid";
      
      // Deduct final stocks (only if wasn't deducted yet, done here at checkout completion secure check!)
      for (const item of order.items) {
        const pIndex = products.findIndex((p) => p.id === item.productId);
        if (pIndex !== -1) {
          products[pIndex].stock = Math.max(0, products[pIndex].stock - item.quantity);
          
          // Broadcast fast inventory change
          broadcastEvent({
            type: "INVENTORY_UPDATE",
            data: { productId: products[pIndex].id, stock: products[pIndex].stock },
          });
        }
      }

      saveData();

      // Trigger SSE update for order
      broadcastEvent({
        type: "ORDER_UPDATED",
        data: { orderId: order.id, status: "Paid" },
      });

      res.json({ success: true, order: orders[oIdx] });
    } else {
      res.status(400).json({ error: "Stripe payment not completed" });
    }
  } catch (err: any) {
    console.error("Stripe verify error:", err.message);
    res.status(500).json({ error: "Verification failed", message: err.message });
  }
});

// STACK VERIFICATION HOOK (Stripe Webhook supporting standard secure event receipt)
app.post("/api/stripe-webhook", express.raw({ type: "application/json" }), (req, res) => {
  const stripe = getStripe();
  const signature = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    } else {
      // Fallback for visual verification if signature verifying isn't configured in test environment
      event = req.body;
    }
  } catch (err: any) {
    console.warn(`Webhook signature verification failed: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle successful checkout payments from Stripe Webhook!
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;

    if (orderId) {
      const oIdx = orders.findIndex((o) => o.id === orderId);
      if (oIdx !== -1 && orders[oIdx].status !== "Paid") {
        orders[oIdx].status = "Paid";

        // Deduct inventory
        for (const item of orders[oIdx].items) {
          const pIndex = products.findIndex((p) => p.id === item.productId);
          if (pIndex !== -1) {
            products[pIndex].stock = Math.max(0, products[pIndex].stock - item.quantity);
            broadcastEvent({
              type: "INVENTORY_UPDATE",
              data: { productId: products[pIndex].id, stock: products[pIndex].stock },
            });
          }
        }

        saveData();

        broadcastEvent({
          type: "ORDER_UPDATED",
          data: { orderId, status: "Paid" },
        });

        console.log(`[Express Webhook] Processed payment successfully for Order ${orderId}`);
      }
    }
  }

  res.json({ received: true });
});

// App diagnostics / mock reset
app.post("/api/admin/reset", (req, res) => {
  products = DEFAULT_PRODUCTS.map(p => ({ ...p }));
  orders = [];
  saveData();

  // Send updates to clean state
  products.forEach((p) => {
    broadcastEvent({
      type: "INVENTORY_UPDATE",
      data: { productId: p.id, stock: p.stock },
    });
  });

  res.json({ success: true, products });
});


// --- INTEGRATE VITE FOR SPA ROUTING ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    // Mount Vite dev server middleware
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    // Serve static frontend assets
    app.use(express.static(distPath));

    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Express] Server running in ${process.env.NODE_ENV || "development"} mode at http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;

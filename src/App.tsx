import { useEffect, useState, useRef } from "react";
import { Product, Order, RealTimeEvent } from "./types";
import Navbar from "./components/Navbar";
import ProductCard from "./components/ProductCard";
import CartDrawer, { CartItem } from "./components/CartDrawer";
import AdminPanel from "./components/AdminPanel";
import OrderHistory from "./components/OrderHistory";
import CheckoutResult from "./components/CheckoutResult";
import StripeSetupGuide from "./components/StripeSetupGuide";
import { Sparkles, ShoppingBag, Radio, RefreshCw, X, Terminal } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import TrafficMonitor, { TrafficLog } from "./components/TrafficMonitor";
import { safeFetch } from "./utils/safeFetch";

export default function App() {
  // Navigation & Page State
  const [currentPage, setCurrentPage] = useState<"shop" | "admin" | "orders">("shop");
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Stripe Redirection Route Interceptors
  const [checkoutSessionId, setCheckoutSessionId] = useState("");
  const [checkoutOrderId, setCheckoutOrderId] = useState("");
  const [checkoutIsCancel, setCheckoutIsCancel] = useState(false);

  // App Core state
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Filtering & Category selection
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Notifications/Toasts System
  const [toasts, setToasts] = useState<{ id: string; message: string; type: "info" | "success" | "warning" }[]>([]);

  // Traffic Logs System
  const [trafficLogs, setTrafficLogs] = useState<TrafficLog[]>([]);
  const [isSseConnected, setIsSseConnected] = useState(false);
  const wasSseConnectedRef = useRef(false);

  const addTrafficLog = (entry: Omit<TrafficLog, "id" | "timestamp">) => {
    const d = new Date();
    const cleanTime = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}.${String(d.getMilliseconds()).padStart(3, "0")}`;
    const id = Math.random().toString(36).substring(2, 9);
    setTrafficLogs((prev) => {
      const updated = [...prev, { id, timestamp: cleanTime, ...entry } as TrafficLog];
      if (updated.length > 100) {
        return updated.slice(updated.length - 100);
      }
      return updated;
    });
  };

  const addToast = (message: string, type: "info" | "success" | "warning" = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Listen for custom fetch events dispatched by safeFetch to log backend queries
  useEffect(() => {
    const handleLogEvent = (e: Event) => {
      const detail = (e as any).detail;
      if (detail) {
        addTrafficLog(detail);
      }
    };
    const handleRefreshEvent = () => {
      refreshProductsAndOrders();
    };
    window.addEventListener("stk-traffic-log", handleLogEvent);
    window.addEventListener("stk-refresh-data", handleRefreshEvent);
    return () => {
      window.removeEventListener("stk-traffic-log", handleLogEvent);
      window.removeEventListener("stk-refresh-data", handleRefreshEvent);
    };
  }, []);

  // Intercepting Stripe URL callback on boot
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const sessionId = query.get("session_id");
    const orderId = query.get("order_id");
    const cancel = query.get("cancel");

    if (sessionId && orderId) {
      setCheckoutSessionId(sessionId);
      setCheckoutOrderId(orderId);
      setCheckoutIsCancel(!!cancel);
    } else if (cancel && orderId) {
      setCheckoutOrderId(orderId);
      setCheckoutIsCancel(true);
    }
  }, []);

  // Fetch initial products and orders
  const refreshProductsAndOrders = async () => {
    try {
      const [prodRes, ordRes] = await Promise.all([
        safeFetch("/api/products"),
        safeFetch("/api/orders"),
      ]);
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData);
      }
      if (ordRes.ok) {
        const ordData = await ordRes.json();
        setOrders(ordData);
      }
    } catch (err) {
      console.error("Failed to sync store records:", err);
    }
  };

  useEffect(() => {
    refreshProductsAndOrders();
  }, []);

  // --- REAL-TIME SERVER-SENT EVENTS (SSE) LISTENER ---
  useEffect(() => {
    const eventSource = new EventSource("/api/events");

    eventSource.onopen = () => {
      console.log("[SSE] Connected to real-time e-commerce update stream");
      setIsSseConnected(true);
      if (!wasSseConnectedRef.current) {
        wasSseConnectedRef.current = true;
        addTrafficLog({
          type: "INBOUND",
          source: "SSE-BROADCAST",
          method: "SSE_INIT",
          endpoint: "/api/events",
          status: "Active",
          message: "Established stateful real-time SSE stream loop over high-velocity HTTP pathway",
          payload: '": connected"',
        });
      }
    };

    eventSource.onerror = (err) => {
      console.error("[SSE] Connection error. Reconnecting...", err);
      setIsSseConnected(false);
      if (wasSseConnectedRef.current) {
        wasSseConnectedRef.current = false;
        addTrafficLog({
          type: "SYSTEM",
          source: "SSE-BROADCAST",
          method: "SSE_ERROR",
          endpoint: "/api/events",
          status: "Dropped",
          message: "SSE connection disrupted. Server is restarting or client went idle. Retrying link...",
          payload: '""',
        });
      }
    };

    // Listen for custom real-time events broadcasted from the Express server!
    eventSource.onmessage = (event) => {
      try {
        const rawData = JSON.parse(event.data) as RealTimeEvent;
        
        addTrafficLog({
          type: "INBOUND",
          source: "SSE-BROADCAST",
          method: "BROADCAST",
          endpoint: "/api/events",
          status: rawData.type,
          payload: event.data,
          message: `Inbound stream notification caught: Syncing local application memory boards for ${rawData.type}.`,
        });

        if (rawData.type === "INVENTORY_UPDATE") {
          const { productId, stock } = rawData.data;
          
          setProducts((prevProducts) =>
            prevProducts.map((p) => {
              if (p.id === productId) {
                // If the stock level changed in the backend, notify the user!
                if (p.stock !== stock) {
                  addToast(
                     `⚡ Real-time Stock Sync: '${p.name}' inventory is now ${stock}`,
                     stock <= 3 ? "warning" : "info"
                  );
                }
                return { ...p, stock };
              }
              return p;
            })
          );
        } else if (rawData.type === "ORDER_CREATED") {
          const newOrder = rawData.data;
          setOrders((prev) => [newOrder, ...prev]);
          addToast(`📦 System: New order placed by ${newOrder.customerEmail}!`, "success");
        } else if (rawData.type === "ORDER_UPDATED") {
          const { orderId, status } = rawData.data;
          setOrders((prev) =>
            prev.map((o) => (o.id === orderId ? { ...o, status } : o))
          );
        }
      } catch (err) {
        // Heartbeats/pings will fail JSON.parse and gracefully falls here.
        addTrafficLog({
          type: "INBOUND",
          source: "SSE-BROADCAST",
          method: "PING",
          endpoint: "/api/events",
          status: "HEARTBEAT",
          payload: '": ping"',
          message: "Keepalive heartbeat ping received over stateful stream to protect channel lifecycle",
        });
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Fallback Polling for Vercel/Stateless Serverless Environments (runs when SSE is offline/disconnected)
  useEffect(() => {
    if (isSseConnected) return;

    // Start quick periodic check to sync orders and inventory
    const interval = setInterval(() => {
      refreshProductsAndOrders();
    }, 7000);

    return () => clearInterval(interval);
  }, [isSseConnected]);

  const handleGenerateMockTraffic = () => {
    const mockEvents = [
      {
        type: "OUTBOUND",
        source: "HTTP-CLIENT",
        method: "POST",
        endpoint: "/api/checkout/simulated",
        status: "PENDING",
        payload: '{"items":[{"productId":"prod_keyboard","quantity":1}],"customerEmail":"test_traffic@google.com"}',
        message: "Dispatched automated booking payload loop testing checkout pipelines.",
      },
      {
        type: "INBOUND",
        source: "SSE-BROADCAST",
        method: "BROADCAST",
        endpoint: "/api/events",
        status: "INVENTORY_UPDATE",
        payload: '{"type":"INVENTORY_UPDATE","data":{"productId":"prod_keyboard","stock":11}}',
        message: "SSE client sync: 'Nomad Beechwood Keyboard' stock decremented over SSE stream",
      },
      {
        type: "INBOUND",
        source: "SSE-BROADCAST",
        method: "BROADCAST",
        endpoint: "/api/events",
        status: "ORDER_CREATED",
        payload: '{"type":"ORDER_CREATED","data":{"id":"sim_order_trffc99","customerEmail":"test_traffic@google.com","totalAmount":14900,"status":"Paid"}}',
        message: "SSE stream received: Registered order frame matching loaded simulation test block",
      },
      {
        type: "SYSTEM",
        source: "LOCAL-DATABASE",
        method: "SYNC",
        endpoint: "system://storage",
        status: "SUCCESS",
        payload: '{"productId":"prod_keyboard","stock":11}',
        message: "RAM database synchronization complete: allocated storage units to local memory caches",
      },
    ] as const;

    addToast("🔥 Generating load test... Monitor live traffic stream!", "info");
    
    // Stagger logs to look realistic!
    mockEvents.forEach((evt, index) => {
      setTimeout(() => {
        addTrafficLog({
          type: evt.type,
          source: evt.source,
          method: evt.method,
          endpoint: evt.endpoint,
          status: evt.status,
          payload: evt.payload,
          message: evt.message,
        });
      }, index * 450);
    });
  };

  // --- CART MANAGEMENT ---
  const handleAddToCart = (product: Product) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.productId === product.id);
      
      // Calculate max available stock
      const liveProduct = products.find((p) => p.id === product.id);
      const limit = liveProduct ? liveProduct.stock : product.stock;

      if (existing) {
        if (existing.quantity >= limit) {
          addToast(`Cannot add more. Restrained. Limit reached for '${product.name}'`, "warning");
          return prevCart;
        }
        addToast(`Bumped '${product.name}' quantity in cart`, "info");

        addTrafficLog({
          type: "SYSTEM",
          source: "LOCAL-DATABASE",
          method: "QTY_BUMP",
          endpoint: `cart://item/${product.id}`,
          status: "Success",
          payload: JSON.stringify({ productId: product.id, prevQty: existing.quantity, nextQty: existing.quantity + 1 }),
          message: `In-memory allocation: increased request pool quantity for '${product.name}'`,
        });

        return prevCart.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      addToast(`Added '${product.name}' to cart`, "success");

      addTrafficLog({
        type: "SYSTEM",
        source: "LOCAL-DATABASE",
        method: "ADD_ITEM",
        endpoint: `cart://item/${product.id}`,
        status: "Success",
        payload: JSON.stringify({ product }),
        message: `In-memory allocation: queued '${product.name}' for booking checkout selection.`,
      });

      return [
        ...prevCart,
        {
          productId: product.id,
          name: product.name,
          quantity: 1,
          price: product.price,
          image: product.image,
          currentAvailableStock: limit,
        },
      ];
    });
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    addTrafficLog({
      type: "SYSTEM",
      source: "LOCAL-DATABASE",
      method: "QTY_SET",
      endpoint: `cart://item/${productId}`,
      status: "Success",
      payload: JSON.stringify({ productId, targetQty: quantity }),
      message: "Modified quantity units on active checkout item registry memory.",
    });

    setCart((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, quantity } : item))
    );
  };

  const handleRemoveCartItem = (productId: string) => {
    const item = cart.find((c) => c.productId === productId);
    if (item) {
      addToast(`Removed '${item.name}' from your cart`, "info");

      addTrafficLog({
        type: "SYSTEM",
        source: "LOCAL-DATABASE",
        method: "REMOVE_ITEM",
        endpoint: `cart://item/${productId}`,
        status: "Success",
        payload: JSON.stringify({ item }),
        message: `Deallocated item '${item.name}' from memory selections.`,
      });
    }
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const handleCheckoutSuccess = (newOrder: Order) => {
    // Clear cart
    setCart([]);
    addToast("🎉 Smart Simulation: Mock purchase processed successfully!", "success");
    setOrders((prev) => [newOrder, ...prev]);
    setCurrentPage("orders");
  };

  const handleClearParamsAndRedirect = () => {
    // Clear url query tags on browser history so they do not keep triggering the verified overlay
    window.history.replaceState({}, document.title, window.location.pathname);
    setCheckoutSessionId("");
    setCheckoutOrderId("");
    setCheckoutIsCancel(false);
    
    // Sync catalog
    refreshProductsAndOrders();
    setCurrentPage("orders");
  };

  // Filter products by category
  const categories = ["All", ...Array.from(new Set(products.map((p) => p.category)))];
  const filteredProducts =
    selectedCategory === "All"
      ? products
      : products.filter((p) => p.category === selectedCategory);

  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 font-sans flex flex-col antialiased">
      <Navbar
        cartCount={cartCount}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAdmin={() => setCurrentPage("admin")}
        onOpenOrders={() => setCurrentPage("orders")}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />

      {/* Main Container Stage */}
      <main className="flex-1 pb-16">
        {/* If redirected from Stripe Checkout, show checkout result instead of catalogs! */}
        {checkoutSessionId || checkoutIsCancel ? (
          <CheckoutResult
            sessionId={checkoutSessionId}
            orderId={checkoutOrderId}
            isCancel={checkoutIsCancel}
            onClearParamsAndRedirect={handleClearParamsAndRedirect}
          />
        ) : currentPage === "admin" ? (
          <AdminPanel products={products} onRefreshProducts={refreshProductsAndOrders} />
        ) : currentPage === "orders" ? (
          <OrderHistory orders={orders} />
        ) : (
          /* Shop view */
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* Hero Section */}
            <div className="relative rounded-2xl bg-slate-900 overflow-hidden py-12 px-6 sm:px-12 text-white shadow-xl border border-slate-950">
              <div className="relative z-10 max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3.5 py-1 text-[10px] font-bold font-mono uppercase tracking-wider text-indigo-300 border border-slate-700">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  Real-time Synchronization Active
                </div>
                <h1 className="text-3xl font-extrabold sm:text-4xl tracking-tight uppercase font-sans">
                  Workspace & Audio Essentials
                </h1>
                <p className="text-xs text-slate-300 leading-relaxed max-w-xl font-medium">
                  Curated premium accessories that elevate your productivity and focus. Hand-crafted, sustainably sourced, and fully integrated with secure Stripe transactional checkout.
                </p>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      const trigger = document.getElementById("stripe-setup-doc");
                      trigger?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="rounded-lg bg-white hover:bg-slate-50 text-slate-905 font-bold px-4 py-2 text-xs tracking-tight transition-all cursor-pointer shadow-sm"
                  >
                    Stripe API Integration Guide
                  </button>
                </div>
              </div>
              
              {/* Back ambient shapes */}
              <div className="absolute right-0 bottom-0 top-0 opacity-10 w-1/2 pointer-events-none hidden md:block">
                <div className="h-full w-full bg-radial from-white to-transparent transform translate-x-12 translate-y-12" />
              </div>
            </div>

            {/* Category Filter bar */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-lg px-4 py-1.5 text-xs font-bold tracking-tight transition-all cursor-pointer uppercase ${
                      selectedCategory === cat
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono hidden sm:block">
                Showing {filteredProducts.length} Premium Products
              </div>
            </div>

            {/* Product catalog grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Stripe Setup Guide Card at the bottom */}
            <div id="stripe-setup-doc" className="pt-12 border-t border-slate-200">
              <StripeSetupGuide />
            </div>
          </div>
        )}
      </main>

      {/* Cart Slider Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onCheckoutSuccess={handleCheckoutSuccess}
        products={products}
      />

      {/* Real-Time Live Traffic Terminal */}
      <TrafficMonitor
        logs={trafficLogs}
        onClearLogs={() => {
          setTrafficLogs([]);
          addTrafficLog({
            type: "SYSTEM",
            source: "LOCAL-DATABASE",
            method: "CLEAR",
            endpoint: "client://terminal",
            status: "Flushed",
            message: "Local console log buffer cleared by systems operator.",
            payload: '""',
          });
        }}
        onGenerateMockTraffic={handleGenerateMockTraffic}
        isConnected={isSseConnected}
        products={products}
      />

      {/* Real-time Notifications Floating Stack */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              layout
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={`pointer-events-auto p-4 rounded-xl shadow-xl border text-xs leading-relaxed flex items-center justify-between gap-3 ${
                toast.type === "success"
                  ? "bg-slate-900 border-slate-950 text-emerald-300"
                  : toast.type === "warning"
                  ? "bg-orange-50 border-orange-100 text-orange-850"
                  : "bg-slate-900 border-slate-950 text-indigo-300"
              }`}
            >
              <span className="font-medium">{toast.message}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setToasts((prev) => prev.filter((t) => t.id !== toast.id));
                }}
                className="text-slate-400 hover:text-white p-0.5 cursor-pointer rounded"
                title="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Minimal Footer */}
      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono">
          <span>REAL-TIME INVENTORY MANAGEMENT ENGINE</span>
          <span>SECURED TRANSITS POWERED BY STRIPE INTENT</span>
        </div>
      </footer>
    </div>
  );
}

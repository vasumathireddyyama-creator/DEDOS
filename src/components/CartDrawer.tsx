import { motion, AnimatePresence } from "motion/react";
import { X, Plus, Minus, Trash2, CreditCard, Sparkles, Loader2, Info } from "lucide-react";
import { Product } from "../types";
import { useState, useEffect } from "react";
import { safeFetch } from "../utils/safeFetch";

export interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  image: string;
  currentAvailableStock: number; // For real-time clamping!
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckoutSuccess: (order: any) => void;
  products: Product[]; // Passed to live check stock in real-time
}

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onCheckoutSuccess,
  products,
}: CartDrawerProps) {
  const [customerEmail, setCustomerEmail] = useState("");
  const [isStripeConfigured, setIsStripeConfigured] = useState<boolean | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [emailError, setEmailError] = useState("");

  // Check if Stripe API Keys are available on server
  useEffect(() => {
    safeFetch("/api/stripe-config")
      .then((res) => res.json())
      .then((data) => {
        setIsStripeConfigured(data.hasSecretKey);
      })
      .catch((err) => {
        console.error("Failed to read stripe configuration:", err);
        setIsStripeConfigured(false);
      });
  }, [isOpen]);

  // Real-time stock clamping validation
  // If actual stock is updated in real-time on server, let's keep cart quantities bounded!
  useEffect(() => {
    cartItems.forEach((item) => {
      const liveProduct = products.find((p) => p.id === item.productId);
      if (liveProduct) {
        if (liveProduct.stock < item.quantity) {
          if (liveProduct.stock === 0) {
            onRemoveItem(item.productId);
          } else {
            onUpdateQuantity(item.productId, liveProduct.stock);
          }
        }
      }
    });
  }, [products, cartItems]);

  const totalCents = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const validateEmail = () => {
    if (!customerEmail) {
      setEmailError("Email address is required");
      return false;
    }
    const match = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail);
    if (!match) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleCheckoutSimulated = async () => {
    setErrorText("");
    if (!validateEmail()) return;

    setIsCheckingOut(true);
    try {
      const response = await safeFetch("/api/checkout/simulated", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          customerEmail,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Simulated checkout failed");
      }

      onCheckoutSuccess(result.order);
      onClose();
    } catch (err: any) {
      setErrorText(err.message);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleCheckoutStripe = async () => {
    setErrorText("");
    if (!validateEmail()) return;

    setIsCheckingOut(true);
    try {
      const response = await safeFetch("/api/checkout/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          customerEmail,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        if (result.error === "STRIPE_ERROR") {
          throw new Error(`Stripe Error: ${result.message}`);
        }
        throw new Error(result.error || "Checkout Session creation failed");
      }

      if (result.checkoutUrl) {
         // Open Stripe checkout page
         window.location.href = result.checkoutUrl;
      }
    } catch (err: any) {
      console.error("Stripe initiation error:", err);
      setErrorText(err.message || "Could not spin up Stripe checkout session.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Sliding Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl border-l border-slate-250"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <div>
                <h2 className="text-sm font-bold tracking-tight text-slate-800 uppercase font-sans">
                  Shopping Cart
                </h2>
                <span className="text-[10px] text-slate-400 font-mono font-medium">
                  {cartItems.length} unique {cartItems.length === 1 ? "item" : "items"}
                </span>
              </div>
              <button
                onClick={onClose}
                className="group p-1.5 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Cart Elements */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cartItems.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center text-center">
                  <div className="rounded-full bg-slate-50 p-4 mb-3 text-slate-300">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-200 hidden" />
                    <span className="text-2xl">📦</span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-tight">Your Cart is Empty</h3>
                  <p className="text-xs text-slate-450 max-w-[200px] mt-1">
                    Select dynamic products from the shop to view real-time calculations.
                  </p>
                </div>
              ) : (
                cartItems.map((item) => {
                  const product = products.find((p) => p.id === item.productId);
                  const availableLimit = product ? product.stock : 99;

                  return (
                    <motion.div
                      layout
                      key={item.productId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      className="flex items-center gap-3 rounded-lg border border-slate-200 p-2.5 bg-white transition-shadow hover:shadow-sm"
                    >
                      <img
                        referrerPolicy="no-referrer"
                        src={item.image}
                        alt={item.name}
                        className="h-14 w-14 rounded-lg object-cover bg-slate-50 border border-slate-200 shrink-0"
                      />

                      <div className="flex-1 min-w-0">
                        <h4 className="truncate text-xs font-bold text-slate-800 tracking-tight leading-snug">
                          {item.name}
                        </h4>
                        <span className="text-[10px] font-mono font-medium text-slate-400 block mt-0.5">
                          {formatPrice(item.price)} each
                        </span>

                        {/* Adjust qty triggers */}
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50">
                            <button
                              onClick={() => {
                                if (item.quantity > 1) {
                                  onUpdateQuantity(item.productId, item.quantity - 1);
                                } else {
                                  onRemoveItem(item.productId);
                                }
                              }}
                              className="px-2 py-1 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="px-1 text-xs font-mono font-bold text-slate-800 text-center w-6 select-none">
                              {item.quantity}
                            </span>
                            <button
                              disabled={item.quantity >= availableLimit}
                              onClick={() => {
                                onUpdateQuantity(item.productId, item.quantity + 1);
                              }}
                              className={`px-2 py-1 transition-colors cursor-pointer ${
                                item.quantity >= availableLimit
                                  ? "text-slate-200 cursor-not-allowed"
                                  : "text-slate-400 hover:text-slate-800"
                              }`}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          
                          {/* Live Alert if reaching stock boundaries */}
                          {item.quantity >= availableLimit && (
                            <span className="text-[9px] font-mono text-orange-600 font-bold uppercase tracking-wider">
                              Full Limit
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end justify-between self-stretch shrink-0 pl-1">
                        <span className="font-mono text-xs font-bold text-slate-800">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                        <button
                          onClick={() => onRemoveItem(item.productId)}
                          className="p-1 text-slate-300 hover:text-rose-500 rounded-full hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Checkouts Block (only show when items present) */}
            {cartItems.length > 0 && (
              <div className="border-t border-slate-200 p-4 bg-slate-50">
                {/* Total breakdowns */}
                <div className="flex items-center justify-between text-sm font-bold text-slate-800 px-1 mb-4 uppercase tracking-tight">
                  <span>Estimated Total</span>
                  <span className="font-mono">{formatPrice(totalCents)}</span>
                </div>

                {/* Email Registration Form */}
                <div className="mb-4">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Customer Account Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. customer@example.com"
                    value={customerEmail}
                    onChange={(e) => {
                      setCustomerEmail(e.target.value);
                      setEmailError("");
                    }}
                    className={`w-full rounded-lg border py-2 px-3 text-xs shadow-inner bg-white outline-none transition-all ${
                      emailError
                        ? "border-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                        : "border-slate-300 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-650"
                    }`}
                  />
                  {emailError && (
                    <span className="text-[10px] font-mono text-rose-600 mt-1 block font-medium">
                      {emailError}
                    </span>
                  )}
                </div>

                {/* Display Stripe secret notification */}
                {isStripeConfigured === false && (
                  <div className="mb-4 rounded-xl bg-orange-50 border border-orange-100 p-4 text-xs text-orange-850">
                    <div className="flex gap-2.5">
                      <Info className="h-4.5 w-4.5 text-orange-500 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold text-[11px] leading-tight text-orange-900 uppercase tracking-tight">
                          Stripe API Key Not Configured
                        </p>
                        <p className="text-[10px] text-orange-700 leading-normal font-medium">
                          Stripe checkout can be initiated after configuring <strong>STRIPE_SECRET_KEY</strong> in the Secrets panel. Use Simulation mode below to test live stock broadcast flows!
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* API Logs or dynamic errors */}
                {errorText && (
                  <div className="mb-3 rounded-xl bg-rose-50 border border-rose-100 p-3 text-[10px] font-mono text-rose-600 whitespace-pre-wrap leading-relaxed">
                    <strong>Error:</strong> {errorText}
                  </div>
                )}

                <div className="space-y-2">
                  {/* Stripe Button */}
                  <button
                    disabled={isCheckingOut}
                    onClick={handleCheckoutStripe}
                    className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 px-4 text-xs font-bold tracking-tight transition-all active:scale-95 cursor-pointer h-10 ${
                      isCheckingOut
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                        : "bg-[#635BFF] text-white hover:bg-[#5b53e8] hover:shadow-md border border-[#524be3]"
                    }`}
                  >
                    {isCheckingOut ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    ) : (
                      <CreditCard className="h-3.5 w-3.5" />
                    )}
                    {isCheckingOut ? "Processing..." : "Pay Securely with Stripe"}
                  </button>

                  {/* Sandbox Simulated button */}
                  <button
                    disabled={isCheckingOut}
                    onClick={handleCheckoutSimulated}
                    className={`w-full flex items-center justify-center gap-2 rounded-lg py-2 px-4 text-xs font-bold tracking-tight transition-all active:scale-95 border border-slate-350 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer h-10`}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-indigo-500 animate-pulse" />
                    Instant Sandbox Payment (Test Play)
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

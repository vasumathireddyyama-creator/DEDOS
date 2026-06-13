import { useEffect, useState } from "react";
import { Order } from "../types";
import { CheckCircle2, AlertTriangle, ArrowRight, Loader2, FileCheck } from "lucide-react";
import { motion } from "motion/react";
import { safeFetch } from "../utils/safeFetch";

interface CheckoutResultProps {
  sessionId: string;
  orderId: string;
  isCancel: boolean;
  onClearParamsAndRedirect: () => void;
}

export default function CheckoutResult({
  sessionId,
  orderId,
  isCancel,
  onClearParamsAndRedirect,
}: CheckoutResultProps) {
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [errorText, setErrorText] = useState("");

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  useEffect(() => {
    if (isCancel || sessionId === "none") {
      setLoading(false);
      return;
    }

    // Call server to verify the payment session status with Stripe securely!
    safeFetch(`/api/orders/verify?session_id=${sessionId}&order_id=${orderId}`)
      .then((res) => {
        if (!res.ok) {
          return res.json().then((errData) => {
            throw new Error(errData.message || "Failed to verify payment with Stripe server");
          });
        }
        return res.json();
      })
      .then((data) => {
        if (data.success) {
          setOrder(data.order);
        } else {
          throw new Error("Could not verify order status.");
        }
      })
      .catch((err: any) => {
        console.error("Order verification error:", err);
        setErrorText(err.message || "An issue occurred while validating checkout status.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [sessionId, orderId, isCancel]);

  if (loading) {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center text-center p-8">
        <Loader2 className="h-10 w-10 animate-spin text-slate-800 mb-4" />
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Verifying Secure Payment</h3>
        <p className="text-xs text-slate-550 max-w-[280px] mt-1 leading-relaxed font-mono">
          Contacting Stripe gateways to confirm your payment with the server...
        </p>
      </div>
    );
  }

  if (isCancel) {
    return (
      <div className="max-w-md mx-auto my-12 px-4">
        <div className="rounded-xl border border-slate-205 bg-white p-6 shadow-sm text-center">
          <div className="rounded-full bg-orange-50 h-11 w-11 flex items-center justify-center text-orange-500 mx-auto mb-4 border border-orange-100">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Checkout Cancelled</h3>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Payment session was closed or terminated by user. Your shopping cart remains safe. No charges were made.
          </p>
          <button
            onClick={onClearParamsAndRedirect}
            className="mt-6 w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900 border border-slate-950 text-white hover:bg-slate-800 py-2.5 px-4 text-xs font-bold tracking-tight transition-all active:scale-95 cursor-pointer"
          >
            Return to Store
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (errorText) {
    return (
      <div className="max-w-lg mx-auto my-12 px-4">
        <div className="rounded-xl border border-rose-100 bg-white p-6 shadow-sm">
          <div className="rounded-full bg-rose-50 h-11 w-11 flex items-center justify-center text-rose-500 mx-auto mb-4 border border-rose-100">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight text-center">Verification Problem</h3>
          <p className="text-xs text-slate-500 mt-2 text-center leading-relaxed">
            We encountered a problem authenticating this purchase. If you used a test credit card, make sure your local test keys are configured properly.
          </p>
          <div className="rounded-xl bg-rose-50/50 border border-rose-100 p-3 mt-4 text-[10px] font-mono text-rose-700 leading-relaxed whitespace-pre-wrap">
            <strong>Diagnostic error details:</strong> {errorText}
          </div>
          <button
            onClick={onClearParamsAndRedirect}
            className="mt-6 w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900 border border-slate-950 text-white hover:bg-slate-800 py-2.5 px-4 text-xs font-bold tracking-tight transition-all active:scale-95 cursor-pointer"
          >
            Continue Shopping
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto my-12 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-md"
      >
        {/* Success badge */}
        <div className="text-center mb-6">
          <div className="rounded-full bg-emerald-50 h-11 w-11 flex items-center justify-center text-emerald-500 mx-auto mb-3 border border-emerald-100 animate-bounce">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-805 uppercase tracking-tight">Payment Succeeded!</h3>
          <p className="text-xs text-slate-400 font-mono mt-0.5 uppercase tracking-wider font-semibold">
            Invoice ID: {orderId}
          </p>
        </div>

        {/* Invoice fields */}
        {order && (
          <div className="space-y-4 animate-fade-in">
            <div className="border border-slate-150 py-3 text-xs space-y-1 bg-slate-50 rounded-lg p-3">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Receipt Email:</span>
                <span className="font-bold text-slate-800">{order.customerEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Method:</span>
                <span className="font-mono text-xs text-indigo-700 uppercase font-bold">
                  {order.paymentMethod === "stripe" ? "Stripe Checkout" : "Simulated"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Registration Date:</span>
                <span className="text-slate-600 font-medium">
                  {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString()}
                </span>
              </div>
            </div>

            {/* Items display */}
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 font-mono">
                Purchased Commodities
              </span>
              <div className="space-y-2.5 border-b border-slate-205 pb-4">
                {order.items.map((item) => (
                  <div key={item.productId} className="flex justify-between text-xs py-1">
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-slate-800 block leading-tight">{item.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">Qty: {item.quantity}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-800 pl-3">
                      {formatPrice(item.priceAtPurchase * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Grand value */}
            <div className="flex justify-between items-center pt-2 mb-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-widest">Paid Grand Total</span>
              <span className="text-lg font-bold text-slate-905 font-mono">
                {formatPrice(order.totalAmount)}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={onClearParamsAndRedirect}
          className="mt-8 w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-650 hover:bg-indigo-700 border border-indigo-700 text-white py-3 px-4 text-xs font-bold tracking-tight transition-all active:scale-95 cursor-pointer shadow-sm"
        >
          Return to Store & Continue Shopping
          <ArrowRight className="h-4 w-4" />
        </button>
      </motion.div>
    </div>
  );
}

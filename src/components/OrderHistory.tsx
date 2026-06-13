import { Order } from "../types";
import { ShoppingBag, Calendar, Mail, FileCheck, HelpCircle } from "lucide-react";

interface OrderHistoryProps {
  orders: Order[];
}

export default function OrderHistory({ orders }: OrderHistoryProps) {
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const formatDate = (isoStr: string) => {
    return new Date(isoStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8 pb-5 border-b border-slate-200">
        <h2 className="text-xl font-bold font-sans tracking-tight text-slate-800 sm:text-2xl uppercase">
          Dynamic Transaction Log
        </h2>
        <p className="mt-1 text-xs text-slate-500 leading-normal">
          Log of customer orders placed in real-time. Transactions completed via simulated checkout sandbox or verified Stripe API are listed below with full metadata.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center bg-white">
          <div className="rounded-full bg-slate-50 h-12 w-12 flex items-center justify-center text-slate-400 mx-auto mb-4 border border-slate-100">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-tight">No Transactions Logged</h3>
          <p className="mt-1 text-xs text-slate-450 max-w-[300px] mx-auto leading-relaxed">
            There are currently no transactions logged. Open your cart and initiate checkout using sandbox tools or real-time Stripe integration.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const isStripe = order.paymentMethod === "stripe";

            return (
              <div
                key={order.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-300"
              >
                {/* Header card area */}
                <div className="border-b border-slate-200 bg-slate-50/50 px-4 py-3 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono font-bold text-slate-800 uppercase">
                        Order Code: {order.id}
                      </span>
                      {isStripe ? (
                        <span className="inline-flex items-center gap-1 rounded bg-[#e3e0ff] text-[#4d3ef5] px-2 py-0.5 text-[9px] font-bold font-mono uppercase tracking-wider">
                          Stripe LIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-50 text-amber-700 px-2 py-0.5 text-[9px] font-bold font-mono border border-amber-100 uppercase tracking-wider">
                          Sandbox Test
                        </span>
                      )}
                      
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-[9px] font-bold font-mono border uppercase tracking-wider ${
                        order.status === "Paid"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                          : order.status === "Pending"
                          ? "bg-slate-100 text-slate-600 border-slate-200"
                          : "bg-indigo-50 text-indigo-700 border-indigo-100"
                      }`}>
                        {order.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono font-medium">
                      <Calendar className="h-3 w-3" />
                      {formatDate(order.createdAt)}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-left sm:text-right">
                      <span className="block text-[10px] text-slate-400 uppercase tracking-wider leading-none">Total Payment</span>
                      <span className="text-sm font-bold tracking-tight text-slate-800 font-mono">
                        {formatPrice(order.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Body Content listing purchased products */}
                <div className="px-4 py-4 sm:px-6">
                  {/* Email address */}
                  <div className="flex items-center gap-2 mb-4 text-xs text-slate-600 border-b border-slate-100 pb-3">
                    <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>Customer Email: <strong className="text-slate-800 font-semibold">{order.customerEmail}</strong></span>
                  </div>

                  <div className="space-y-4">
                    {order.items.map((item) => (
                      <div key={item.productId} className="flex items-center justify-between text-xs border-b border-dashed border-slate-100 pb-3 last:border-0 last:pb-0">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-800 block leading-tight">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono font-medium block">
                            STK_ID: {item.productId}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-slate-500 block">
                            {item.quantity} × {formatPrice(item.priceAtPurchase)}
                          </span>
                          <span className="font-mono font-bold text-slate-800 block">
                            {formatPrice(item.priceAtPurchase * item.quantity)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Stripe unique session trace (if exists) */}
                  {order.stripeSessionId && (
                    <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] font-mono text-slate-400 truncate">
                      Stripe Session: {order.stripeSessionId}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { Product } from "../types";
import { Plus, Minus, RotateCcw, AlertTriangle, Check, Loader2, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { safeFetch } from "../utils/safeFetch";
interface AdminPanelProps {
  products: Product[];
  onRefreshProducts: () => void;
}
export default function AdminPanel({ products, onRefreshProducts }: AdminPanelProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  // Format price helper
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };
  const handleStockChange = async (productId: string, currentStock: number) => {
    setUpdatingId(productId);
    try {
      const response = await safeFetch("/api/admin/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, currentStock }),
      });
      if (!response.ok) {
        throw new Error("Failed to patch stock level");
      }
      setSuccessId(productId);
      setTimeout(() => setSuccessId(null), 1500);
      onRefreshProducts();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };
  const handleResetDefaults = async () => {
    if (!window.confirm("Are you sure you want to restore default items and wipe out order logs? This will reset all stock levels.")) return;
    
    setIsResetting(true);
    try {
      const response = await safeFetch("/api/admin/reset", {
        method: "POST",
      });
      if (response.ok) {
        onRefreshProducts();
      }
    } catch (err) {
      console.error("Failed to reset database default records:", err);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Page header */}
      <div className="md:flex md:items-center md:justify-between mb-8 pb-5 border-b border-slate-200">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold font-sans tracking-tight text-slate-800 sm:text-2xl uppercase">
            STK_OPERATOR Control Console
          </h2>
          <p className="mt-1 text-xs text-slate-500 leading-normal">
            Directly modify product counts to observe real-time screen synchronizations. Open multiple windows or tabs side-by-side to witness instant changes.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2">
          <button
            disabled={isResetting}
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 py-2 px-4 text-xs font-semibold tracking-tight transition-all active:scale-95 cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
          >
            {isResetting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
            )}
            Restore Default Values & Reset Logs
          </button>
        </div>
      </div>

      {/* Info Warning banner explaining SSE real-time */}
      <div className="mb-8 rounded-xl bg-slate-50 border border-slate-200 p-5">
        <div className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold leading-none text-slate-800 uppercase tracking-wide">
              How to Observe Real-Time Mechanics
            </h4>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed max-w-3xl">
              Our system runs a native <strong>Server-Sent Events (SSE) live pipeline</strong>. When you increment or decrement stock levels in this dashboard, the server broadcasts the changes to all connected visitors instantly. Any user on your checkout screens or shop page will see the exact stock widgets and buying permissions update in less than 50 milliseconds without performing manually loaded page refreshes.
            </p>
          </div>
        </div>
      </div>

      {/* Products Admin List */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="py-3 px-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                  Product Details
                </th>
                <th scope="col" className="py-3 px-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono select-none">
                  Category & Unit Price
                </th>
                <th scope="col" className="py-3 px-4 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                  Inventory Level
                </th>
                <th scope="col" className="py-3 px-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {products.map((product) => {
                const isUpdating = updatingId === product.id;
                const isSuccess = successId === product.id;

                return (
                  <tr key={product.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Item title */}
                    <td className="whitespace-nowrap py-4 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          referrerPolicy="no-referrer"
                          src={product.image}
                          alt={product.name}
                          className="h-12 w-12 rounded-lg object-cover bg-slate-50 border border-slate-150"
                        />
                        <div className="min-w-0">
                          <span className="block text-xs font-bold text-slate-800 tracking-tight">
                            {product.name}
                          </span>
                          <span className="block text-[10px] text-slate-400 font-mono font-medium">
                            STK_ID: {product.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Category & pricing */}
                    <td className="whitespace-nowrap py-4 px-4">
                      <div className="text-xs">
                        <span className="inline-block rounded bg-indigo-50 text-indigo-700 px-2.5 py-0.5 text-[9px] font-bold tracking-wider mb-1 font-mono uppercase">
                          {product.category}
                        </span>
                        <div className="font-mono font-semibold text-slate-700">
                          {formatPrice(product.price)}
                        </div>
                      </div>
                    </td>

                    {/* Stock Display Counter */}
                    <td className="whitespace-nowrap py-4 px-4 text-center">
                      <div className="inline-flex flex-col items-center justify-center">
                        <span className={`block font-mono text-sm font-bold ${
                          product.stock === 0
                            ? "text-rose-600"
                            : product.stock <= 3
                            ? "text-orange-500"
                            : "text-slate-800"
                        }`}>
                          {product.stock}
                        </span>
                        <div className="h-1.5 w-20 bg-slate-100 rounded-full mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              product.stock === 0 ? "bg-rose-400" : product.stock <= 3 ? "bg-orange-400" : "bg-indigo-600"
                            }`}
                            style={{ width: `${Math.min(100, (product.stock / product.maxStock) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-slate-400 mt-0.5 font-mono">
                          Capacity: {product.maxStock}
                        </span>
                      </div>
                    </td>

                    {/* Quick Inventory Controls */}
                    <td className="whitespace-nowrap py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Status Feedback Indicators */}
                        {isSuccess && (
                          <span className="inline-flex h-6 items-center gap-1 text-[10px] font-bold font-mono text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 rounded-full uppercase tracking-wider animate-pulse">
                            <Check className="h-3 w-3 shrink-0" /> Broadcast
                          </span>
                        )}

                        <div className="inline-flex border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden">
                          <button
                            disabled={product.stock <= 0 || isUpdating}
                            onClick={() => handleStockChange(product.id, product.stock - 1)}
                            className="bg-slate-50 px-2.5 py-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 active:bg-slate-100 transition-colors disabled:opacity-30 cursor-pointer border-r border-slate-250"
                            title="Decrement stock"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          
                          <span className="w-10 text-center font-mono text-xs font-bold py-1.5 leading-none self-center select-none text-slate-700">
                            {product.stock}
                          </span>

                          <button
                            disabled={product.stock >= product.maxStock || isUpdating}
                            onClick={() => handleStockChange(product.id, product.stock + 1)}
                            className="bg-slate-50 px-2.5 py-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 active:bg-slate-100 transition-colors disabled:opacity-30 cursor-pointer border-l border-slate-250"
                            title="Increment stock"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

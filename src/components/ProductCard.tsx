import { motion } from "motion/react";
import { Product } from "../types";
import { ShoppingCart } from "lucide-react";

interface ProductCardProps {
  key?: string;
  product: Product;
  onAddToCart: (product: Product) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const isOutOfStock = product.stock <= 0;
  
  // Format price helper (e.g. 14900 -> $149.00)
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  // Determine inventory badge design
  const getInventoryStatus = () => {
    if (product.stock === 0) {
      return {
        label: "Out of Stock",
        barColor: "bg-slate-200",
        textColor: "text-slate-400",
        badge: "bg-rose-50 text-rose-700 border-rose-100",
      };
    }
    if (product.stock <= 3) {
      return {
        label: `Low Stock: Only ${product.stock} left`,
        barColor: "bg-orange-500",
        textColor: "text-orange-600 font-semibold",
        badge: "bg-orange-50 text-orange-700 border-orange-150 animate-pulse",
      };
    }
    if (product.stock <= 7) {
      return {
        label: `Selling Fast: ${product.stock} left`,
        barColor: "bg-amber-500",
        textColor: "text-amber-600",
        badge: "bg-amber-50 text-amber-700 border-amber-100",
      };
    }
    return {
      label: `${product.stock} items available`,
      barColor: "bg-indigo-600",
      textColor: "text-slate-500",
      badge: "bg-emerald-50 text-emerald-700 border-emerald-100",
    };
  };

  const status = getInventoryStatus();
  const stockPercentage = Math.min(100, (product.stock / product.maxStock) * 100);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-300"
    >
      {/* Category & Badge Overlay */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
        <span className="rounded-md bg-slate-900/85 px-2 py-0.5 text-[9px] font-bold tracking-wider text-white backdrop-blur-[2px] uppercase">
          {product.category}
        </span>
        <span className={`rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${status.badge}`}>
          {product.stock === 0 ? "Sold Out" : `${product.stock} left`}
        </span>
      </div>

      {/* Product Image Stage */}
      <div className="relative aspect-square w-full overflow-hidden bg-slate-50">
        <motion.img
          referrerPolicy="no-referrer"
          src={product.image}
          alt={product.name}
          initial={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.4 }}
          className="h-full w-full object-cover object-center"
        />
        {/* Shadow Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Details Container */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-sans text-sm font-semibold text-slate-800 tracking-tight leading-snug group-hover:text-indigo-650 transition-colors">
            {product.name}
          </h3>
          <span className="font-mono text-sm font-bold text-slate-900 shrink-0">
            {formatPrice(product.price)}
          </span>
        </div>

        <p className="line-clamp-2 text-xs text-slate-500 leading-relaxed mb-4 flex-1">
          {product.description}
        </p>

        {/* Real-Time Stock Status Area */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center justify-between text-[10px]">
            <span className={`font-mono text-[9px] font-bold uppercase tracking-wide ${status.textColor}`}>{status.label}</span>
            <span className="font-mono text-slate-400">Max: {product.maxStock}</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              layout
              initial={{ width: 0 }}
              animate={{ width: `${stockPercentage}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={`h-full rounded-full ${status.barColor}`}
            />
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={() => !isOutOfStock && onAddToCart(product)}
          disabled={isOutOfStock}
          className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 px-4 text-xs font-bold tracking-tight transition-all active:scale-95 cursor-pointer ${
            isOutOfStock
              ? "bg-slate-100 text-slate-405 border border-slate-200 cursor-not-allowed"
              : "bg-slate-900 border border-slate-950 text-white hover:bg-indigo-600 hover:border-indigo-700 shadow-sm shadow-slate-900/10"
          }`}
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          {isOutOfStock ? "Sold Out" : "Add to Cart"}
        </button>
      </div>
    </motion.div>
  );
}

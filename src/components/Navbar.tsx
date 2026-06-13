import { ShoppingCart, Heart, ShieldAlert, SlidersHorizontal, History } from "lucide-react";

interface NavbarProps {
  cartCount: number;
  onOpenCart: () => void;
  onOpenAdmin: () => void;
  onOpenOrders: () => void;
  currentPage: "shop" | "admin" | "orders";
  setCurrentPage: (page: "shop" | "admin" | "orders") => void;
}

export default function Navbar({
  cartCount,
  onOpenCart,
  onOpenAdmin,
  onOpenOrders,
  currentPage,
  setCurrentPage,
}: NavbarProps) {
  return (
    <nav className="border-b border-slate-200 bg-white/90 sticky top-0 z-40 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => setCurrentPage("shop")}
              className="group flex items-center gap-2.5 cursor-pointer text-left"
            >
              <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center transition-transform group-hover:scale-105">
                <div className="w-4 h-4 border-2 border-white rounded-sm"></div>
              </div>
              <div className="text-left">
                <span className="block text-sm font-bold tracking-tight text-slate-800 uppercase font-sans">
                  Real-Time Shop
                </span>
                <span className="block text-[10px] font-mono text-indigo-600 uppercase tracking-widest leading-none font-bold">
                  STK_OPERATOR
                </span>
              </div>
            </button>

            {/* Main Navigation Links */}
            <div className="hidden sm:flex items-center gap-1.5 pl-4 border-l border-slate-200">
              <button
                onClick={() => setCurrentPage("shop")}
                className={`px-3-5 py-1.5 rounded-lg text-xs font-semibold tracking-tight cursor-pointer transition-all ${
                  currentPage === "shop"
                    ? "bg-slate-100 text-indigo-700"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                Shop Store
              </button>
              <button
                onClick={() => setCurrentPage("orders")}
                className={`px-3-5 py-1.5 rounded-lg text-xs font-semibold tracking-tight cursor-pointer transition-all ${
                  currentPage === "orders"
                    ? "bg-slate-100 text-indigo-700"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5" />
                  Order Log
                </div>
              </button>
              <button
                onClick={() => setCurrentPage("admin")}
                className={`px-3-5 py-1.5 rounded-lg text-xs font-semibold tracking-tight cursor-pointer transition-all ${
                  currentPage === "admin"
                    ? "bg-slate-100 text-indigo-700"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Inventory Console
                </div>
              </button>
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-4">
            {/* Live Indicator Pillar */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[10px] font-semibold tracking-wide uppercase select-none">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              LIVE SYNC ACTIVE
            </div>

            {/* Mobile Navigation icons */}
            <button
              onClick={() => setCurrentPage("orders")}
              className={`sm:hidden p-2 text-slate-500 hover:text-slate-950 transition-colors rounded-full ${
                currentPage === "orders" ? "bg-slate-100 text-indigo-650" : ""
              }`}
              title="Order Log"
            >
              <History className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCurrentPage("admin")}
              className={`sm:hidden p-2 text-slate-500 hover:text-slate-950 transition-colors rounded-full ${
                currentPage === "admin" ? "bg-slate-100 text-indigo-650" : ""
              }`}
              title="Inventory Console"
            >
              <SlidersHorizontal className="h-5 w-5" />
            </button>

            {/* Shopping Cart button */}
            <button
              id="cart-trigger"
              onClick={onOpenCart}
              className="group relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 active:scale-95 cursor-pointer"
            >
              <ShoppingCart className="h-4 w-4" />
              {cartCount > 0 ? (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-pulse">
                  {cartCount}
                </span>
              ): null}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

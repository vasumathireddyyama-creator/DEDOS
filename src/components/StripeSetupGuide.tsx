import { ShieldCheck, Server, AlertCircle, KeyRound, ExternalLink } from "lucide-react";

export default function StripeSetupGuide() {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col md:flex-row items-start gap-5">
        <div className="rounded-xl bg-slate-900 text-white p-3.5 shrink-0 border border-slate-950">
          <KeyRound className="h-6 w-6 text-indigo-400" />
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight font-sans">
              Stripe Infrastructure Guide
            </h3>
            <p className="mt-1 text-xs text-slate-550 leading-normal max-w-2xl font-medium">
              This application deploys a dual-routing pipeline supporting both **verified production-ready Stripe card payments** and **instant test sandbox simulations**. Follow the steps below to connect your personal Stripe test account:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-mono font-bold text-slate-650">
                1
              </span>
              <h4 className="text-xs font-bold text-slate-805 uppercase tracking-tight">Retrieve Secret Key</h4>
              <p className="text-[11px] text-slate-500 leading-normal font-medium">
                Sign in to your{" "}
                <a
                  href="https://dashboard.stripe.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-650 font-bold hover:underline inline-flex items-center gap-0.5"
                >
                  Stripe Dashboard <ExternalLink className="h-2.5 w-2.5" />
                </a>{" "}
                and navigate to <strong>Developers &gt; API Keys</strong>. Copy your <strong>Secret key</strong> (it starts with <code className="bg-slate-50 px-1 py-0.5 rounded font-mono font-bold text-indigo-600">sk_test_...</code> for sandboxing/testing).
              </p>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-mono font-bold text-slate-655">
                2
              </span>
              <h4 className="text-xs font-bold text-slate-805 uppercase tracking-tight">Configure Secrets</h4>
              <p className="text-[11px] text-slate-500 leading-normal font-medium">
                Click on the <strong>Secrets API Keys</strong> panel in your Google AI Studio toolbar. Add a new variable called <code className="bg-slate-50 px-1 py-0.5 rounded font-mono font-bold text-indigo-600">STRIPE_SECRET_KEY</code> and paste your Stripe key into the input. All secret variables are kept secured client-side!
              </p>
            </div>
          </div>

          {/* Fallback description */}
          <div className="flex items-start gap-2.5 bg-white/70 rounded-lg p-3 text-[11px] border border-slate-150">
            <ShieldCheck className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
            <span className="text-slate-500 leading-relaxed font-semibold">
              <strong>Need immediate tests?</strong> No credentials or setups are required to verify the e-commerce purchase cycle! Simply click "Instant Sandbox Payment" in your cart panel to complete a mock transaction, deduct stock levels, and watch the entire inventory console update instantly across devices and windows.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

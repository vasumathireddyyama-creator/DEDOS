import { useState, useEffect, useRef } from "react";
import { 
  Terminal, 
  Wifi, 
  WifiOff, 
  Activity, 
  Trash2, 
  Copy, 
  Check, 
  Maximize2, 
  Minimize2, 
  ChevronDown, 
  ChevronUp, 
  Send, 
  Database, 
  Cpu, 
  Flame, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface TrafficLog {
  id: string;
  timestamp: string;
  type: "INBOUND" | "OUTBOUND" | "SYSTEM";
  source: "SSE-BROADCAST" | "HTTP-CLIENT" | "STRIPE-API" | "LOCAL-DATABASE";
  method: string;
  endpoint: string;
  status: string | number;
  payload: string;
  latency?: number;
  message: string;
}

interface TrafficMonitorProps {
  logs: TrafficLog[];
  onClearLogs: () => void;
  onGenerateMockTraffic: () => void;
  isConnected: boolean;
}

export default function TrafficMonitor({
  logs,
  onClearLogs,
  onGenerateMockTraffic,
  isConnected
}: TrafficMonitorProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<"ALL" | "SSE" | "HTTP" | "SYSTEM">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [viewingPayloadId, setViewingPayloadId] = useState<string | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to latest logs
  useEffect(() => {
    if (autoScroll && logsEndRef.current && isOpen && !isMinimized) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isOpen, isMinimized, autoScroll]);

  // Copy logs helper
  const handleCopyLog = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter logs based on selection
  const filteredLogs = logs.filter((log) => {
    // 1. Tab category filter
    if (selectedFilter === "SSE" && log.source !== "SSE-BROADCAST") return false;
    if (selectedFilter === "HTTP" && log.source !== "HTTP-CLIENT" && log.source !== "STRIPE-API") return false;
    if (selectedFilter === "SYSTEM" && log.type !== "SYSTEM") return false;

    // 2. Search query filter
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      return (
        log.message.toLowerCase().includes(q) ||
        log.endpoint.toLowerCase().includes(q) ||
        log.payload.toLowerCase().includes(q) ||
        log.method.toLowerCase().includes(q) ||
        log.source.toLowerCase().includes(q)
      );
    }

    return true;
  });

  // Calculate stats
  const totalInbound = logs.filter((l) => l.type === "INBOUND").length;
  const totalOutbound = logs.filter((l) => l.type === "OUTBOUND").length;
  const averageLatency = (() => {
    const lats = logs.filter((l) => l.latency !== undefined).map((l) => l.latency!);
    if (lats.length === 0) return 0;
    return Math.round(lats.reduce((a, b) => a + b, 0) / lats.length);
  })();

  // Trigger copying of all logs in JSON format
  const handleExportAll = () => {
    const rawText = JSON.stringify(logs, null, 2);
    navigator.clipboard.writeText(rawText);
    alert("Exported all console traffic logs to your clipboard!");
  };

  // Group event points for SVG mini timeline (shows visual spikes)
  const recentSeconds = 20;
  const timelineData = Array.from({ length: recentSeconds }).map((_, idx) => {
    const targetSecond = new Date(Date.now() - (recentSeconds - 1 - idx) * 1000);
    const count = logs.filter((log) => {
      const logTime = new Date();
      const parts = log.timestamp.split(":");
      if (parts.length >= 3) {
        logTime.setHours(parseInt(parts[0]));
        logTime.setMinutes(parseInt(parts[1]));
        logTime.setSeconds(parseInt(parts[2]));
      }
      return Math.abs(logTime.getTime() - targetSecond.getTime()) < 1000;
    }).length;
    return count;
  });

  const maxVal = Math.max(...timelineData, 4);

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 left-6 z-40">
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className="flex items-center gap-2 px-4 py-3 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-white rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all text-xs font-bold uppercase tracking-wider cursor-pointer"
        >
          <div className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? "bg-emerald-400" : "bg-rose-400"}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? "bg-emerald-500" : "bg-rose-500"}`}></span>
          </div>
          <Terminal className="h-4 w-4 text-indigo-400 animate-pulse" />
          <span>📡 STK Traffic Logs ({logs.length})</span>
        </button>
      </div>
    );
  }

  return (
    <div 
      className={`fixed left-4 bottom-4 z-50 rounded-2xl border bg-slate-950 text-slate-200 shadow-2xl transition-all duration-300 w-[calc(100vw-32px)] md:w-[480px] overflow-hidden ${
        isMinimized ? "h-14" : "h-[450px]"
      } border-indigo-500/30 flex flex-col`}
    >
      {/* Title / Header Bar */}
      <div className="flex h-14 items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800 select-none shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
            <Terminal className="h-4 w-4 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-widest font-mono uppercase text-indigo-300">
                STK_OPERATOR Feed
              </span>
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <span className="hidden sm:inline-block text-[10px] font-mono text-slate-500">
              Live Network & Broadcast Telemetry
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Heartbeat Badge */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[9px] font-mono font-semibold">
            <Wifi className={`h-3 w-3 ${isConnected ? "text-emerald-400 animate-pulse" : "text-rose-400"}`} />
            <span className="text-slate-400 max-w-[45px] truncate">
              {isConnected ? "ACTIVE" : "OFFLINE"}
            </span>
          </div>

          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            title={isMinimized ? "Maximize Panel" : "Minimize Panel"}
          >
            {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-rose-950 hover:text-rose-400 rounded-lg text-slate-400 transition-colors cursor-pointer text-[10px] font-bold"
            title="Close Terminal"
          >
            <Check className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Terminal Area */}
      <AnimatePresence>
        {!isMinimized && (
          <div className="flex-1 flex flex-col min-h-0 bg-slate-950 font-mono text-[11px]">
            {/* Real-time stats section */}
            <div className="grid grid-cols-4 border-b border-slate-800 text-center text-slate-400 bg-slate-900/30 shrink-0 divide-x divide-slate-900">
              <div className="py-2 flex flex-col justify-center">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 leading-none">Inbound</span>
                <span className="text-xs font-bold font-mono text-slate-300 mt-0.5 flex items-center justify-center gap-0.5 leading-none">
                  <ArrowDownLeft className="h-3 w-3 text-emerald-400" /> {totalInbound}
                </span>
              </div>
              <div className="py-2 flex flex-col justify-center">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 leading-none">Outbound</span>
                <span className="text-xs font-bold font-mono text-slate-300 mt-0.5 flex items-center justify-center gap-0.5 leading-none">
                  <ArrowUpRight className="h-3 w-3 text-indigo-400" /> {totalOutbound}
                </span>
              </div>
              <div className="py-2 flex flex-col justify-center">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 leading-none">Avg Latency</span>
                <span className="text-xs font-bold font-mono text-slate-300 mt-0.5 flex items-center justify-center gap-0.5 leading-none">
                  <Activity className="h-3 w-3 text-amber-400" /> {averageLatency}ms
                </span>
              </div>
              <div className="py-2 flex flex-col justify-center px-1">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 leading-none">Event Stream</span>
                {/* SVG Visual Spike Line */}
                <div className="h-4 w-full flex items-end justify-center gap-0.5 mt-1.5 px-2 overflow-hidden">
                  {timelineData.map((val, i) => {
                    const heightPercent = Math.min(100, Math.round((val / maxVal) * 100));
                    return (
                      <div
                        key={i}
                        className={`w-1 rounded-full ${
                          val > 0
                            ? "bg-indigo-400 group-hover:bg-indigo-300 animate-pulse"
                            : "bg-slate-800"
                        }`}
                        style={{ height: `${Math.max(15, heightPercent)}%` }}
                        title={`${val} events in index ${i}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sub-Filters and controls */}
            <div className="p-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-900/10 shrink-0">
              <div className="flex gap-1">
                {(["ALL", "SSE", "HTTP", "SYSTEM"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setSelectedFilter(filter)}
                    className={`px-2 py-1 rounded text-[9px] font-bold ${
                      selectedFilter === filter
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-805"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {/* Utility actions */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onGenerateMockTraffic}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-orange-400 text-[9px] font-bold transition-all"
                  title="Inject simulated load test traffic spike"
                >
                  <Flame className="h-3 w-3 text-orange-500" />
                  <span>LOAD_TEST</span>
                </button>
                <button
                  onClick={onClearLogs}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 border border-transparent hover:border-slate-850"
                  title="Clear Console Buffer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={handleExportAll}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-850"
                  title="Export to Json"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Search Input bar */}
            <div className="relative px-2 py-1.5 border-b border-slate-880 bg-slate-950 shrink-0">
              <Search className="absolute left-4 top-2.5 h-3 w-3 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="search within logging terminal payloads..."
                className="w-full bg-slate-900 hover:bg-slate-850 focus:bg-slate-900 py-1.5 pl-6.5 pr-3 rounded-lg border border-slate-800 text-[10px] outline-none text-indigo-200 placeholder-slate-600 transition-all border-dashed"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-2 text-[8px] uppercase font-bold text-slate-500 hover:text-white"
                >
                  clear
                </button>
              )}
            </div>

            {/* Scrolling terminal view */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 select-text custom-terminal">
              {filteredLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center py-12">
                  <span className="text-[18px]">📟</span>
                  <p className="mt-1">No logs captured fitting your selection.</p>
                  <p className="text-[9px] max-w-[240px] mt-0.5 leading-relaxed text-slate-700 font-mono">
                    Add products to your cart, increment stocks in the console, or place sandboxed orders to trigger network events!
                  </p>
                </div>
              ) : (
                filteredLogs.map((log) => {
                  const isSSE = log.source === "SSE-BROADCAST";
                  const isStripe = log.source === "STRIPE-API";
                  const isSystem = log.type === "SYSTEM";

                  const tagColor = isSSE
                    ? "bg-emerald-900/40 text-emerald-400 border-emerald-950"
                    : isStripe
                    ? "bg-violet-900/40 text-violet-400 border-violet-950"
                    : isSystem
                    ? "bg-slate-900/60 text-slate-400 border-slate-800"
                    : "bg-indigo-900/40 text-indigo-400 border-indigo-950";

                  const statusColor = 
                    String(log.status).startsWith("2") || log.status === "Active" || log.status === "Received" || log.status === "Success"
                      ? "text-emerald-400 font-bold" 
                      : String(log.status).startsWith("1") || log.status === "Heartbeat" || log.status === "Ping"
                      ? "text-slate-400"
                      : "text-rose-500 font-bold";

                  const isViewingPayload = viewingPayloadId === log.id;

                  return (
                    <div 
                      key={log.id} 
                      className={`p-2 rounded-lg border bg-slate-900/30 hover:bg-slate-900/60 transition-colors ${
                        isSSE ? "border-emerald-500/10" : isSystem ? "border-slate-800" : "border-indigo-500/10"
                      }`}
                    >
                      {/* Meta Line */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-slate-500 font-mono text-[9px]">[{log.timestamp}]</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black border uppercase font-mono ${tagColor}`}>
                            {log.source === "HTTP-CLIENT" ? "HTTP" : log.source}
                          </span>
                          <span className="font-bold text-slate-300">
                            {log.method} <span className="text-slate-400 font-medium font-mono text-[10px]">{log.endpoint}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 bg-slate-950/60 pl-1.5 py-0.5 rounded font-bold">
                          <span className={`text-[9px] uppercase font-mono ${statusColor}`}>
                            {log.status}
                          </span>
                          {log.latency !== undefined && (
                            <span className="text-slate-500 text-[8px] pl-1 font-normal border-l border-slate-800">
                              {log.latency}ms
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Log Message Description */}
                      <div className="mt-1 text-slate-300 leading-normal pl-1.5 border-l border-slate-850 font-sans text-[10px]">
                        {log.message}
                      </div>

                      {/* Payload Inspector Button */}
                      {log.payload && log.payload !== "{}" && log.payload !== '""' && (
                        <div className="mt-1.5">
                          <button
                            onClick={() => setViewingPayloadId(isViewingPayload ? null : log.id)}
                            className="text-[9px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer font-bold select-none pr-3"
                          >
                            {isViewingPayload ? "[-] Collapse Payload" : "[+] Inspect Payload / JSON"}
                          </button>

                          {isViewingPayload && (
                            <div className="relative mt-1 border border-slate-800 bg-slate-950 rounded-lg p-2 overflow-x-auto text-[10px] leading-relaxed select-text font-mono max-h-40 text-left">
                              <pre className="text-indigo-200/95 font-mono">
                                {log.payload}
                              </pre>
                              <div className="absolute right-2 top-2 flex gap-1 bg-slate-950/90 pl-1 py-1 rounded">
                                <button
                                  onClick={() => handleCopyLog(log.payload, log.id)}
                                  className="text-[8px] text-slate-400 hover:text-white uppercase font-black"
                                  title="Copy raw JSON payload"
                                >
                                  {copiedId === log.id ? "COPIED!" : "COPY"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={logsEndRef} />
            </div>

            {/* Bottom Sticky AutoScroll control */}
            <div className="px-3 py-1.5 border-t border-slate-900 bg-slate-900/40 text-slate-550 flex items-center justify-between text-[9px] shrink-0">
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded border-slate-800 bg-slate-900 text-indigo-600 focus:ring-0 cursor-pointer h-3 w-3"
                />
                <span>Follow Tail Scroll (Auto Scroll)</span>
              </label>

              <span className="text-slate-500">
                Log Buffer: {logs.length} entries (capped at 100)
              </span>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

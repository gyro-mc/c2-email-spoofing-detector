import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Info,
  Clock,
  ExternalLink,
} from "lucide-react";
import type { ExtensionMessage, SpoofingAnalysis } from "../shared/types";

const STATUS_CONFIG = {
  idle: {
    color: "text-gray-400",
    bg: "bg-gray-400/10",
    border: "border-gray-400/20",
    icon: Info,
    label: "No Email Detected",
    desc: "Open a message to scan",
  },
  safe: {
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
    icon: ShieldCheck,
    label: "Safe Connection",
    desc: "Authentication verified",
  },
  warning: {
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
    icon: ShieldAlert,
    label: "Warning",
    desc: "Suspicious markers found",
  },
  danger: {
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/20",
    icon: ShieldX,
    label: "Spoofing Detected",
    desc: "High risk of impersonation",
  },
  checking: {
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
    icon: Clock,
    label: "Analyzing...",
    desc: "Checking headers",
  },
};

function CheckItem({
  label,
  passed,
  detail,
}: {
  label: string;
  passed: boolean;
  detail: string;
}) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
          {label}
        </span>
        {passed ? (
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
        ) : (
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
        )}
      </div>
      <div className="text-sm font-semibold truncate">
        {passed ? "Passed" : "Failed"}
      </div>
      <div className="text-[10px] text-gray-500 truncate leading-tight">
        {detail}
      </div>
    </div>
  );
}

export default function Popup() {
  const [analysis, setAnalysis] = useState<SpoofingAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const msg: ExtensionMessage = { type: "GET_ANALYSIS" };
    chrome.runtime.sendMessage(msg, (response: ExtensionMessage) => {
      if (response?.type === "ANALYSIS_RESULT") {
        setAnalysis(response.payload);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <p className="mt-4 text-sm text-gray-400 font-medium">
          Scanning headers...
        </p>
      </div>
    );
  }

  const status = analysis?.status ?? "idle";
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div className="p-5 flex flex-col min-h-[420px] bg-gradient-to-b from-[#0f1115] to-[#0a0c10]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
          </div>
          <h1 className="text-sm font-bold tracking-tight">Email Sentinel</h1>
        </div>
        <button className="text-gray-500 hover:text-white transition-colors">
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Status */}
      <div
        className={`relative flex flex-col items-center p-6 rounded-3xl border ${config.border} ${config.bg} backdrop-blur-xl mb-6 overflow-hidden`}
      >
        {/* Subtle Background Glow */}
        <div
          className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[60px] opacity-20 ${config.bg.replace("/10", "")}`}
        />

        <div
          className={`p-4 rounded-full bg-white/5 border border-white/10 mb-4 shadow-xl`}
        >
          <Icon className={`w-10 h-10 ${config.color}`} />
        </div>

        <h2 className={`text-xl font-bold ${config.color} mb-1`}>
          {config.label}
        </h2>
        <p className="text-xs text-gray-400 font-medium">{config.desc}</p>

        {analysis && (
          <div className="mt-5 flex items-end gap-1">
            <span
              className={`text-3xl font-bold tracking-tighter ${config.color}`}
            >
              {analysis.score}
            </span>
            <span className="text-xs font-semibold text-gray-500 mb-1.5">
              / 100
            </span>
          </div>
        )}
      </div>

      {/* Grid Checks */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
            Authentication
          </span>
          {analysis && (
            <span className="text-[10px] text-gray-600 font-medium italic">
              Level{" "}
              {analysis.score > 50
                ? "Critical"
                : analysis.score > 0
                  ? "Elevated"
                  : "Secure"}
            </span>
          )}
        </div>

        {analysis ? (
          <div className="grid grid-cols-2 gap-3">
            <CheckItem
              label="SPF"
              passed={analysis.checks.spf.passed}
              detail={analysis.checks.spf.detail}
            />
            <CheckItem
              label="DKIM"
              passed={analysis.checks.dkim.passed}
              detail={analysis.checks.dkim.detail}
            />
            <CheckItem
              label="DMARC"
              passed={analysis.checks.dmarc.passed}
              detail={analysis.checks.dmarc.detail}
            />
            <CheckItem
              label="Trust"
              passed={analysis.checks.fromReplyToMismatch.passed}
              detail={analysis.checks.fromReplyToMismatch.detail}
            />
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-white/5 border border-dashed border-white/10 flex flex-col items-center text-center">
            <p className="text-xs text-gray-500 italic max-w-[180px]">
              Waiting for an active email session to begin forensic analysis.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto pt-6 flex items-center justify-between border-t border-white/5">
        <div className="flex items-center gap-1.5 opacity-40">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
          <span className="text-[10px] font-medium tracking-wide">
            SYSTEM ACTIVE
          </span>
        </div>
        {analysis?.detectedAt && (
          <span className="text-[10px] text-gray-600 font-medium tracking-tight">
            Last scan:{" "}
            {new Date(analysis.detectedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>
    </div>
  );
}

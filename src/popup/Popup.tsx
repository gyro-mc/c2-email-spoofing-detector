import React, { useEffect, useState } from "react";
import type { ExtensionMessage, SpoofingAnalysis } from "../shared/types";

const STATUS_CLASSES: Record<SpoofingAnalysis["status"], { dot: string; text: string }> = {
  idle:     { dot: "bg-gray-500",   text: "text-gray-400"   },
  checking: { dot: "bg-blue-400",   text: "text-blue-400"   },
  safe:     { dot: "bg-green-500",  text: "text-green-400"  },
  warning:  { dot: "bg-amber-400",  text: "text-amber-400"  },
  danger:   { dot: "bg-red-500",    text: "text-red-400"    },
};

const STATUS_SCORE_TEXT: Record<SpoofingAnalysis["status"], string> = {
  idle:     "text-gray-400",
  checking: "text-blue-400",
  safe:     "text-green-400",
  warning:  "text-amber-400",
  danger:   "text-red-400",
};

const STATUS_LABEL: Record<SpoofingAnalysis["status"], string> = {
  idle:     "No email open",
  checking: "Analyzing…",
  safe:     "Safe",
  warning:  "Suspicious",
  danger:   "Spoofing Detected",
};

function StatusBadge({ status }: { status: SpoofingAnalysis["status"] }) {
  const { dot, text } = STATUS_CLASSES[status];
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block w-3 h-3 rounded-full ${dot}`} />
      <strong className={text}>{STATUS_LABEL[status]}</strong>
    </div>
  );
}

function CheckRow({ label, passed, detail }: { label: string; passed: boolean; detail: string }) {
  return (
    <div className="flex items-start gap-2 my-1.5">
      <span className={`font-bold w-4 shrink-0 ${passed ? "text-green-400" : "text-red-400"}`}>
        {passed ? "✓" : "✗"}
      </span>
      <div>
        <div className="font-medium text-gray-200">{label}</div>
        <div className="text-[11px] text-gray-400">{detail}</div>
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
      <div className="w-80 p-4 bg-gray-800 min-h-20">
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="w-80 p-4 bg-gray-800 min-h-20 font-sans text-gray-100">
        <h2 className="text-sm font-semibold mb-2">Email Spoofing Detector</h2>
        <StatusBadge status="idle" />
        <p className="text-gray-400 text-xs mt-2">
          Open an email on a supported provider to begin analysis.
        </p>
      </div>
    );
  }

  const { status, score, checks, detectedAt } = analysis;

  return (
    <div className="w-80 p-4 bg-gray-800 font-sans text-gray-100 text-[13px]">
      <h2 className="text-sm font-semibold mb-3">Email Spoofing Detector</h2>

      <StatusBadge status={status} />

      <div className="my-3 px-3 py-2 bg-gray-700 rounded-md">
        <div className="text-[11px] text-gray-400 mb-1">Risk Score</div>
        <div className={`text-2xl font-bold ${STATUS_SCORE_TEXT[status]}`}>
          {score} / 100
        </div>
      </div>

      <div className="mt-3">
        <div className="text-[11px] text-gray-400 mb-1.5">Authentication Checks</div>
        <CheckRow label="SPF"            passed={checks.spf.passed}                detail={checks.spf.detail} />
        <CheckRow label="DKIM"           passed={checks.dkim.passed}               detail={checks.dkim.detail} />
        <CheckRow label="DMARC"          passed={checks.dmarc.passed}              detail={checks.dmarc.detail} />
        <CheckRow label="From / Reply-To" passed={checks.fromReplyToMismatch.passed} detail={checks.fromReplyToMismatch.detail} />
      </div>

      {detectedAt && (
        <div className="mt-3 text-[10px] text-gray-500">
          Analyzed {new Date(detectedAt).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

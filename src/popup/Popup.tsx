import React, { useEffect, useState } from "react";
import type { ExtensionMessage, SpoofingAnalysis } from "../shared/types";

// Simple inline styles — swap in CSS modules or Tailwind later
const STATUS_COLORS: Record<string, string> = {
  idle:     "#6b7280",
  checking: "#3b82f6",
  safe:     "#22c55e",
  warning:  "#f59e0b",
  danger:   "#ef4444",
};

function StatusBadge({ status }: { status: SpoofingAnalysis["status"] }) {
  const color = STATUS_COLORS[status] ?? "#6b7280";
  const label: Record<string, string> = {
    idle: "No email open",
    checking: "Analyzing…",
    safe: "Safe",
    warning: "Suspicious",
    danger: "Spoofing Detected",
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          display: "inline-block",
          width: 12,
          height: 12,
          borderRadius: "50%",
          backgroundColor: color,
        }}
      />
      <strong style={{ color }}>{label[status] ?? status}</strong>
    </div>
  );
}

function CheckRow({ label, passed, detail }: { label: string; passed: boolean; detail: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, margin: "6px 0" }}>
      <span style={{ color: passed ? "#22c55e" : "#ef4444", fontWeight: "bold", minWidth: 16 }}>
        {passed ? "✓" : "✗"}
      </span>
      <div>
        <div style={{ fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>{detail}</div>
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

  const containerStyle: React.CSSProperties = {
    width: 320,
    padding: 16,
    fontFamily: "system-ui, sans-serif",
    fontSize: 13,
    color: "#f3f4f6",
    backgroundColor: "#1f2937",
    minHeight: 80,
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <p style={{ color: "#9ca3af" }}>Loading…</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div style={containerStyle}>
        <h2 style={{ margin: "0 0 8px", fontSize: 15 }}>Email Spoofing Detector</h2>
        <StatusBadge status="idle" />
        <p style={{ color: "#9ca3af", marginTop: 8 }}>
          Open an email on a supported provider to begin analysis.
        </p>
      </div>
    );
  }

  const { status, score, checks, detectedAt } = analysis;

  return (
    <div style={containerStyle}>
      <h2 style={{ margin: "0 0 12px", fontSize: 15 }}>Email Spoofing Detector</h2>
      <StatusBadge status={status} />

      <div
        style={{
          margin: "12px 0",
          padding: "8px 12px",
          backgroundColor: "#374151",
          borderRadius: 6,
        }}
      >
        <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>Risk Score</div>
        <div style={{ fontSize: 22, fontWeight: "bold", color: STATUS_COLORS[status] }}>
          {score} / 100
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>Authentication Checks</div>
        <CheckRow label="SPF"   passed={checks.spf.passed}   detail={checks.spf.detail} />
        <CheckRow label="DKIM"  passed={checks.dkim.passed}  detail={checks.dkim.detail} />
        <CheckRow label="DMARC" passed={checks.dmarc.passed} detail={checks.dmarc.detail} />
        <CheckRow
          label="From / Reply-To"
          passed={checks.fromReplyToMismatch.passed}
          detail={checks.fromReplyToMismatch.detail}
        />
      </div>

      {detectedAt && (
        <div style={{ marginTop: 12, fontSize: 10, color: "#6b7280" }}>
          Analyzed {new Date(detectedAt).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

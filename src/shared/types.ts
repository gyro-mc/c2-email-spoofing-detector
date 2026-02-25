// Shared types used across popup, content script, and background worker

export type SpoofingCheckStatus = "idle" | "checking" | "safe" | "warning" | "danger";

export interface EmailHeaders {
  from?: string;
  replyTo?: string;
  returnPath?: string;
  receivedSpf?: string;
  dkimSignature?: string;
  dmarcResult?: string;
  authenticationResults?: string;
}

export interface SpoofingAnalysis {
  status: SpoofingCheckStatus;
  score: number; // 0-100, higher = more suspicious
  checks: {
    spf: CheckResult;
    dkim: CheckResult;
    dmarc: CheckResult;
    fromReplyToMismatch: CheckResult;
  };
  rawHeaders?: EmailHeaders;
  detectedAt?: string;
}

export interface CheckResult {
  passed: boolean;
  value?: string;
  detail: string;
}

// Messages sent between content script <-> background <-> popup
export type ExtensionMessage =
  | { type: "GET_ANALYSIS" }
  | { type: "ANALYSIS_RESULT"; payload: SpoofingAnalysis }
  | { type: "HEADERS_FOUND"; payload: EmailHeaders }
  | { type: "CLEAR_ANALYSIS" };

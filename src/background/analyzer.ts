// Stub analyzer — replace with real SPF/DKIM/DMARC logic later.

import type { CheckResult, EmailHeaders, SpoofingAnalysis } from "../shared/types";

export function analyzeHeaders(headers: EmailHeaders): SpoofingAnalysis {
  const spf   = checkSpf(headers);
  const dkim  = checkDkim(headers);
  const dmarc = checkDmarc(headers);
  const mismatch = checkFromReplyToMismatch(headers);

  const failures = [spf, dkim, dmarc, mismatch].filter((c) => !c.passed).length;

  const score = failures * 25; // 0 | 25 | 50 | 75 | 100

  const status: SpoofingAnalysis["status"] =
    score === 0   ? "safe"    :
    score <= 25   ? "warning" :
    score <= 50   ? "warning" :
                    "danger";

  return {
    status,
    score,
    checks: { spf, dkim, dmarc, fromReplyToMismatch: mismatch },
    rawHeaders: headers,
    detectedAt: new Date().toISOString(),
  };
}

function checkSpf(headers: EmailHeaders): CheckResult {
  const val = headers.receivedSpf?.toLowerCase() ?? "";
  const passed = val.includes("pass");
  return {
    passed,
    value: headers.receivedSpf,
    detail: passed ? "SPF passed" : "SPF missing or failed",
  };
}

function checkDkim(headers: EmailHeaders): CheckResult {
  const val = headers.dkimSignature ?? "";
  const passed = val.length > 0;
  return {
    passed,
    value: val || undefined,
    detail: passed ? "DKIM signature present" : "DKIM signature missing",
  };
}

function checkDmarc(headers: EmailHeaders): CheckResult {
  const val = headers.dmarcResult?.toLowerCase() ?? "";
  const passed = val.includes("pass");
  return {
    passed,
    value: headers.dmarcResult,
    detail: passed ? "DMARC passed" : "DMARC missing or failed",
  };
}

function checkFromReplyToMismatch(headers: EmailHeaders): CheckResult {
  if (!headers.from || !headers.replyTo) {
    return { passed: true, detail: "No Reply-To header to compare" };
  }
  const fromDomain   = extractDomain(headers.from);
  const replyDomain  = extractDomain(headers.replyTo);
  const passed = fromDomain === replyDomain;
  return {
    passed,
    detail: passed
      ? "From and Reply-To domains match"
      : `From domain (${fromDomain}) differs from Reply-To domain (${replyDomain})`,
  };
}

function extractDomain(address: string): string {
  const match = address.match(/@([\w.-]+)/);
  return match?.[1]?.toLowerCase() ?? address.toLowerCase();
}

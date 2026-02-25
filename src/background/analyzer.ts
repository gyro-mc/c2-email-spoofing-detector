import type {
  CheckResult,
  EmailHeaders,
  SpoofingAnalysis,
} from "../shared/types";

export function analyzeHeaders(headers: EmailHeaders): SpoofingAnalysis {
  const fromDomain = headers.from ? extractDomain(headers.from) : undefined;

  const spf = checkSpf(headers, fromDomain);
  const dkim = checkDkim(headers, fromDomain);
  const dmarc = checkDmarc(headers);
  const mismatch = checkFromReplyToMismatch(headers);

  // Score calculation:
  // 0-25: Safe
  // 30-60: Warning
  // 65+: Danger
  let score = 0;
  if (!spf.passed) score += 30;
  if (!dkim.passed) score += 30;
  if (!dmarc.passed) score += 20;
  if (!mismatch.passed) score += 40;

  // Capped at 100
  score = Math.min(score, 100);

  const status: SpoofingAnalysis["status"] =
    score === 0 ? "safe" : score <= 40 ? "warning" : "danger";

  return {
    status,
    score,
    checks: { spf, dkim, dmarc, fromReplyToMismatch: mismatch },
    rawHeaders: headers,
    detectedAt: new Date().toISOString(),
  };
}

function checkSpf(headers: EmailHeaders, fromDomain?: string): CheckResult {
  const val = headers.receivedSpf?.toLowerCase() ?? "";
  const passed = val.includes("pass");

  let detail = passed
    ? "SPF protection verified"
    : "SPF verification failed or missing";

  // If we have a domain from "mailed-by" (common in UI), check if it matches sender
  const mailedByMatch = val.match(/domain of ([\w.-]+)/);
  const mailedByDomain = mailedByMatch?.[1];

  if (passed && fromDomain && mailedByDomain && fromDomain !== mailedByDomain) {
    return {
      passed: false,
      value: mailedByDomain,
      detail: `SPF passed but for a different domain: ${mailedByDomain}`,
    };
  }

  return {
    passed,
    value: mailedByDomain || headers.receivedSpf,
    detail,
  };
}

function checkDkim(headers: EmailHeaders, fromDomain?: string): CheckResult {
  const val = headers.dkimSignature ?? "";
  const passed = val.length > 0;

  // Extract domain from signature d= tag
  const dMatch = val.match(/\bd=([\w.-]+)/);
  const dkimDomain = dMatch?.[1];

  let detail = passed ? "DKIM signature valid" : "DKIM signature missing";

  if (passed && fromDomain && dkimDomain && fromDomain !== dkimDomain) {
    return {
      passed: false,
      value: dkimDomain,
      detail: `Signed by ${dkimDomain}, which differs from the sender domain`,
    };
  }

  return {
    passed: passed && (!fromDomain || !dkimDomain || fromDomain === dkimDomain),
    value: dkimDomain || undefined,
    detail:
      passed && fromDomain && dkimDomain && fromDomain !== dkimDomain
        ? detail
        : passed
          ? detail
          : "No DKIM signature found",
  };
}

function checkDmarc(headers: EmailHeaders): CheckResult {
  const val = headers.dmarcResult?.toLowerCase() ?? "";
  const passed = val.includes("pass");
  return {
    passed,
    value: headers.dmarcResult,
    detail: passed ? "DMARC policy passed" : "DMARC record missing or failed",
  };
}

function checkFromReplyToMismatch(headers: EmailHeaders): CheckResult {
  if (!headers.from || !headers.replyTo) {
    return { passed: true, detail: "Sender and reply consistency verified" };
  }
  const fromDomain = extractDomain(headers.from);
  const replyDomain = extractDomain(headers.replyTo);
  const passed = fromDomain === replyDomain;
  return {
    passed,
    detail: passed
      ? "Reply-To address matches sender domain"
      : `Danger: Reply-To domain (${replyDomain}) differs from sender`,
  };
}

function extractDomain(address: string): string {
  const match = address.match(/@([\w.-]+)/);
  return match?.[1]?.toLowerCase() ?? address.toLowerCase();
}

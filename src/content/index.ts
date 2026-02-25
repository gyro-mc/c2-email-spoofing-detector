// Content script — runs on supported webmail pages.
import type { EmailHeaders, ExtensionMessage } from "../shared/types";

// Detect when the user opens an email and extract headers from the DOM (Gmail-focused)
function extractGmailHeaders(): EmailHeaders | null {
  const mainContent = document.querySelector('[role="main"]');
  if (!mainContent) return null;

  // Gmail specific: The "Show Details" arrow often populates a table with id ":..."
  // It's brittle, but we can look for specific labels like "mailed-by", "signed-by".

  const fromElement = document.querySelector("span[email]");
  const from =
    fromElement?.getAttribute("email") || fromElement?.textContent || undefined;

  // Look for the "To me" details table contents if it's open/available in some way
  // Or look for common patterns in the "to" line

  // Try to find DKIM signature domain from "signed-by"
  const signedBy = findTextByLabel("signed-by");
  const mailedBy = findTextByLabel("mailed-by");

  // If we can't find technical headers, we at least return the UI visible ones
  if (!from) return null;

  return {
    from,
    receivedSpf: mailedBy ? `pass (domain of ${mailedBy})` : undefined,
    dkimSignature: signedBy ? `v=1; d=${signedBy}` : undefined,
    // DMARC is harder to find in the UI unless "Details" is open
  };
}

function findTextByLabel(label: string): string | undefined {
  const elements = Array.from(document.querySelectorAll("tr, div"));
  for (const el of elements) {
    const content = el.textContent;
    if (content?.toLowerCase().includes(label.toLowerCase())) {
      // Find the sibling or child that contains the actual value
      // Gmail usually puts it in a <td> or a <span>
      const value = content
        .split(new RegExp(label, "i"))[1]
        ?.trim()
        ?.split("\n")[0]
        ?.trim();
      if (value && value.length < 100) return value; // sanity check
    }
  }
  return undefined;
}

function notifyBackground(headers: EmailHeaders): void {
  const message: ExtensionMessage = { type: "HEADERS_FOUND", payload: headers };
  chrome.runtime.sendMessage(message);
}

// Observe DOM mutations to detect when an email is opened
let lastAnalyzedId = "";

const observer = new MutationObserver(() => {
  // Gmail appends message IDs to the URL: #inbox/messageId
  const messageId = window.location.hash;

  if (messageId && messageId !== lastAnalyzedId && messageId.includes("/")) {
    // Wait a bit for Gmail to render the details
    setTimeout(() => {
      const headers = extractGmailHeaders();
      if (headers && headers.from !== undefined) {
        lastAnalyzedId = messageId;
        notifyBackground(headers);
      }
    }, 1500);
  } else if (!messageId.includes("/")) {
    // Potentially back in inbox
    if (lastAnalyzedId !== "") {
      lastAnalyzedId = "";
      chrome.runtime.sendMessage({ type: "CLEAR_ANALYSIS" });
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });

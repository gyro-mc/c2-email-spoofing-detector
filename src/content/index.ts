// Content script — runs on supported webmail pages.
// Responsible for extracting email headers from the DOM and
// forwarding them to the background service worker.

import type { EmailHeaders, ExtensionMessage } from "../shared/types";

function extractHeaders(): EmailHeaders | null {
  // TODO: implement per-provider header extraction
  // Gmail, Outlook etc. each expose headers differently in the DOM.
  // Return null when no email is currently open.
  return null;
}

function notifyBackground(headers: EmailHeaders): void {
  const message: ExtensionMessage = { type: "HEADERS_FOUND", payload: headers };
  chrome.runtime.sendMessage(message);
}

// Observe DOM mutations so we react when the user opens an email
const observer = new MutationObserver(() => {
  const headers = extractHeaders();
  if (headers) {
    notifyBackground(headers);
  }
});

observer.observe(document.body, { childList: true, subtree: true });

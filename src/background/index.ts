// Background service worker — persists across page loads.
// Receives headers from the content script, runs the spoofing
// analysis, stores the result, and notifies the popup.

import type {
  EmailHeaders,
  ExtensionMessage,
  SpoofingAnalysis,
} from "../shared/types";
import { analyzeHeaders } from "./analyzer";

// Store the latest analysis per tab
const analysisCache = new Map<number, SpoofingAnalysis>();

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    if (message.type === "HEADERS_FOUND") {
      const tabId = sender.tab?.id;
      if (tabId == null) return;

      const analysis = analyzeHeaders(message.payload);
      analysisCache.set(tabId, analysis);

      // Persist to chrome.storage for popup to read even after SW restart
      chrome.storage.local.set({ [`analysis_${tabId}`]: analysis });

      // Show badge to alert user
      updateBadge(tabId, analysis.status);

      // Optionally show a notification for high-risk emails
      if (analysis.status === "danger") {
        showDangerNotification();
      }
    }

    if (message.type === "GET_ANALYSIS") {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (tabId == null) {
          sendResponse({ type: "ANALYSIS_RESULT", payload: null });
          return;
        }
        const cached = analysisCache.get(tabId);
        if (cached) {
          sendResponse({
            type: "ANALYSIS_RESULT",
            payload: cached,
          } satisfies ExtensionMessage);
        } else {
          chrome.storage.local.get(`analysis_${tabId}`, (result) => {
            const stored = result[`analysis_${tabId}`] as
              | SpoofingAnalysis
              | undefined;
            sendResponse({
              type: "ANALYSIS_RESULT",
              payload: stored ?? null,
            });
          });
        }
      });
      return true; // keep message channel open for async sendResponse
    }

    if (message.type === "CLEAR_ANALYSIS") {
      const tabId = sender.tab?.id;
      if (tabId != null) {
        analysisCache.delete(tabId);
        chrome.storage.local.remove(`analysis_${tabId}`);
        updateBadge(tabId, "idle");
      }
    }
  },
);

function updateBadge(tabId: number, status: SpoofingAnalysis["status"]): void {
  const badgeMap: Record<
    SpoofingAnalysis["status"],
    { text: string; color: string }
  > = {
    idle: { text: "", color: "#9ca3af" },
    checking: { text: "...", color: "#60a5fa" },
    safe: { text: "OK", color: "#22c55e" },
    warning: { text: "!", color: "#f59e0b" },
    danger: { text: "!!", color: "#ef4444" },
  };
  const badge = badgeMap[status];
  chrome.action.setBadgeText({ text: badge.text, tabId });
  chrome.action.setBadgeBackgroundColor({ color: badge.color, tabId });
}

function showDangerNotification(): void {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon48.png",
    title: "Spoofing Detected",
    message:
      "This email shows strong signs of spoofing. Do not trust the sender.",
    priority: 2,
  });
}

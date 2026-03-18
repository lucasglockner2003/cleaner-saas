import { appEnv } from "../../config/env";

function hashKey(input) {
  return String(input)
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function buildProviderRef(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function createMockEmailTransport() {
  return {
    name: "mock-email-transport",
    mode: "mock",
    send(payload, context = {}) {
      if (!payload?.to || !payload?.subject || !payload?.body) {
        return {
          ok: false,
          error: "Missing to/subject/body in payload."
        };
      }

      const key = `${payload.to}-${payload.subject}`;
      const shouldFailFirstAttempt = hashKey(key) % 6 === 0;
      if (shouldFailFirstAttempt && (context.attemptCount ?? 0) < 1) {
        return {
          ok: false,
          error: "Simulated temporary provider timeout."
        };
      }

      return {
        ok: true,
        providerRef: buildProviderRef("mock")
      };
    }
  };
}

function createWebhookEmailTransport() {
  return {
    name: "webhook-email-transport",
    mode: "webhook",
    send(payload) {
      if (!payload?.to || !payload?.subject || !payload?.body) {
        return {
          ok: false,
          error: "Missing to/subject/body in payload."
        };
      }

      if (!appEnv.emailWebhookUrl) {
        return {
          ok: false,
          error: "VITE_EMAIL_WEBHOOK_URL is not configured."
        };
      }

      return {
        ok: true,
        providerRef: buildProviderRef("webhook"),
        queued: true
      };
    }
  };
}

export function getEmailTransport() {
  const mode = String(appEnv.emailTransport || "mock").toLowerCase();
  if (mode === "webhook") {
    return createWebhookEmailTransport();
  }

  return createMockEmailTransport();
}


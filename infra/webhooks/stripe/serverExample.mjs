import http from "node:http";
import { handleStripeWebhookRequest } from "./handlerExample.mjs";

const port = Number(process.env.STRIPE_WEBHOOK_PORT || 8787);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
const paymentGatewayToken = process.env.PAYMENT_GATEWAY_AUTH_TOKEN || "";
const appWebhookUrl = process.env.APP_PAYMENT_WEBHOOK_URL || process.env.VITE_PAYMENT_WEBHOOK_URL || "";

function collectRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload)
  });
  res.end(payload);
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    sendJson(res, 200, {
      ok: true,
      component: "stripe-webhook-example",
      appWebhookConfigured: Boolean(appWebhookUrl)
    });
    return;
  }

  if (req.method === "POST" && req.url === "/webhooks/stripe") {
    try {
      const rawBody = await collectRawBody(req);
      const headers = Object.fromEntries(
        Object.entries(req.headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(",") : value || ""])
      );

      const response = await handleStripeWebhookRequest({
        rawBody,
        headers,
        webhookSecret,
        paymentGatewayToken,
        appWebhookUrl
      });

      sendJson(res, response.status, response.body);
      return;
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Unexpected server error."
      });
      return;
    }
  }

  sendJson(res, 404, { ok: false, error: "Not found." });
});

server.listen(port, () => {
  console.log(`[stripe-webhook-example] Listening on :${port}`);
  console.log("[stripe-webhook-example] POST /webhooks/stripe");
  console.log("[stripe-webhook-example] GET  /health");
});

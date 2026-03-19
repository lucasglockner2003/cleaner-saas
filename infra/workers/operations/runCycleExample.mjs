import { runOperationWorker } from "./runnerExample.mjs";

const appWebhookUrl = process.env.APP_PAYMENT_WEBHOOK_URL || process.env.VITE_PAYMENT_WEBHOOK_URL || "";
const paymentGatewayToken = process.env.PAYMENT_GATEWAY_AUTH_TOKEN || process.env.VITE_PAYMENT_GATEWAY_AUTH_TOKEN || "";
const workerId = process.env.OPS_WORKER_ID || "ops-worker-pilot-1";
const maxJobs = Number(process.env.OPS_WORKER_MAX_JOBS || 20);
const loopMode = String(process.env.OPS_WORKER_LOOP || "false").toLowerCase() === "true";
const intervalMs = Number(process.env.OPS_WORKER_INTERVAL_MS || 60000);

async function runOnce() {
  const startedAt = new Date().toISOString();
  console.log(`[ops-worker] Cycle start ${startedAt}`);
  const result = await runOperationWorker({
    appWebhookUrl,
    paymentGatewayToken,
    workerId,
    maxJobs
  });
  console.log("[ops-worker] Cycle result:");
  console.log(JSON.stringify(result, null, 2));
}

async function main() {
  if (!appWebhookUrl) {
    throw new Error("Missing APP_PAYMENT_WEBHOOK_URL or VITE_PAYMENT_WEBHOOK_URL.");
  }

  if (!loopMode) {
    await runOnce();
    return;
  }

  console.log(`[ops-worker] Loop mode enabled. Interval: ${intervalMs}ms`);
  while (true) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await runOnce();
    } catch (error) {
      console.error(`[ops-worker] Cycle failed: ${error instanceof Error ? error.message : "Unexpected error."}`);
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

main().catch((error) => {
  console.error(`[ops-worker] ${error instanceof Error ? error.message : "Unexpected error."}`);
  process.exit(1);
});

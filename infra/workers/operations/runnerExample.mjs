/**
 * Example cron worker for operation job execution.
 * Run every 1-5 minutes in your scheduler.
 */
export async function runOperationWorker({
  appWebhookUrl,
  paymentGatewayToken,
  workerId = "ops-worker-1",
  maxJobs = 20
}) {
  if (!appWebhookUrl) {
    throw new Error("Missing app webhook URL.");
  }

  const response = await fetch(appWebhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-payment-gateway-token": paymentGatewayToken || ""
    },
    body: JSON.stringify({
      action: "operation_job_cycle",
      payload: {
        workerId,
        maxJobs,
        leaseMinutes: 10,
        recoverStaleRunning: true
      }
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Operation worker cycle failed (${response.status}): ${body}`);
  }

  return response.json();
}

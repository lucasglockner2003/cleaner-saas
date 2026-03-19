import { mapStripeEventToPaymentProviderPayload } from "./mapStripeEventToPaymentEvent.mjs";
import { verifyStripeSignature } from "./verifyStripeSignature.mjs";

/**
 * Example runtime-agnostic Stripe webhook handler.
 * Deploy in your webhook runtime (Edge Function, serverless function, or API server).
 */
export async function handleStripeWebhookRequest({
  rawBody,
  headers,
  webhookSecret,
  paymentGatewayToken,
  appWebhookUrl
}) {
  const signatureHeader = headers["stripe-signature"] || headers["Stripe-Signature"];
  const verified = verifyStripeSignature({
    rawBody,
    signatureHeader,
    webhookSecret
  });

  if (!verified.ok) {
    return {
      status: 400,
      body: {
        ok: false,
        error: verified.error
      }
    };
  }

  let stripeEvent;
  try {
    stripeEvent = JSON.parse(rawBody);
  } catch (_error) {
    return {
      status: 400,
      body: {
        ok: false,
        error: "Invalid JSON payload."
      }
    };
  }

  const mapped = mapStripeEventToPaymentProviderPayload(stripeEvent);
  if (!appWebhookUrl) {
    return {
      status: 202,
      body: {
        ok: true,
        message: "Stripe event verified but app webhook URL not configured.",
        mapped
      }
    };
  }

  const response = await fetch(appWebhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-payment-gateway-token": paymentGatewayToken || ""
    },
    body: JSON.stringify({
      action: "payment_provider_event",
      payload: {
        provider: mapped.provider,
        provider_event_id: mapped.id,
        event_type: mapped.event_type,
        provider_intent_id: mapped.provider_intent_id,
        provider_ref: mapped.provider_ref,
        payment_status: mapped.payment_status,
        failure_reason: mapped.failure_reason,
        metadata: mapped.metadata,
        raw_payload: mapped.raw
      }
    })
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    return {
      status: 502,
      body: {
        ok: false,
        error: `Failed to forward event to app webhook (${response.status}).`,
        details: errorBody
      }
    };
  }

  return {
    status: 200,
    body: {
      ok: true,
      message: "Stripe event verified and forwarded."
    }
  };
}

function resolveProviderIntentId(event = {}) {
  const object = event?.data?.object || {};
  if (object.object === "payment_intent") {
    return object.id || null;
  }
  if (object.payment_intent) {
    return object.payment_intent;
  }
  return null;
}

function resolveProviderRef(event = {}) {
  const object = event?.data?.object || {};
  return object.charge || object.id || null;
}

function resolveFailureReason(event = {}) {
  const object = event?.data?.object || {};
  if (object.last_payment_error?.message) {
    return object.last_payment_error.message;
  }
  if (object.failure_message) {
    return object.failure_message;
  }
  return null;
}

function resolvePaymentStatus(event = {}) {
  const object = event?.data?.object || {};
  return object.status || null;
}

export function mapStripeEventToPaymentProviderPayload(event = {}) {
  return {
    provider: "stripe",
    id: event.id || null,
    event_type: event.type || "unknown",
    provider_intent_id: resolveProviderIntentId(event),
    provider_ref: resolveProviderRef(event),
    payment_status: resolvePaymentStatus(event),
    failure_reason: resolveFailureReason(event),
    metadata: event?.data?.object?.metadata || {},
    raw: event
  };
}

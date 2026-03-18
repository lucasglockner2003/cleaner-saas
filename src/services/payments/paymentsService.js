/**
 * Payments adapter contract placeholder.
 */

export const paymentsProviders = {
  stripe: {
    available: false
  },
  paypal: {
    available: false
  }
};

export function buildPaymentIntentPlaceholder(invoiceId) {
  return {
    invoiceId,
    status: "not_configured",
    message: "Payment integration is deferred."
  };
}


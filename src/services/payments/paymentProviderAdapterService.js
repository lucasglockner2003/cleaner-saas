import { appEnv } from "../../config/env";

const READY_PROVIDER = {
  manual: true,
  stripe: Boolean(appEnv.paymentWebhookUrl && appEnv.stripePublishableKey),
  paypal: false,
  subscription_billing: false
};

async function callProviderGateway(action, payload, options = {}) {
  if (!appEnv.paymentWebhookUrl) {
    return {
      ok: false,
      mode: "adapter_only",
      error: "Payment gateway webhook URL is not configured."
    };
  }

  try {
    const response = await fetch(appEnv.paymentWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-idempotency-key": options.idempotencyKey || payload.idempotency_key || "",
        "x-payment-gateway-token": appEnv.paymentGatewayAuthToken || ""
      },
      body: JSON.stringify({
        action,
        payload
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        mode: "provider_gateway",
        error: data?.error || `Gateway error (${response.status}).`,
        raw: data
      };
    }

    return {
      ok: true,
      mode: "provider_gateway",
      data
    };
  } catch (error) {
    return {
      ok: false,
      mode: "provider_gateway",
      error: error instanceof Error ? error.message : "Provider gateway call failed."
    };
  }
}

const providerAdapters = {
  manual: {
    provider: "manual",
    ready: true,
    async createIntent(invoice, payload = {}) {
      return {
        ok: true,
        mode: "manual",
        intent: {
          invoice_id: invoice.id,
          amount: payload.amount ?? invoice.balance_due ?? invoice.total ?? 0,
          currency: invoice.currency ?? "NZD",
          provider_intent_id: null,
          provider_ref: null
        },
        message: "Manual reconciliation flow."
      };
    },
    async reconcilePayment(payment) {
      return {
        ok: true,
        mode: "manual",
        payment_status: payment.status,
        provider_ref: payment.provider_ref ?? null
      };
    }
  },

  stripe: {
    provider: "stripe",
    ready: READY_PROVIDER.stripe,
    async createIntent(invoice, payload = {}) {
      const amount = payload.amount ?? invoice.balance_due ?? invoice.total ?? 0;
      const intentPayload = {
        provider: "stripe",
        invoice_id: invoice.id,
        amount,
        currency: invoice.currency ?? "NZD",
        customer_email: payload.customer_email ?? null,
        idempotency_key: payload.idempotency_key ?? null,
        metadata: {
          invoice_number: invoice.invoice_number ?? invoice.id,
          client_id: invoice.client_id
        }
      };

      if (!appEnv.paymentWebhookUrl || !appEnv.stripePublishableKey) {
        return {
          ok: false,
          mode: "provider_placeholder",
          intent: intentPayload,
          message: "Stripe adapter requires webhook gateway URL and publishable key."
        };
      }

      const result = await callProviderGateway("create_payment_intent", intentPayload, {
        idempotencyKey: payload.idempotency_key
      });

      if (!result.ok) {
        return {
          ok: false,
          mode: result.mode,
          intent: intentPayload,
          message: result.error,
          error: result.error
        };
      }

      return {
        ok: true,
        mode: "provider_gateway",
        intent: {
          ...intentPayload,
          provider_intent_id: result.data?.provider_intent_id ?? null,
          provider_ref: result.data?.provider_ref ?? null,
          client_secret: result.data?.client_secret ?? null
        },
        message: "Stripe payment intent prepared."
      };
    },
    async reconcilePayment(payment) {
      const result = await callProviderGateway("reconcile_payment", {
        provider: "stripe",
        payment_id: payment.id,
        provider_intent_id: payment.provider_intent_id,
        provider_ref: payment.provider_ref
      });

      if (!result.ok) {
        return {
          ok: false,
          mode: result.mode,
          error: result.error
        };
      }

      return {
        ok: true,
        mode: "provider_gateway",
        payment_status: result.data?.payment_status ?? payment.status,
        provider_ref: result.data?.provider_ref ?? payment.provider_ref ?? null,
        provider_event_id: result.data?.provider_event_id ?? null
      };
    }
  },

  paypal: {
    provider: "paypal",
    ready: false,
    async createIntent(invoice, payload = {}) {
      return {
        ok: false,
        mode: "provider_placeholder",
        intent: {
          provider: "paypal",
          invoice_id: invoice.id,
          amount: payload.amount ?? invoice.balance_due ?? invoice.total ?? 0,
          currency: invoice.currency ?? "NZD"
        },
        message: "PayPal adapter boundary ready; provider transport not connected."
      };
    },
    async reconcilePayment(payment) {
      return {
        ok: false,
        mode: "provider_placeholder",
        payment_status: payment.status,
        message: "PayPal reconciliation adapter not connected."
      };
    }
  },

  subscription_billing: {
    provider: "subscription_billing",
    ready: false,
    async createIntent(invoice, payload = {}) {
      return {
        ok: false,
        mode: "provider_placeholder",
        intent: {
          provider: "subscription_billing",
          invoice_id: invoice.id,
          amount: payload.amount ?? invoice.balance_due ?? invoice.total ?? 0,
          currency: invoice.currency ?? "NZD"
        },
        message: "Subscription billing adapter boundary ready for integration."
      };
    },
    async reconcilePayment(payment) {
      return {
        ok: false,
        mode: "provider_placeholder",
        payment_status: payment.status,
        message: "Subscription billing reconciliation adapter not connected."
      };
    }
  }
};

export function getPaymentProviderAdapter(provider) {
  return providerAdapters[provider] ?? providerAdapters.manual;
}

export function getPaymentProviderStatus() {
  return Object.values(providerAdapters).map((adapter) => ({
    provider: adapter.provider,
    ready: Boolean(adapter.ready),
    configuredAsDefault: appEnv.paymentProvider === adapter.provider
  }));
}

export function getPaymentProviderLaunchChecks(provider = appEnv.paymentProvider) {
  const checks = [];

  if (provider === "manual") {
    return {
      provider,
      isReady: true,
      checks: []
    };
  }

  checks.push({
    key: "payment_webhook_url",
    ok: Boolean(appEnv.paymentWebhookUrl),
    message: "Set VITE_PAYMENT_WEBHOOK_URL."
  });
  checks.push({
    key: "gateway_auth_token",
    ok: Boolean(appEnv.paymentGatewayAuthToken),
    message: "Set VITE_PAYMENT_GATEWAY_AUTH_TOKEN."
  });

  if (provider === "stripe") {
    checks.push({
      key: "stripe_publishable_key",
      ok: Boolean(appEnv.stripePublishableKey),
      message: "Set VITE_STRIPE_PUBLISHABLE_KEY."
    });
  }

  return {
    provider,
    isReady: checks.every((item) => item.ok),
    checks
  };
}

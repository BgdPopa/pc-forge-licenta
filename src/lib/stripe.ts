import Stripe from "stripe";

/** Inițializează SDK-ul numai la runtime, după configurarea cheii de test. */
export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || !secretKey.startsWith("sk_test_")) {
    throw new Error("STRIPE_TEST_NOT_CONFIGURED");
  }
  return new Stripe(secretKey);
}

export function getApplicationUrl(): string {
  const configuredUrl = process.env.NEXTAUTH_URL;
  if (!configuredUrl && process.env.NODE_ENV === "production") {
    throw new Error("APPLICATION_URL_NOT_CONFIGURED");
  }

  const applicationUrl = new URL(configuredUrl ?? "http://localhost:3000");
  if (!["http:", "https:"].includes(applicationUrl.protocol)) {
    throw new Error("APPLICATION_URL_INVALID");
  }
  return applicationUrl.toString().replace(/\/$/, "");
}

CREATE TYPE "PaymentMethod" AS ENUM ('SIMULATED', 'STRIPE_TEST');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED');

ALTER TABLE "orders"
ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'SIMULATED',
ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PAID',
ADD COLUMN "stripeCheckoutSessionId" TEXT,
ADD COLUMN "stripePaymentIntentId" TEXT,
ADD COLUMN "paidAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "orders_stripeCheckoutSessionId_key"
ON "orders"("stripeCheckoutSessionId");

CREATE UNIQUE INDEX "orders_stripePaymentIntentId_key"
ON "orders"("stripePaymentIntentId");

CREATE INDEX "orders_paymentStatus_idx"
ON "orders"("paymentStatus");

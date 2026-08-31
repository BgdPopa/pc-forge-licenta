This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Stripe Test Mode

Integrarea folosește Stripe Checkout găzduit și confirmă plățile prin webhook
semnat, cu o reconciliere server-side suplimentară pe pagina de succes. Adaugă
în fișierul local `.env`:

```text
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

Pentru testarea locală a webhookului:

```bash
stripe login
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

Secretul `whsec_...` afișat de comandă se copiază în `.env`, apoi serverul Next.js se repornește. Cheile Stripe nu se salvează în Git.

În Stripe Dashboard, endpointul din mediul public este:

```text
https://DOMENIUL-APLICATIEI/api/stripe/webhook
```

Evenimentele folosite sunt `checkout.session.completed`,
`checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`
și `checkout.session.expired`. Checkout-ul acceptă numai carduri de test, rezervă
stocul timp de o oră și îl restaurează la anulare sau expirare. Confirmarea este
idempotentă și verifică ID-ul comenzii, utilizatorul, moneda și suma direct față
de sesiunea Stripe.

Pentru o plată locală reușită se poate folosi cardul Stripe `4242 4242 4242 4242`,
o dată viitoare, orice CVC de 3 cifre și orice cod poștal. După plată, verifică
pagina `Comenzile mele`, stocul produselor și statusul din panoul de administrare.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

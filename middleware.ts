import { withAuth } from "next-auth/middleware";

/** Protejează rutele private folosind sesiunea JWT NextAuth. */
export default withAuth({
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    authorized: ({ token }) => Boolean(token),
  },
});

export const config = {
  matcher: [
    "/admin/:path*",
    "/profile/:path*",
    "/configurations/:path*",
    "/checkout/:path*",
  ],
};

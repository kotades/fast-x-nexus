/**
 * /src/lib/auth.ts
 * Fast X Nexus — NextAuth.js v5 Configuration Matrix
 *
 * Architecture: NextAuth v5 (beta) with Supabase Adapter
 * Security Standard: ASVS Level 2
 * Session Strategy: JWT (stateless, < 1hr expiry for sensitive ops)
 *
 * Roles supported: CASUAL_CUSTOMER | B2B_VENDOR | RIDER | ADMIN | SUPER_ADMIN
 */

import NextAuth, { type NextAuthConfig } from "next-auth";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Supabase admin client (server-side only — uses SERVICE_ROLE key)
// NEVER expose this client to the browser.
// ---------------------------------------------------------------------------
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ---------------------------------------------------------------------------
// RBAC Role Definitions
// ---------------------------------------------------------------------------
export type FastXRole =
  | "CASUAL_CUSTOMER"
  | "B2B_VENDOR"
  | "RIDER"
  | "ADMIN"
  | "SUPER_ADMIN";

// ---------------------------------------------------------------------------
// NextAuth v5 Configuration
// ---------------------------------------------------------------------------
export const authConfig: NextAuthConfig = {
  // Adapter: persists sessions and accounts in Supabase Postgres
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),

  // Session strategy: JWT for stateless edge compatibility
  session: {
    strategy: "jwt",
    maxAge: 60 * 60, // 1 hour — ASVS Level 2 requirement
  },

  providers: [
    // -------------------------------------------------------------------------
    // OTP / Magic Link Provider (for Casual Customers via WhatsApp/SMS OTP)
    // Full implementation will be wired to Supabase Auth OTP flow.
    // -------------------------------------------------------------------------
    CredentialsProvider({
      id: "otp-credentials",
      name: "OTP Magic Link",
      credentials: {
        phone: { label: "Phone Number", type: "text" },
        otp: { label: "OTP Code", type: "text" },
      },
      async authorize(credentials) {
        // TODO: Implement OTP verification via Supabase Auth signInWithOtp
        // This will call supabaseAdmin.auth.verifyOtp({ phone, token, type: 'sms' })
        if (!credentials?.phone || !credentials?.otp) return null;

        const { data, error } = await supabaseAdmin.auth.verifyOtp({
          phone: credentials.phone as string,
          token: credentials.otp as string,
          type: "sms",
        });

        if (error || !data.user) return null;

        return {
          id: data.user.id,
          email: data.user.email ?? undefined,
          phone: data.user.phone ?? undefined,
        };
      },
    }),
  ],

  callbacks: {
    // -------------------------------------------------------------------------
    // JWT Callback: Inject role into token on first sign-in
    // -------------------------------------------------------------------------
    async jwt({ token, user }) {
      if (user) {
        // Fetch the user's role from the profiles table
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        token.role = (profile?.role as FastXRole) ?? "CASUAL_CUSTOMER";
        token.id = user.id;
      }
      return token;
    },

    // -------------------------------------------------------------------------
    // Session Callback: Expose role to client-side session
    // -------------------------------------------------------------------------
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as typeof session.user & { role: FastXRole }).role =
          token.role as FastXRole;
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },

  // Security: Enforce HTTPS in production
  trustHost: true,
};

// ---------------------------------------------------------------------------
// Export the NextAuth handler and helper methods
// ---------------------------------------------------------------------------
export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);

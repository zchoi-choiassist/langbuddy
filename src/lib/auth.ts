import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { supabaseAdmin } from './supabase/admin'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Ensure user_settings row exists on first login
      const { error } = await supabaseAdmin
        .from('user_settings')
        .upsert(
          { user_id: user.id!, topik_level: 2 },
          { onConflict: 'user_id', ignoreDuplicates: true }
        )
      if (error) console.error('[signIn] user_settings upsert failed:', error)
      return true
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub
      return session
    },
  },
})

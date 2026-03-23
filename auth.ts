import NextAuth from 'next-auth'
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AZURE_CLIENT_ID!,
      clientSecret: process.env.AZURE_CLIENT_SECRET!,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
    }),
  ],
  callbacks: {
    authorized({ auth }) {
      // Any authenticated Entra user in your tenant is permitted
      return !!auth?.user
    },
    jwt({ token, profile }) {
      // Persist the user's Entra object ID and display name in the token
      if (profile) {
        token.oid = (profile as Record<string, unknown>).oid as string
      }
      return token
    },
    session({ session, token }) {
      if (token.oid) session.user.id = token.oid as string
      return session
    },
  },
  trustHost: true,
})

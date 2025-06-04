// lib/auth.ts
import { NextAuthOptions } from "next-auth"
import GithubProvider from "next-auth/providers/github"

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: { params: { scope: 'read:user repo' } },
    })
  ],
  callbacks: {
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          id: token.id,
          name: token.name,
          email: token.email,
          image: token.picture,
          accessToken: token.accessToken
        }
      }
      return session
    },
    async jwt({ token, account }) {
      console.log("account", account)
      if (account) {
        token.accessToken = account?.access_token
      }
      return token
    },
  },
  pages: {
    signIn: '/login',
  },
}
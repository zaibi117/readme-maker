// @ts-nocheck
import { NextAuthOptions } from "next-auth"
import GithubProvider from "next-auth/providers/github"
import mongoose from "mongoose"
import User from "@/models/user"

// MongoDB connection
async function connectToDatabase() {
  if (mongoose.connections[0].readyState) {
    return
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI!)
    console.log("Connected to MongoDB")
  } catch (error) {
    console.error("MongoDB connection error:", error)
    throw error
  }
}

// Function to create or update user
async function createOrUpdateUser(userData: {
  githubId: string
  email: string
  name: string
  image?: string
  accessToken?: string
}) {
  try {
    await connectToDatabase()

    const existingUser = await User.findOne({ email: userData.email })

    if (existingUser) {
      // Update existing user
      existingUser.name = userData.name
      existingUser.image = userData.image
      existingUser.accessToken = userData.accessToken
      existingUser.lastLogin = new Date()
      await existingUser.save()
      return existingUser
    } else {
      // Create new user
      const newUser = await User.create({
        githubId: userData.githubId,
        email: userData.email,
        name: userData.name,
        image: userData.image,
        accessToken: userData.accessToken,
        provider: 'github'
      })
      return newUser
    }
  } catch (error) {
    console.error("Error creating/updating user:", error)
    throw error
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: { params: { scope: 'read:user repo' } },
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // Create or update user in MongoDB when they sign in
        await createOrUpdateUser({
          githubId: profile?.id?.toString() || user.id,
          email: user.email || profile?.email || `${profile?.login}@users.noreply.github.com`,
          name: user.name!,
          image: user.image,
          accessToken: account?.access_token
        })
        return true
      } catch (error) {
        console.error("Sign in error:", error)
        return false
      }
    },
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
    async jwt({ token, account, profile }) {
      console.log("account", account)
      if (account) {
        token.accessToken = account?.access_token
      }
      if (profile) {
        token.id = profile.id
      }
      return token
    },
  },
  pages: {
    signIn: '/login',
  },
}
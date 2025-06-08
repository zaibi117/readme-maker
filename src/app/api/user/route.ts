import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectToDatabase from "@/lib/mongodb"
import UserModel from "@/models/user"
import { UserRateLimiter } from "@/lib/user-rate-limiter"

export async function GET(req: NextRequest) {
    try {
        // Check user authentication
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 })
        }

        // Connect to database
        await connectToDatabase()

        // Get user data
        const userId = session.user.id
        // @ts-ignore
        const user = await UserModel.findOne({ githubId: userId })

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        // Get rate limit info
        const rateLimitInfo = await UserRateLimiter.checkReadmeGenerationLimit(userId)

        // Get usage statistics
        const usageStats = await UserRateLimiter.getUserUsageStats(userId)


        return NextResponse.json({
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                image: user.image,
                isPremium: user.isPremium,
            },
            usageLimit: rateLimitInfo,
            usageStats
        })
    } catch (error) {
        console.error("Error fetching user data:", error)
        return NextResponse.json(
            { error: "Failed to fetch user data", details: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 },
        )
    }
}

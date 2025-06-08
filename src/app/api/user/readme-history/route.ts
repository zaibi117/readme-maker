import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { UserRateLimiter } from "@/lib/user-rate-limiter"

export async function GET(req: NextRequest) {
    try {
        // Check user authentication
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 })
        }

        // Get query parameters
        const { searchParams } = new URL(req.url)
        const page = Number.parseInt(searchParams.get("page") || "1", 10)
        const limit = Number.parseInt(searchParams.get("limit") || "10", 10)

        // Validate parameters
        if (page < 1 || limit < 1 || limit > 100) {
            return NextResponse.json({ error: "Invalid pagination parameters" }, { status: 400 })
        }

        // Get user's README history
        const history = await UserRateLimiter.getUserReadmeHistory(session.user.id, page, limit)

        return NextResponse.json(history)
    } catch (error) {
        console.error("Error fetching README history:", error)
        return NextResponse.json(
            { error: "Failed to fetch README history", details: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 },
        )
    }
}

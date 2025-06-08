// @ts-nocheck
import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectToDatabase from "@/lib/mongodb"
import Readme from "@/models/readme"
import User from "@/models/user"
import mongoose from "mongoose"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        // Check user authentication
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 })
        }

        // Connect to database
        await connectToDatabase()

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(params.id)) {
            return NextResponse.json({ error: "Invalid README ID" }, { status: 400 })
        }
        const userId = session.user.id

        const user = await User.findOne({ githubId: userId })

        // Find the README and verify ownership
        const readme = await Readme.findOne({
            _id: params.id,
            userId: user._id,
        })

        if (!readme) {
            return NextResponse.json({ error: "README not found" }, { status: 404 })
        }

        return NextResponse.json({
            readme: {
                id: readme._id,
                owner: readme.owner,
                repo: readme.repo,
                content: readme.readmeContent,
                generatedAt: readme.generatedAt,
                generationType: readme.generationType,
                processingTime: readme.processingTime,
                chunkCount: readme.chunkCount,
                source: readme.source,
            },
        })
    } catch (error) {
        console.error("Error fetching README:", error)
        return NextResponse.json(
            { error: "Failed to fetch README", details: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 },
        )
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        // Check user authentication
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 })
        }

        // Connect to database
        await connectToDatabase()

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(params.id)) {
            return NextResponse.json({ error: "Invalid README ID" }, { status: 400 })
        }

        const user = await User.findOne({ githubId: session.user.id })

        // Find and delete the README (verify ownership)
        const readme = await Readme.findOneAndDelete({
            _id: params.id,
            userId: user._id,
        })

        if (!readme) {
            return NextResponse.json({ error: "README not found" }, { status: 404 })
        }

        // Remove the reference from the user's readmeGenerations array
        const UserModel = (await import("@/models/user")).default
        await UserModel.findByIdAndUpdate(user._id, {
            $pull: { readmeGenerations: params.id },
        })

        return NextResponse.json({ message: "README deleted successfully" })
    } catch (error) {
        console.error("Error deleting README:", error)
        return NextResponse.json(
            { error: "Failed to delete README", details: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 },
        )
    }
}

import { type NextRequest, NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongodb"
import ReadmeModel from "@/models/readme"
import { GitHubService } from "@/services/github-service"

export async function GET(req: NextRequest) {
    try {
        // Get query parameters
        const url = new URL(req.url)
        const owner = url.searchParams.get("owner")
        const repo = url.searchParams.get("repo")
        const accessToken = url.searchParams.get("accessToken") || undefined

        if (!owner || !repo) {
            return NextResponse.json({ error: "Missing owner or repo parameters" }, { status: 400 })
        }

        // Connect to MongoDB
        await connectToDatabase()

        // Create a unique repo ID
        const repoId = `${owner}/${repo}`.toLowerCase()

        // Check if we have a generated README in the database
        const generatedReadme = await ReadmeModel.findOne({
            repoId,
            source: "generated",
        }).sort({ generatedAt: -1 }) // Get the most recent one

        // Check if the repository has an original README
        const githubService = new GitHubService(accessToken)
        const { content: originalReadmeContent, exists: originalReadmeExists } = await githubService.fetchReadmeFile(
            owner,
            repo,
        )

        // Return both the generated and original READMEs
        return NextResponse.json({
            generatedReadme: generatedReadme
                ? {
                    content: generatedReadme.readmeContent,
                    generatedAt: generatedReadme.generatedAt,
                }
                : null,
            originalReadme: originalReadmeExists
                ? {
                    content: originalReadmeContent,
                    exists: true,
                }
                : { content: "", exists: false },
        })
    } catch (error) {
        console.error("Error fetching README:", error)
        return NextResponse.json(
            { error: "Failed to fetch README", details: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 },
        )
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { owner, repo, readmeContent, accessToken } = body

        if (!owner || !repo || !readmeContent) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        // Connect to MongoDB
        await connectToDatabase()

        // Create a unique repo ID
        const repoId = `${owner}/${repo}`.toLowerCase()

        // Check if the repo ID already exists
        const existingReadme = await ReadmeModel.findOne({ repoId })
        if (existingReadme) {
            // Update the existing document
            const updatedReadme = await ReadmeModel.findOneAndUpdate(
                { repoId },
                {
                    $set: {
                        readmeContent,
                        source: "generated",
                    },
                },
                { new: true },
            )
            return NextResponse.json({
                success: true,
                readme: {
                    id: updatedReadme._id,
                    content: updatedReadme.readmeContent,
                    generatedAt: updatedReadme.generatedAt,
                },
            })
        } else {
            // Create a new document
            const newReadme = await ReadmeModel.create({
                repoId,
                owner,
                repo,
                readmeContent,
                source: "generated",
            })

            return NextResponse.json({
                success: true,
                readme: {
                    id: newReadme._id,
                    content: newReadme.readmeContent,
                    generatedAt: newReadme.generatedAt,
                },
            })
        }


    } catch (error) {
        console.error("Error saving README:", error)
        return NextResponse.json(
            { error: "Failed to save README", details: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 },
        )
    }
}

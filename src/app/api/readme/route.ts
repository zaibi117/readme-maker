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
        // @ts-ignore
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
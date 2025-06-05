import { type NextRequest, NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongodb"
import SummaryCacheModel from "@/models/summary-cache"
import type { ChunkedFile } from "@/types/repository"

interface SaveSummariesRequest {
  owner: string
  repo: string
  summaries: ChunkedFile[]
  stats: {
    total: number
    successful: number
    skipped: number
  }
}

export async function GET(req: NextRequest) {
  try {
    // Get query parameters
    const url = new URL(req.url)
    const owner = url.searchParams.get("owner")
    const repo = url.searchParams.get("repo")

    if (!owner || !repo) {
      return NextResponse.json({ error: "Missing owner or repo parameters" }, { status: 400 })
    }

    // Connect to MongoDB
    await connectToDatabase()

    // Create a unique repo ID
    const repoId = `${owner}/${repo}`.toLowerCase()

    // Check if we have cached summaries
    const cachedSummaries = await SummaryCacheModel.findOne({ repoId }).sort({ updatedAt: -1 })

    if (!cachedSummaries) {
      return NextResponse.json({ cached: false, summaries: null })
    }

    // Convert to the format expected by the frontend
    const formattedSummaries: ChunkedFile[] = cachedSummaries.summaries.map((summary) => ({
      file: summary.file,
      chunk: summary.chunk,
      content: summary.content,
      summary: summary.summary,
    }))

    return NextResponse.json({
      cached: true,
      summaries: formattedSummaries,
      metadata: {
        createdAt: cachedSummaries.createdAt,
        updatedAt: cachedSummaries.updatedAt,
        totalChunks: cachedSummaries.totalChunks,
        successfulChunks: cachedSummaries.successfulChunks,
        skippedChunks: cachedSummaries.skippedChunks,
      },
    })
  } catch (error) {
    console.error("Error fetching cached summaries:", error)
    return NextResponse.json(
      { error: "Failed to fetch cached summaries", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: SaveSummariesRequest = await req.json()
    const { owner, repo, summaries, stats } = body

    if (!owner || !repo || !summaries || !Array.isArray(summaries)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Connect to MongoDB
    await connectToDatabase()

    // Create a unique repo ID
    const repoId = `${owner}/${repo}`.toLowerCase()

    // Prepare summaries data
    const summariesData = summaries.map((summary) => ({
      file: summary.file,
      chunk: summary.chunk,
      content: summary.content,
      summary: summary.summary || "",
    }))

    // Save or update the cached summaries
    const cachedSummaries = await SummaryCacheModel.findOneAndUpdate(
      { repoId },
      {
        owner,
        repo,
        summaries: summariesData,
        totalChunks: stats.total,
        successfulChunks: stats.successful,
        skippedChunks: stats.skipped,
        updatedAt: new Date(),
      },
      { upsert: true, new: true },
    )

    return NextResponse.json({
      success: true,
      cached: true,
      metadata: {
        id: cachedSummaries._id,
        createdAt: cachedSummaries.createdAt,
        updatedAt: cachedSummaries.updatedAt,
        totalChunks: cachedSummaries.totalChunks,
        successfulChunks: cachedSummaries.successfulChunks,
        skippedChunks: cachedSummaries.skippedChunks,
      },
    })
  } catch (error) {
    console.error("Error saving cached summaries:", error)
    return NextResponse.json(
      { error: "Failed to save cached summaries", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Get query parameters
    const url = new URL(req.url)
    const owner = url.searchParams.get("owner")
    const repo = url.searchParams.get("repo")

    if (!owner || !repo) {
      return NextResponse.json({ error: "Missing owner or repo parameters" }, { status: 400 })
    }

    // Connect to MongoDB
    await connectToDatabase()

    // Create a unique repo ID
    const repoId = `${owner}/${repo}`.toLowerCase()

    // Delete the cached summaries
    await SummaryCacheModel.deleteOne({ repoId })

    return NextResponse.json({ success: true, message: "Cached summaries deleted" })
  } catch (error) {
    console.error("Error deleting cached summaries:", error)
    return NextResponse.json(
      { error: "Failed to delete cached summaries", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

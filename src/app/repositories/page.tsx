"use client"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Star, GitFork, ExternalLink, FileText, Github } from "lucide-react"
import Link from "next/link"

interface Repository {
  id: number
  name: string
  full_name: string
  description: string | null
  language: string | null
  stargazers_count: number
  forks_count: number
  html_url: string
  private: boolean
  updated_at: string
}

export default function RepositoriesPage() {
  const { data: session, status } = useSession()
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  console.log(useSession())
  useEffect(() => {
    console.log(session)
    // @ts-ignore
    if (status === "authenticated" && session?.user?.accessToken) {
      fetchRepositories()
    } else if (status === "unauthenticated") {
      setError("Please sign in to view your repositories")
      setLoading(false)
    }
  }, [session, status])

  const fetchRepositories = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("https://api.github.com/user/repos?sort=updated&per_page=50", {
        headers: {
          // @ts-ignore
          Authorization: `Bearer ${session?.user?.accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch repositories: ${response.statusText}`)
      }

      const data = await response.json()
      setRepositories(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch repositories")
    } finally {
      setLoading(false)
    }
  }


  if (loading) {
    return <LoadingSkeleton />
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert className="max-w-2xl mx-auto">
          <AlertDescription className="flex items-center gap-2">
            <Github className="h-4 w-4" />
            {error}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (repositories.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Repositories</h1>
        <p className="text-gray-600">Manage and generate README files for your {repositories.length} repositories</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {repositories.map((repo) => (
          <RepositoryCard key={repo.id} repository={repo} />
        ))}
      </div>
    </div>
  )
}

function RepositoryCard({
  repository
}: {
  repository: Repository,
}) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }
  const [reponame, username] = repository.html_url.split('/').reverse();
  console.log("username:", username, "reponame:", reponame)
  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-gray-900 truncate">{repository.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              {repository.private && (
                <Badge variant="secondary" className="text-xs">
                  Private
                </Badge>
              )}
              <span className="text-xs text-gray-500">Updated {formatDate(repository.updated_at)}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <a href={repository.html_url} target="_blank" rel="noopener noreferrer" className="p-1">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>

        <CardDescription className="text-sm text-gray-600 line-clamp-2 min-h-[2.5rem]">
          {repository.description || "No description available"}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-between pt-0">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              {repository.language && (
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-gray-700">{repository.language}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4" />
              <span>{repository.stargazers_count.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <GitFork className="h-4 w-4" />
              <span>{repository.forks_count.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <Button asChild className="w-full mt-4" variant="outline">
          <Link href={`/repositories/${encodeURIComponent(`${username}/${reponame}`)}`}>
            <FileText className="h-4 w-4 mr-2" />
            Generate README
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function LoadingSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-8 w-8" />
              </div>
              <Skeleton className="h-4 w-full mt-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center max-w-md mx-auto">
        <div className="mb-6">
          <Github className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">No repositories found</h2>
          <p className="text-gray-600">
            {"You don't have any repositories yet. Create your first repository on GitHub to get started."}
          </p>
        </div>

        <Button asChild>
          <a
            href="https://github.com/new"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2"
          >
            <Github className="h-4 w-4" />
            Create Repository
          </a>
        </Button>
      </div>
    </div>
  )
}

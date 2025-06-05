"use client"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Star, GitFork, ExternalLink, FileText, Github, ChevronLeft, ChevronRight, Search, X } from "lucide-react"
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

const REPOS_PER_PAGE = 20

export default function RepositoriesPage() {
  const { data: session, status } = useSession()
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [allRepositories, setAllRepositories] = useState<Repository[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredRepositories, setFilteredRepositories] = useState<Repository[]>([])
  
  console.log(useSession())
  
  useEffect(() => {
    console.log(session)
    // @ts-ignore
    if (status === "authenticated" && session?.user?.accessToken) {
      fetchAllRepositories()
    } else if (status === "unauthenticated") {
      setError("Please sign in to view your repositories")
      setLoading(false)
    }
  }, [session, status])

  // Filter repositories based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRepositories(allRepositories)
    } else {
      const filtered = allRepositories.filter(repo =>
        repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (repo.language && repo.language.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      setFilteredRepositories(filtered)
    }
    setCurrentPage(1) // Reset to first page when searching
  }, [searchQuery, allRepositories])

  // Paginate filtered repositories
  useEffect(() => {
    const startIndex = (currentPage - 1) * REPOS_PER_PAGE
    const endIndex = startIndex + REPOS_PER_PAGE
    setRepositories(filteredRepositories.slice(startIndex, endIndex))
  }, [filteredRepositories, currentPage])

  const fetchAllRepositories = async () => {
    try {
      setLoading(true)
      setError(null)
      
      let allRepos: Repository[] = []
      let page = 1
      let hasMore = true

      // Fetch all repositories by paginating through GitHub API
      while (hasMore) {
        const response = await fetch(`https://api.github.com/user/repos?sort=updated&per_page=100&page=${page}`, {
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
        allRepos = [...allRepos, ...data]
        
        // If we got less than 100 results, we've reached the end
        hasMore = data.length === 100
        page++
      }

      setAllRepositories(allRepos)
      setFilteredRepositories(allRepos)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch repositories")
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (page: number) => {
    const totalPages = Math.ceil(filteredRepositories.length / REPOS_PER_PAGE)
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const clearSearch = () => {
    setSearchQuery("")
  }

  if (loading && allRepositories.length === 0) {
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

  if (allRepositories.length === 0 && !loading) {
    return <EmptyState />
  }

  const totalPages = Math.ceil(filteredRepositories.length / REPOS_PER_PAGE)
  const startIndex = (currentPage - 1) * REPOS_PER_PAGE + 1
  const endIndex = Math.min(startIndex + repositories.length - 1, filteredRepositories.length)
  const hasNextPage = currentPage < totalPages
  const hasPrevPage = currentPage > 1

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Repositories</h1>
        <p className="text-gray-600 mb-6">
          Manage and generate README files for your repositories
          {filteredRepositories.length > 0 && (
            <span className="ml-2 text-sm">
              ({filteredRepositories.length} {filteredRepositories.length === 1 ? 'repository' : 'repositories'} total)
            </span>
          )}
        </p>
        
        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {searchQuery && (
          <p className="text-sm text-gray-500 mt-2">
            {filteredRepositories.length === 0 
              ? `No repositories found matching "${searchQuery}"`
              : `Found ${filteredRepositories.length} ${filteredRepositories.length === 1 ? 'repository' : 'repositories'} matching "${searchQuery}"`
            }
          </p>
        )}
        
        {repositories.length > 0 && (
          <p className="text-sm text-gray-500 mt-2">
            Showing {startIndex}-{endIndex} of {filteredRepositories.length} repositories
          </p>
        )}
      </div>

      {loading && allRepositories.length > 0 && (
        <div className="mb-4">
          <Skeleton className="h-4 w-32" />
        </div>
      )}

      {filteredRepositories.length === 0 && searchQuery && !loading ? (
        <div className="text-center py-16">
          <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No repositories found</h2>
          <p className="text-gray-600 mb-4">
            No repositories match your search "{searchQuery}". Try a different search term.
          </p>
          <Button variant="outline" onClick={clearSearch}>
            <X className="h-4 w-4 mr-2" />
            Clear search
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {repositories.map((repo) => (
              <RepositoryCard key={repo.id} repository={repo} />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <Button
                variant="outline"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!hasPrevPage || loading}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
              </div>
              
              <Button
                variant="outline"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!hasNextPage || loading}
                className="flex items-center gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
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
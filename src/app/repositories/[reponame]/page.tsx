"use client"
import { useParams } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import { RepositoryProcessor } from "@/components/repository-processor"
import { useSession } from "next-auth/react"
import { Navbar } from "@/components/navbar"
import { Breadcrumb, breadcrumbConfigs } from "@/components/breadcrumb"

export default function RepositoryPage() {
  const { data: session } = useSession()
  const params = useParams()
  const reponame = params.reponame as string
  if (!session) {
    return null // Will redirect to login
  }

  // Parse owner/repo from the dynamic route
  const [owner, repo] = reponame ? reponame.split("%2F") || reponame.split("/") : ["", ""]

  if (!owner || !repo) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto px-4 py-8">

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Invalid repository format. Expected format: owner/repository</AlertDescription>
          </Alert>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Breadcrumb items={breadcrumbConfigs.repositoryDetail(owner, repo)} className="mb-6" />

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Repository Analysis: {owner}/{repo}
          </h1>
          <p className="text-muted-foreground">Processing repository and generating README documentation</p>
        </div>

        <RepositoryProcessor owner={owner} repo={repo} />
      </div>
    </>
  )
}


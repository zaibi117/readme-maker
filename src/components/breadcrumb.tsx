"use client"

import type React from "react"

import Link from "next/link"
import { ChevronRight, Home, Github, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
  current?: boolean
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn("flex items-center space-x-1 text-sm text-muted-foreground", className)} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && <ChevronRight className="h-4 w-4 mx-1 flex-shrink-0" />}

            {item.current ? (
              <span className="flex items-center gap-1 text-foreground font-medium">
                {item.icon}
                {item.label}
              </span>
            ) : item.href ? (
              <Link href={item.href} className="flex items-center gap-1 hover:text-foreground transition-colors">
                {item.icon}
                {item.label}
              </Link>
            ) : (
              <span className="flex items-center gap-1">
                {item.icon}
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

// Predefined breadcrumb configurations
export const breadcrumbConfigs = {
  repositories: [
    {
      label: "Home",
      href: "/",
      icon: <Home className="h-4 w-4" />,
    },
    {
      label: "Repositories",
      current: true,
      icon: <Github className="h-4 w-4" />,
    },
  ],

  repositoryDetail: (owner: string, repo: string) => [
    {
      label: "Home",
      href: "/",
      icon: <Home className="h-4 w-4" />,
    },
    {
      label: "Repositories",
      href: "/repositories",
      icon: <Github className="h-4 w-4" />,
    },
    {
      label: `${owner}/${repo}`,
      current: true,
      icon: <FileText className="h-4 w-4" />,
    },
  ],
}

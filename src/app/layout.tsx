import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { SessionProvider } from "@/components/session-provider"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "README Generator - Create Stunning GitHub Documentation",
  description:
    "Automatically generate professional README files for your GitHub projects using AI. Fast, accurate, and completely free.",
  keywords: ["README", "GitHub", "documentation", "AI", "generator", "markdown"],
  authors: [{ name: "Zohaib Saeed" }],
  openGraph: {
    title: "README Generator - Create Stunning GitHub Documentation",
    description: "Automatically generate professional README files for your GitHub projects using AI.",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <SessionProvider>
            {children}
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Github, FileText, Zap, Settings, Eye, ArrowRight, Moon, Sun, Menu, X } from "lucide-react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function HomePage() {
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const { data: session } = useSession()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  function handleGetStarted() {

    if (session) {
      router.push("/repositories")
    } else {
      signIn("github")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Navigation */}
      <nav className="relative z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-white">README Generator</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link
                href="#features"
                className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Features
              </Link>
              <Link
                href="#how-it-works"
                className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                How It Works
              </Link>
              <Link
                href="#about"
                className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                About
              </Link>

              {/* Theme Toggle */}
              {/* <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="w-9 h-9 p-0"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button> */}

              {/* CTA Button */}
              <Button
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <Github className="w-4 h-4 mr-2" />
                {session ? "Go to Dashboard" : "Login with GitHub"}
              </Button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="w-9 h-9 p-0"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
            <div className="px-4 py-4 space-y-4">
              <Link
                href="#features"
                className="block text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Features
              </Link>
              <Link
                href="#how-it-works"
                className="block text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                How It Works
              </Link>
              <Link
                href="#about"
                className="block text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                About
              </Link>
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                {/* <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="w-9 h-9 p-0"
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button> */}
                <Button
                  onClick={handleGetStarted}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg"
                >
                  <Github className="w-4 h-4 mr-2" />
                  {session ? "Dashboard" : "Login"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <div className="text-center">
            {/* Badge */}
            <Badge
              variant="secondary"
              className="mb-8 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700"
            >
              <Zap className="w-3 h-3 mr-1" />
              AI-Powered README Generation
            </Badge>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
              Create Stunning{" "}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                README Files
              </span>
              <br />
              for Your GitHub Projects
            </h1>

            {/* Subheading */}
            <p className="text-xl text-slate-600 dark:text-slate-300 mb-10 max-w-3xl mx-auto leading-relaxed">
              Automatically generate professional README files in seconds using AI. Analyze your code, understand your
              project, and create comprehensive documentation effortlessly.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Button
                onClick={handleGetStarted}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <Github className="w-5 h-5 mr-2" />
                {session ? "Go to Dashboard" : "Login with GitHub"}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>

              {/* <Button
                variant="outline"
                size="lg"
                className="px-8 py-4 rounded-xl text-lg font-semibold border-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300"
              >
                <Eye className="w-5 h-5 mr-2" />
                View Demo
              </Button> */}
            </div>

            {/* Hero Illustration */}
            <div className="relative max-w-4xl mx-auto">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="bg-slate-100 dark:bg-slate-700 px-6 py-4 border-b border-slate-200 dark:border-slate-600">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    <div className="ml-4 text-sm text-slate-600 dark:text-slate-300 font-mono">README.md</div>
                  </div>
                </div>
                <div className="p-8 text-left">
                  <div className="space-y-4 text-sm font-mono">
                    <div className="text-blue-600 dark:text-blue-400"># My Awesome Project</div>
                    <div className="text-slate-600 dark:text-slate-300">
                      A comprehensive description of your project automatically generated from your code.
                    </div>
                    <div className="text-green-600 dark:text-green-400">## Features</div>
                    <div className="text-slate-600 dark:text-slate-300">
                      - ✅ Automatic code analysis
                      <br />- ⚡ Lightning-fast generation
                      <br />- 🛠️ Customizable templates
                    </div>
                    <div className="text-purple-600 dark:text-purple-400">## Installation</div>
                    <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded text-slate-700 dark:text-slate-300">
                      npm install my-awesome-project
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-20 h-20 bg-blue-200 dark:bg-blue-800 rounded-full opacity-20 animate-pulse"></div>
          <div className="absolute top-40 right-20 w-32 h-32 bg-indigo-200 dark:bg-indigo-800 rounded-full opacity-20 animate-pulse delay-1000"></div>
          <div className="absolute bottom-20 left-20 w-16 h-16 bg-purple-200 dark:bg-purple-800 rounded-full opacity-20 animate-pulse delay-2000"></div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-white dark:bg-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">How It Works</h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Generate professional README files in just three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center group">
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-110">
                  <Github className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  1
                </div>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Login with GitHub</h3>
              <p className="text-slate-600 dark:text-slate-300">
                Connect your GitHub account securely to access your repositories
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center group">
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-110">
                  <Settings className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  2
                </div>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Select Your Repository</h3>
              <p className="text-slate-600 dark:text-slate-300">
                Choose the repository you want to generate a README for
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center group">
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-110">
                  <FileText className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  3
                </div>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Generate README File</h3>
              <p className="text-slate-600 dark:text-slate-300">
                AI analyzes your code and creates a comprehensive README instantly
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">Powerful Features</h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Everything you need to create professional documentation for your projects
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <Card className="group hover:shadow-lg transition-all duration-300 transform hover:-translate-y-2 border-0 shadow-md">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Github className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Easy GitHub Integration</h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm">
                  Seamlessly connect with your GitHub repositories and access all your projects
                </p>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="group hover:shadow-lg transition-all duration-300 transform hover:-translate-y-2 border-0 shadow-md">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Instant Generation</h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm">
                  Generate comprehensive README files in seconds using advanced AI technology
                </p>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="group hover:shadow-lg transition-all duration-300 transform hover:-translate-y-2 border-0 shadow-md">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Smart Analysis</h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm">
                  AI analyzes your code structure and dependencies to create accurate documentation
                </p>
              </CardContent>
            </Card>

            {/* Feature 4 */}
            <Card className="group hover:shadow-lg transition-all duration-300 transform hover:-translate-y-2 border-0 shadow-md">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Eye className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Live Preview</h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm">
                  Preview your README in real-time with our built-in Markdown renderer
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">Ready to Create Amazing READMEs?</h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Join thousands of developers who are already using our AI-powered README generator
          </p>
          <Button
            onClick={handleGetStarted}
            size="lg"
            className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <Github className="w-5 h-5 mr-2" />
            {session ? "Go to Dashboard" : "Get Started for Free"}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer id="about" className="bg-slate-900 dark:bg-slate-950 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">README Generator</span>
              </div>
              <p className="text-slate-400 mb-6 max-w-md">
                Create professional README files for your GitHub projects using AI. Fast, accurate, and completely free.
              </p>
              <div className="flex items-center space-x-1 text-slate-400">
                <span>Built with</span>
                <span className="text-red-400 mx-1">❤️</span>
                <span>by</span>
                <span className="text-blue-400 font-semibold ml-1">Zohaib Saeed</span>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <Link href="#features" className="hover:text-white transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#how-it-works" className="hover:text-white transition-colors">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link href="/repositories" className="hover:text-white transition-colors">
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="font-semibold mb-4">Connect</h3>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <a href="https://github.com/zohaibsaeed117" className="hover:text-white transition-colors flex items-center">
                    <Github className="w-4 h-4 mr-2" />
                    GitHub
                  </a>
                </li>
                <li>
                  <a href="https://www.linkedin.com/in/zohaibsaeed117" className="hover:text-white transition-colors flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-2">
                      <path d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5v-14c0-2.76-2.24-5-5-5zm-11 19h-3v-9h3v9zm-1.5-10.29c-.97 0-1.75-.79-1.75-1.76s.78-1.76 1.75-1.76 1.75.79 1.75 1.76-.78 1.76-1.75 1.76zm13.5 10.29h-3v-4.5c0-1.1-.9-2-2-2s-2 .9-2 2v4.5h-3v-9h3v1.29c.9-1.18 2.24-1.92 3.76-1.92 2.76 0 5 2.24 5 5v4.63z" />
                    </svg>
                    LinkedIn
                  </a>
                </li>
                <li>
                  <a href="https://www.instagram.com/itz_zaibi_17" className="hover:text-white transition-colors flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-2">
                      <path d="M12 0c-3.204 0-3.584.012-4.849.07-1.259.058-2.13.26-2.871.551-.742.292-1.374.687-1.998 1.31-.624.624-1.018 1.256-1.311 1.998-.292.742-.493 1.612-.551 2.871-.058 1.265-.07 1.645-.07 4.849s.012 3.584.07 4.849c.058 1.259.26 2.13.551 2.871.292.742.687 1.374 1.311 1.998.624.624 1.256 1.018 1.998 1.311.742.292 1.612.493 2.871.551 1.265.058 1.645.07 4.849.07s3.584-.012 4.849-.07c1.259-.058 2.13-.26 2.871-.551.742-.292 1.374-.687 1.998-1.311.624-.624 1.018-1.256 1.311-1.998.292-.742.493-1.612.551-2.871.058-1.265.07-1.645.07-4.849s-.012-3.584-.07-4.849c-.058-1.259-.26-2.13-.551-2.871-.292-.742-.687-1.374-1.311-1.998-.624-.624-1.256-1.018-1.998-1.311-.742-.292-1.612-.493-2.871-.551-1.265-.058-1.645-.07-4.849-.07zm0 2c3.131 0 3.484.011 4.716.069 1.141.053 1.725.24 2.124.387.527.192.902.421 1.301.82.399.399.628.774.82 1.301.147.399.334.983.387 2.124.058 1.232.069 1.585.069 4.716s-.011 3.484-.069 4.716c-.053 1.141-.24 1.725-.387 2.124-.192.527-.421.902-.82 1.301-.399.399-.774.628-1.301.82-.399.147-.983.334-2.124.387-1.232.058-1.585.069-4.716.069s-3.484-.011-4.716-.069c-1.141-.053-1.725-.24-2.124-.387-.527-.192-.902-.421-1.301-.82-.399-.399-.628-.774-.82-1.301-.147-.399-.334-.983-.387-2.124-.058-1.232-.069-1.585-.069-4.716s.011-3.484.069-4.716c.053-1.141.24-1.725.387-2.124.192-.527.421-.902.82-1.301.399-.399.774-.628 1.301-.82.399-.147.983-.334 2.124-.387 1.232-.058 1.585-.069 4.716-.069zm0 5.839c-3.389 0-6.161 2.772-6.161 6.161s2.772 6.161 6.161 6.161 6.161-2.772 6.161-6.161-2.772-6.161-6.161-6.161zm0 10.322c-2.298 0-4.161-1.863-4.161-4.161s1.863-4.161 4.161-4.161 4.161 1.863 4.161 4.161-1.863 4.161-4.161 4.161zm6.406-11.845c-.796 0-1.441.645-1.441 1.441s.645 1.441 1.441 1.441 1.441-.645 1.441-1.441-.645-1.441-1.441-1.441z" />
                    </svg>
                    Instagram
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-12 pt-8 text-center text-slate-400">
            <p>&copy; {new Date().getFullYear()} README Generator. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

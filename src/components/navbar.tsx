"use client"
import React, { useEffect } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { GithubIcon, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
const Navbar = () => {
    const { data: session, status } = useSession()
    const router = useRouter()

    useEffect(() => {
        if (status === 'loading') return // Still loading
        if (!session) router.push('/login') // Not signed in
    }, [session, status, router])

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
            </div>
        )
    }

    if (!session) {
        return null // Will redirect to login
    }

    const handleSignOut = async () => {
        await signOut({ callbackUrl: '/login' })
    }
    return (
        <nav className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600">
                            Welcome, {session.user?.name}
                        </span>
                        <Link
                            href="/repositories"
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-gray-700 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                        >
                            <GithubIcon className="h-4 w-4 mr-2" />
                            Repository
                        </Link>
                        <button
                            onClick={handleSignOut}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                        >
                            <LogOut className="h-4 w-4 mr-2" />
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    )
}

export default Navbar

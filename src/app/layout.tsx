// app/layout.tsx
import './globals.css'
import { Inter } from 'next/font/google'
import NextAuthSessionProvider from '@/components/session-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'GitHub OAuth App',
  description: 'Next.js app with GitHub OAuth authentication',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NextAuthSessionProvider>
          {children}
        </NextAuthSessionProvider>
      </body>
    </html>
  )
}
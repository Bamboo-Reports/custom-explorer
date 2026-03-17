import type { Metadata } from 'next'
import { IBM_Plex_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-main',
})

export const metadata: Metadata = {
  title: 'Bamboo Reports',
  description: 'Secure internal workspace for account access, company records, and report viewing.',
  icons: {
    icon: '/logo.svg',
    apple: '/logo.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${ibmPlexSans.variable} bg-background font-sans text-foreground antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}

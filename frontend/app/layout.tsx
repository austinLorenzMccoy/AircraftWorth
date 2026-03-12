import React from "react"
import type { Metadata, Viewport } from 'next'
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const spaceGrotesk = Space_Grotesk({ 
  subsets: ["latin"],
  variable: '--font-space-grotesk'
});

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter'
});

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"],
  variable: '--font-jetbrains-mono'
});

export const metadata: Metadata = {
  title: 'AircraftWorth | Verifiable Intelligence. Tokenized Potential.',
  description: 'AI-powered agent network that discovers, evaluates, and tokenizes human skills and cognitive contributions using autonomous agents on Hedera.',
  generator: 'v0.app',
  keywords: ['AI', 'Hedera', 'blockchain', 'knowledge marketplace', 'tokenization', 'agents', 'AircraftWorth'],
  icons: {
    icon: [
      {
        url: '/AircraftWorth-Icon.png',
        type: 'image/png',
      },
      {
        url: '/AircraftWorth-Icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/AircraftWorth-Icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0B0E11' }
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}

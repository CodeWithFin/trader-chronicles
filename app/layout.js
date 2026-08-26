import './globals.css'
import { Inter, Space_Grotesk } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  weight: ['500', '600'],
  variable: '--font-space-grotesk',
})

export const metadata = {
  title: 'Trader Chronicles - Trade Journal',
  description: 'Log your trades, track performance, and analyze your trading activity',
  manifest: '/manifest.json',
  icons: {
    icon: '/tagged.png',
    apple: '/tagged.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}

import './globals.css'
import { JetBrains_Mono } from 'next/font/google'

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
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
    <html lang="en" className={jetbrainsMono.variable}>
      <body className="font-mono">{children}</body>
    </html>
  )
}


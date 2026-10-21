import './globals.css'
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/600.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'

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
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}

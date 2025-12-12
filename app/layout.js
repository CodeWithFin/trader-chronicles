import './globals.css'

export const metadata = {
  title: 'Trader Chronicles - Trade Journal',
  description: 'Log your trades, track performance, and analyze your trading activity',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}


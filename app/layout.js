import './globals.css'

export const metadata = {
  title: 'Trader Chronicles - Backtesting Strategy Log',
  description: 'Track, analyze, and fine-tune your trading strategies',
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


/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/traders', destination: '/leaderboard', permanent: true },
      { source: '/traders/:id', destination: '/leaderboard/:id', permanent: true },
      { source: '/api/traders', destination: '/api/leaderboard', permanent: false },
      { source: '/api/traders/:id', destination: '/api/leaderboard/:id', permanent: false },
    ]
  },
  reactStrictMode: true,
  swcMinify: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ik.imagekit.io',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow importing .js files from lib/ (CommonJS modules)
  transpilePackages: [],

  // Disable strict mode for easier development
  reactStrictMode: true,

  // Strip console.log in production (keep error/warn)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },

  // Redirect root to index.html
  async redirects() {
    return [
      {
        source: '/',
        destination: '/index.html',
        permanent: false
      }
    ];
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;

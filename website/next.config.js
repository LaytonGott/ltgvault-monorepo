/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow importing .js files from lib/ (CommonJS modules)
  transpilePackages: [],

  // Disable strict mode for easier development
  reactStrictMode: true,

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

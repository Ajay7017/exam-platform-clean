/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'header', key: 'x-forwarded-proto', value: 'http' }],
        destination: 'https://mockzy.co.in/:path*',
        permanent: true,
      },
    ]
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'http', hostname: 'localhost' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  reactStrictMode: true,
  swcMinify: true,
  compress: true,

  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      canvas: false,
    };

    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'ketcher-standalone': false,
        'ketcher-react': false,
        'ketcher-core': false,
        'paper': false,
      };
    }

    return config;
  },
};

export default nextConfig;
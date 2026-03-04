/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
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
      // Stub out ketcher entirely on server builds —
      // prevents paper → canvas → jsdom from being resolved
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
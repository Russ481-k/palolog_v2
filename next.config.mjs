import withPWAInit from '@ducanh2912/next-pwa';

await import('./src/env.mjs');

const withPWA = withPWAInit({
  dest: 'public',
  cacheStartUrl: false,
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import("next").NextConfig} */
const config = withPWA({
  images: {
    remotePatterns: [
      {
        hostname: 'raw.githubusercontent.com',
        pathname: '/BearStudio/**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/storybook',
        destination: '/storybook/index.html',
        permanent: true,
      },
    ];
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.js$/,
      include: /node_modules\/undici/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env'],
        },
      },
    });
    return config;
  },
  output: 'standalone',
  trailingSlash: false,
  pageExtensions: ['tsx', 'ts'],
  swcMinify: true,
  poweredByHeader: false,
  rewrites: async () => {
    return [
      {
        source: '/api/ws/download',
        destination: `http://${process.env.NEXT_PUBLIC_WS_HOST || 'localhost'}:${process.env.NEXT_PUBLIC_WS_PORT || '3001'}/api/ws/download`,
      },
      {
        source: '/socket.io/:path*',
        destination: `http://${process.env.NEXT_PUBLIC_WS_HOST || 'localhost'}:${process.env.NEXT_PUBLIC_WS_PORT || '3001'}/socket.io/:path*`,
      },
    ];
  },
});

export default config;

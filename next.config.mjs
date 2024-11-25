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
    // `undici` 모듈을 Babel로 처리
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
});

export default config;

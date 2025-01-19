module.exports = {
  apps: [
    {
      name: 'palolog-next',
      script: 'pnpm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'palolog-ws',
      script: 'pnpm',
      args: 'start:ws',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};

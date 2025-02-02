module.exports = {
  apps: [
    {
      name: 'entasys-next',
      script: 'pnpm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'entasys-ws',
      script: 'pnpm',
      args: 'start:ws',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};

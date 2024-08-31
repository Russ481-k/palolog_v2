module.exports = {
  apps: [
    {
      name: 'palolog',
      script: 'pnpm start',
      instances: 0,
      exec_mode: 'cluster',
    },
  ],
};

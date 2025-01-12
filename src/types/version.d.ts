declare module '@/config/version.json' {
  interface VersionConfig {
    version: import('@/features/monitoring/columns_').PANOSVersion;
  }
  const config: VersionConfig;
  export default config;
}

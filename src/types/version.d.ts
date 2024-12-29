declare module '@/config/version.json' {
  interface VersionConfig {
    version: import('@/features/monitoring/columns').PANOSVersion;
  }
  const config: VersionConfig;
  export default config;
}

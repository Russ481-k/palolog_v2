import fs from 'fs-extra';
import path from 'path';

import { ENV } from '@/config/environment';
import { DEFAULT_VERSION, PANOSVersion } from '@/config/versions';

export function getCurrentVersion(): PANOSVersion {
  try {
    const configPath = path.join(ENV.configPath, 'version.json');
    if (fs.existsSync(configPath)) {
      const versionConfig = fs.readJsonSync(configPath);
      return versionConfig.version;
    }
    return DEFAULT_VERSION;
  } catch (error) {
    console.warn(
      'Failed to read version config, using default version:',
      error
    );
    return DEFAULT_VERSION;
  }
}

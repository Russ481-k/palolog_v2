import { z } from 'zod';

import { env } from '@/env.mjs';

import { DEFAULT_VERSION } from './versions';

const envSchema = z.object({
  CONFIG_PATH: z.string().optional().default('./src/config'),
  LOGSTASH_PATH: z.string().optional().default('./logstash/pipeline'),
});
const parsedEnv = envSchema.parse({
  CONFIG_PATH: env.CONFIG_PATH || undefined,
  LOGSTASH_PATH: env.LOGSTASH_PATH || undefined,
});
export const ENV = {
  defaultVersion: DEFAULT_VERSION,
  configPath: parsedEnv.CONFIG_PATH,
  logstashPath: parsedEnv.LOGSTASH_PATH,
};

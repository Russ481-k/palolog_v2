/* eslint-disable no-process-env */
// @ts-check
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

const zNodeEnv = z
  .enum(['development', 'test', 'production'])
  .default('development');

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    DOWNLOAD_CHUNK_SIZE: z.string().transform((val) => parseInt(val, 10)),
    OPENSEARCH_URL: z.string().url(),
    OPENSEARCH_PORT: z.string(),
    OPENSEARCH_USERNAME: z.string(),
    OPENSEARCH_PASSWORD: z.string(),
    DATABASE_URL: z.string().url(),
    NODE_ENV: zNodeEnv,

    AUTH_SECRET: z.string(),

    EMAIL_SERVER: z.string().url(),
    LOGGER_LEVEL: z
      .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
      .default(process.env.NODE_ENV === 'production' ? 'error' : 'info'),
    LOGGER_PRETTY: z
      .enum(['true', 'false'])
      .default(process.env.NODE_ENV === 'production' ? 'false' : 'true')
      .transform((value) => value === 'true'),

    // Email Server Configuration
    X_H: z.string(),
    X_P: z.string(),
    X_K: z.string(),
    X_V: z.string(),
    X_T: z.string().transform(Number),
    X_U: z.string().regex(/^[0-9a-f]+$/i, 'Must be a hex string'),

    CONFIG_PATH: z.string().optional(),
    LOGSTASH_PATH: z.string().optional(),
    CA_CERT_PATH: z.string().default('./ca-cert.pem'),

    LICENSE_SECRET: z.string().optional(),
    LICENSE_DURATION: z.preprocess(
      (val) => (val ? Number(val) : undefined),
      z.number().optional()
    ),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_IS_DEMO: z
      .enum(['true', 'false'])
      .optional()
      .default('false')
      .transform((v) => v === 'true'),
    NEXT_PUBLIC_BASE_URL: z.string().url(),
    NEXT_PUBLIC_ENV_NAME: z
      .string()
      .optional()
      .transform(
        (value) =>
          value ??
          (process.env.NODE_ENV === 'production'
            ? process.env.NEXT_PUBLIC_ENV_NAME
            : 'LOCAL')
      ),
    NEXT_PUBLIC_ENV_COLOR_SCHEME: z
      .string()
      .optional()
      .transform(
        (value) =>
          value ??
          (process.env.NODE_ENV === 'production' ? 'success' : 'warning')
      ),
    NEXT_PUBLIC_NODE_ENV: zNodeEnv,
    NEXT_PUBLIC_DOWNLOAD_CHUNK_SIZE: z.string().default('100000'),
    NEXT_PUBLIC_WS_HOST: z.string().optional(),
    NEXT_PUBLIC_WS_PORT: z
      .string()
      .optional()
      .default('3001')
      .transform(Number),
    NEXT_PUBLIC_LICENSE_SECRET: z.string().optional(),
    NEXT_PUBLIC_LICENSE_DURATION: z.preprocess(
      (val) => (val ? Number(val) : undefined),
      z.number().optional()
    ),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DOWNLOAD_CHUNK_SIZE: process.env.DOWNLOAD_CHUNK_SIZE,
    OPENSEARCH_URL: process.env.OPENSEARCH_URL,
    OPENSEARCH_PORT: process.env.OPENSEARCH_PORT,
    OPENSEARCH_USERNAME: process.env.OPENSEARCH_USERNAME,
    OPENSEARCH_PASSWORD: process.env.OPENSEARCH_PASSWORD,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    AUTH_SECRET: process.env.AUTH_SECRET,
    EMAIL_SERVER: process.env.EMAIL_SERVER,
    LOGGER_LEVEL: process.env.LOGGER_LEVEL,
    LOGGER_PRETTY: process.env.LOGGER_PRETTY,

    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : process.env.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_ENV_COLOR_SCHEME: process.env.NEXT_PUBLIC_ENV_COLOR_SCHEME,
    NEXT_PUBLIC_ENV_NAME: process.env.NEXT_PUBLIC_ENV_NAME,
    NEXT_PUBLIC_IS_DEMO: process.env.NEXT_PUBLIC_IS_DEMO,
    NEXT_PUBLIC_NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_DOWNLOAD_CHUNK_SIZE: process.env.DOWNLOAD_CHUNK_SIZE,
    NEXT_PUBLIC_WS_HOST: process.env.NEXT_PUBLIC_WS_HOST,
    NEXT_PUBLIC_WS_PORT: process.env.NEXT_PUBLIC_WS_PORT || '3001',

    // LICENSE
    NEXT_PUBLIC_LICENSE_SECRET: process.env.NEXT_PUBLIC_LICENSE_SECRET,
    NEXT_PUBLIC_LICENSE_DURATION: process.env.NEXT_PUBLIC_LICENSE_DURATION,

    X_H: process.env.X_H,
    X_P: process.env.X_P,
    X_K: process.env.X_K,
    X_V: process.env.X_V,
    X_T: process.env.X_T,
    X_U: process.env.X_U,

    CONFIG_PATH: process.env.CONFIG_PATH,
    LOGSTASH_PATH: process.env.LOGSTASH_PATH,
    CA_CERT_PATH: process.env.CA_CERT_PATH,
    LICENSE_SECRET: process.env.LICENSE_SECRET,
    LICENSE_DURATION: process.env.LICENSE_DURATION,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});

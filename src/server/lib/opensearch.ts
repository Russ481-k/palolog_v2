import * as fs from 'fs';
import * as https from 'https';

import { env } from '@/env.mjs';

export interface OpenSearchOptions {
  path: string;
  method: string;
  body?: object;
}

export class OpenSearchClient {
  private static instance: OpenSearchClient;
  private readonly baseOptions: https.RequestOptions;

  private constructor() {
    this.baseOptions = {
      hostname: env.OPENSEARCH_URL.replace('https://', ''),
      port: Number(env.OPENSEARCH_PORT),
      headers: {
        'Content-Type': 'application/json',
        Authorization:
          'Basic ' +
          Buffer.from(
            `${env.OPENSEARCH_USERNAME}:${env.OPENSEARCH_PASSWORD}`
          ).toString('base64'),
      },
      ca: fs.readFileSync('/home/vtek/palolog_v2/ca-cert.pem'),
      rejectUnauthorized: true,
    };
  }

  public static getInstance(): OpenSearchClient {
    if (!OpenSearchClient.instance) {
      OpenSearchClient.instance = new OpenSearchClient();
    }
    return OpenSearchClient.instance;
  }

  async request<T>({ path, method, body }: OpenSearchOptions): Promise<T> {
    const options: https.RequestOptions = {
      ...this.baseOptions,
      path,
      method,
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(`OpenSearch request failed with status ${res.statusCode}: ${data}`));
              return;
            }
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse OpenSearch response: ${e}`));
          }
        });
      });

      req.on('error', (e) => reject(new Error(`OpenSearch request failed: ${e.message}`)));
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }
}

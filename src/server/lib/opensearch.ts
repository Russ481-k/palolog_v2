import * as fs from 'fs';
import * as https from 'https';

import { env } from '@/env.mjs';

export interface OpenSearchOptions {
  hostname: string;
  port: number;
  path: string;
  method: string;
  headers: {
    'Content-Type': string;
    Authorization: string;
  };
  ca: Buffer;
  rejectUnauthorized: boolean;
}

export class OpenSearchClient {
  private static instance: OpenSearchClient;
  private readonly baseOptions: Partial<OpenSearchOptions>;

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

  async request<T>(path: string, method: string, body?: object): Promise<T> {
    const options: OpenSearchOptions = {
      ...this.baseOptions,
      path,
      method,
    } as OpenSearchOptions;

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }
}

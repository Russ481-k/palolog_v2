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

  // 편의 메서드 추가
  async search<T>(index: string, body: object): Promise<T> {
    return this.request<T>({
      path: `/${index}/_search`,
      method: 'POST',
      body,
    });
  }

  async count<T>(index: string, body?: object): Promise<T> {
    return this.request<T>({
      path: `/${index}/_count`,
      method: 'POST',
      body,
    });
  }

  async scroll<T>(scrollId: string, scrollTime: string = '1m'): Promise<T> {
    return this.request<T>({
      path: '/_search/scroll',
      method: 'POST',
      body: {
        scroll: scrollTime,
        scroll_id: scrollId,
      },
    });
  }
}

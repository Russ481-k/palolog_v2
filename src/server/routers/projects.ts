import moment from 'moment-timezone';
import { z } from 'zod';

import { env } from '@/env.mjs';
import { zLogs, zPaloLogs } from '@/features/monitoring/schemas';
import { createTRPCRouter, protectedProcedure } from '@/server/config/trpc';

export function createObject(
  keys: Array<string>,
  values: Array<string | number | null> | undefined
) {
  const obj: zLogs = {
    time: null,
    receiveTime: null,
    serial: null,
    hostid: null,
    type: null,
    subtype: null,
    src: null,
    dst: null,
    natsrc: null,
    natdst: null,
    rule: null,
    ruleUuid: null,
    srcuser: null,
    dstuser: null,
    app: null,
    zoneFrom: null,
    zoneTo: null,
    inboundIf: null,
    outboundIf: null,
    sessionid: null,
    repeatcnt: null,
    sport: null,
    dport: null,
    natsport: null,
    natdport: null,
    flags: null,
    proto: null,
    action: null,
    misc: null,
    threatid: null,
    thrCategory: null,
    severity: null,
    direction: null,
    bytes: null,
    bytesSent: null,
    bytesReceived: null,
    packets: null,
    pktsSent: null,
    pktsReceived: null,
    sessionEndReason: null,
    deviceName: null,
    eventid: null,
    object: null,
    module: null,
    opaque: null,
    srcloc: null,
    dstloc: null,
    urlIdx: null,
    category: null,
    urlCategoryList: null,
    domainEdl: null,
    reason: null,
    justification: null,
    subcategoryOfApp: null,
    categoryOfApp: null,
    technologyOfApp: null,
    riskOfApp: null,
  };

  if (keys.length !== values?.length) {
    throw new Error('Keys and values arrays must have the same length');
  }

  for (let i = 0; i < keys.length; i++) {
    const key = String(keys[i]);
    //@ts-expect-error Note: 타입이 복잡해지지 않도록 ts-expect-error 를 사용한다.
    obj[key] = values[i];
  }

  return obj;
}

export const projectsRouter = createTRPCRouter({
  getAll: protectedProcedure({ authorizations: ['ADMIN'] })
    .meta({
      openapi: {
        method: 'GET',
        path: '/projects',
        protect: true,
        tags: ['projects'],
      },
    })
    .input(
      z
        .object({
          timeFrom: z.number().optional().default(new Date().getTime()),
          timeTo: z.number().optional().default(new Date().getTime()),
          limit: z.number().min(1).max(500000).default(1000),
          cursor: z.string().cuid().optional(),
          searchTerm: z.string().optional(),
        })
        .default({})
    )
    .output(
      z.object({
        logs: z.array(zPaloLogs().nullish()),
      })
    )
    .query(async ({ input }) => {
      const result: Array<zLogs> = [];
      console.log('timeFrom', input.timeFrom);
      console.log('timeTo', input.timeTo);
      console.log('limit', input.limit);
      console.log('searchTerm', input.searchTerm);

      const timeRange = `AND TIME BETWEEN TO_DATE('${moment(input.timeFrom).format('YYYY-MM-DD HH:mm:SS')}') AND TO_DATE('${moment(input.timeTo).format('YYYY-MM-DD HH:mm:SS')}')`;
      const searchTerm = input.searchTerm;
      const query = `SELECT * FROM PANETLOG WHERE 1=1 ${searchTerm} ${timeRange} LIMIT ${input.limit}`;
      console.log(
        'query',
        `${env.MACHBASE_URL}:${env.MACHBASE_PORT}/db/query?q=` +
          encodeURIComponent(query)
      );

      try {
        await fetch(
          `${env.MACHBASE_URL}:${env.MACHBASE_PORT}/db/query?q=` +
            encodeURIComponent(query)
        )
          .then((res) => {
            return res.json();
          })
          .then((data) => {
            let logs: {
              columns: Array<string>;
              rows: Array<Array<string | number>>;
            } = {
              columns: [],
              rows: [],
            };
            logs = data.data;
            const columns: Array<string> = [];
            logs.columns.map((column) => {
              const str = column
                .toLowerCase()
                .replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());

              columns.push(str);
            });
            for (let i = 0; i < logs.rows.length; i++) {
              if (columns.length !== logs.rows[i]?.length) {
                throw new Error('Arrays must have the same length');
              }
              result.push(createObject(columns, logs.rows[i]));
            }
          })
          .catch((e) => {
            console.log('error : ' + e);
          });
      } catch {
        console.log('error');
      }
      return { logs: result };
    }),
});

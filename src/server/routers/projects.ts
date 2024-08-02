import { z } from 'zod';

import { env } from '@/env.mjs';
import {
  threatColumns,
  trefficColumns,
  urlColumns,
} from '@/features/monitoring/MenuColumns';
import {
  zLogs,
  zPaloLogs,
  zPaloLogsParams,
} from '@/features/monitoring/schemas';
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
    .input(zPaloLogsParams())
    .output(
      z.object({
        logs: z.array(zPaloLogs().nullish()),
        pagination: z.object({
          currentPage: z.number().min(1).default(1),
          pageLength: z.number().min(0),
          totalCnt: z.number().min(0).default(0),
        }),
      })
    )
    .query(async ({ input }) => {
      const logsArray: Array<zLogs> = [];
      const dataFrom = (input.currentPage - 1) * input.limit;
      const dataTo = input.limit;
      const timeRange = `DURATION FROM TO_DATE('${input.timeFrom}') TO TO_DATE('${input.timeTo}')`;
      let searchTerm = input.searchTerm;
      let columnString = '';

      switch (input.menu) {
        case 'TRAFFIC':
          columnString = trefficColumns.join(', ');
          searchTerm = searchTerm + " AND TYPE = 'TRAFFIC'";
          break;
        case 'THREAT':
          columnString = threatColumns.join(', ');
          searchTerm = searchTerm + " AND TYPE = 'THREAT'";
          break;
        case 'SYSLOG':
          columnString = urlColumns.join(', ');
          searchTerm = searchTerm + " AND TYPE = 'URL'";
          break;
        default:
      }

      const queryLogs = `SELECT ${columnString} FROM PANETLOG WHERE 1=1 ${searchTerm} LIMIT ${dataFrom}, ${dataTo} ${timeRange}`;

      const queryTotalCnt = `SELECT COUNT(RECEIVE_TIME) TOTAL FROM PANETLOG WHERE 1=1 ${searchTerm} ${timeRange}`;
      let totalCnt = 0;
      let pageLength = 1;
      console.log('dataFrom', dataFrom);
      console.log('dataTo', dataTo);
      console.log('queryTotalCnt', queryTotalCnt);
      console.log('queryLogs', queryLogs);
      try {
        await fetch(
          `${env.MACHBASE_URL}:${env.MACHBASE_PORT}/db/query?q=` +
            encodeURIComponent(queryTotalCnt)
        )
          .then((res) => {
            return res.json();
          })
          .then((data) => {
            totalCnt = data.data.rows[0][0];
            pageLength = Math.ceil(totalCnt / input.limit);
            pageLength = pageLength === 0 ? 1 : pageLength;
            console.log('totalCnt : ' + totalCnt);
            console.log('pageLength : ' + (pageLength === 0 ? 1 : pageLength));
            console.log('currentPage : ' + input.currentPage);
          });
        await fetch(
          `${env.MACHBASE_URL}:${env.MACHBASE_PORT}/db/query?q=` +
            encodeURIComponent(queryLogs)
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
              logsArray.push(createObject(columns, logs.rows[i]));
            }
          })
          .catch((e) => {
            console.log('error : ' + e);
          });
      } catch {
        console.log('error');
      }
      return {
        logs: logsArray,
        pagination: {
          currentPage: input.currentPage,
          pageLength,
          totalCnt,
        },
      };
    }),
});

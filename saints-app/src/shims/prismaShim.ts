/**
 * Browser / Client-side Shim for PrismaClient
 *
 * In desktop standalone mode, all database operations communicate with
 * the Saints Web API over REST / WebSockets rather than direct DB sockets.
 */

export class PrismaClient {
  [key: string]: any;
  constructor() {
    return new Proxy(this, {
      get: (_target, prop) => {
        return new Proxy({}, {
          get: (_subTarget, subProp) => {
            return async (..._args: any[]) => {
              console.warn(`[PrismaShim] Model operation '${String(prop)}.${String(subProp)}' called in desktop client. Returning fallback.`);
              return [];
            };
          },
        });
      },
    });
  }
}

export const Prisma = {
  Decimal: class Decimal {
    private val: any;
    constructor(val: any) {
      this.val = val;
    }
    toString() {
      return String(this.val);
    }
    toNumber() {
      return Number(this.val);
    }
  },
  SortOrder: {
    asc: 'asc',
    desc: 'desc',
  },
};

export const prisma: any = new Proxy({}, {
  get: (_target, prop) => {
    return new Proxy({}, {
      get: (_subTarget, subProp) => {
        return async (..._args: any[]) => {
          console.warn(`[PrismaShim] Direct database access '${String(prop)}.${String(subProp)}' is not available in standalone desktop mode.`);
          return [];
        };
      },
    });
  },
});

export default prisma;

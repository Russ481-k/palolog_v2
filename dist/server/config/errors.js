import { Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';

/**
 * We extend the TRPCError so we can implement tRPC code based on what Prisma
 * or other tool throw as an error.
 */
export class ExtendedTRPCError extends TRPCError {
  constructor(opts) {
    var _a;
    // Prisma Conflict Error
    if (
      opts.cause instanceof Prisma.PrismaClientKnownRequestError &&
      opts.cause.code === 'P2002'
    ) {
      super({ code: 'CONFLICT', message: opts.message, cause: opts.cause });
      return;
    }
    // Unknown Error
    super({
      code:
        (_a = opts.code) !== null && _a !== void 0
          ? _a
          : 'INTERNAL_SERVER_ERROR',
      message: opts.message,
      cause: opts.cause,
    });
  }
}

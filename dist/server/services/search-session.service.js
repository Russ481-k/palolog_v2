import { Prisma } from '@prisma/client';

export class SearchSessionService {
  constructor(prismaClient) {
    this.prisma = prismaClient;
  }
  async create(input) {
    const session = await this.prisma.searchSession.create({
      data: {
        userId: input.userId,
        clientIp: input.clientIp,
        userAgent: input.userAgent,
        searchId: input.searchId,
        status: 'ACTIVE',
        searchParams: input.searchParams,
      },
    });
    return Object.assign(Object.assign({}, session), {
      searchParams: session.searchParams,
    });
  }
  async update(id, input) {
    const session = await this.prisma.searchSession.update({
      where: { id },
      data: Object.assign(Object.assign({}, input), { updatedAt: new Date() }),
    });
    return Object.assign(Object.assign({}, session), {
      searchParams: session.searchParams,
    });
  }
  async findById(id) {
    const session = await this.prisma.searchSession.findUnique({
      where: { id },
    });
    if (!session) return null;
    return Object.assign(Object.assign({}, session), {
      searchParams: session.searchParams,
    });
  }
  async findBySearchId(searchId) {
    console.log(`[SearchSession] Finding session by searchId: ${searchId}`);
    const session = await this.prisma.$transaction(
      async (tx) => {
        const result = await tx.searchSession.findUnique({
          where: { searchId },
        });
        console.log(`[SearchSession] Session lookup result in transaction:`, {
          id: result === null || result === void 0 ? void 0 : result.id,
          status: result === null || result === void 0 ? void 0 : result.status,
          searchId:
            result === null || result === void 0 ? void 0 : result.searchId,
          lastActivityAt:
            result === null || result === void 0
              ? void 0
              : result.lastActivityAt,
        });
        return result;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );
    if (!session) {
      console.log(`[SearchSession] No session found for searchId: ${searchId}`);
      return null;
    }
    return Object.assign(Object.assign({}, session), {
      searchParams: session.searchParams,
    });
  }
  async findActiveByUserId(userId) {
    const sessions = await this.prisma.searchSession.findMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
    });
    return sessions.map((session) =>
      Object.assign(Object.assign({}, session), {
        searchParams: session.searchParams,
      })
    );
  }
  async cancelSession(id, reason) {
    console.log(`[SearchSession] Attempting to cancel session: ${id}`);
    const result = await this.prisma.$transaction(
      async (tx) => {
        const currentSession = await tx.searchSession.findUnique({
          where: { id },
        });
        console.log(`[SearchSession] Current session state before cancel:`, {
          id:
            currentSession === null || currentSession === void 0
              ? void 0
              : currentSession.id,
          status:
            currentSession === null || currentSession === void 0
              ? void 0
              : currentSession.status,
          lastActivityAt:
            currentSession === null || currentSession === void 0
              ? void 0
              : currentSession.lastActivityAt,
        });
        const updatedSession = await tx.searchSession.update({
          where: { id },
          data: {
            status: 'CANCELLED',
            cancelReason: reason,
            lastActivityAt: new Date(),
          },
        });
        console.log(`[SearchSession] Session updated to cancelled:`, {
          id: updatedSession.id,
          status: updatedSession.status,
          lastActivityAt: updatedSession.lastActivityAt,
        });
        return updatedSession;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );
    return Object.assign(Object.assign({}, result), {
      searchParams: result.searchParams,
    });
  }
  async cancelSessionBySearchId(searchId, reason) {
    console.log(
      `[SearchSession] Attempting to cancel session with searchId: ${searchId}`
    );
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // 세션 조회 (FOR UPDATE)
          const session = await tx.searchSession.findUnique({
            where: { searchId },
            select: {
              id: true,
              status: true,
              searchId: true,
              userId: true,
              clientIp: true,
              userAgent: true,
              searchParams: true,
              cancelReason: true,
              createdAt: true,
              updatedAt: true,
              lastActivityAt: true,
            },
          });
          if (!session) {
            console.log(
              `[SearchSession] Session not found for searchId: ${searchId}`
            );
            return null;
          }
          if (session.status !== 'ACTIVE') {
            console.log(`[SearchSession] Session is already ${session.status}`);
            return Object.assign(Object.assign({}, session), {
              searchParams: session.searchParams,
            });
          }
          // 상태 업데이트
          const updatedSession = await tx.searchSession.update({
            where: { id: session.id },
            data: {
              status: 'CANCELLED',
              cancelReason: reason,
              lastActivityAt: new Date(),
            },
          });
          console.log(`[SearchSession] Successfully cancelled session:`, {
            id: updatedSession.id,
            status: updatedSession.status,
            searchId: updatedSession.searchId,
          });
          return Object.assign(Object.assign({}, updatedSession), {
            searchParams: updatedSession.searchParams,
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: 5000, // 5초 타임아웃
        }
      );
    } catch (error) {
      console.error('[SearchSession] Failed to cancel session:', error);
      throw error;
    }
  }
  async cleanupInactiveSessions(maxAgeMinutes = 30) {
    const cutoffDate = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
    const result = await this.prisma.searchSession.deleteMany({
      where: {
        OR: [
          { status: 'COMPLETED' },
          { status: 'CANCELLED' },
          { status: 'ERROR' },
          {
            AND: [{ status: 'ACTIVE' }, { lastActivityAt: { lt: cutoffDate } }],
          },
        ],
      },
    });
    return result.count;
  }
  // 테스트용 유틸리티 함수
  async getSessionStats() {
    const [active, cancelled, completed, error] = await Promise.all([
      this.prisma.searchSession.count({ where: { status: 'ACTIVE' } }),
      this.prisma.searchSession.count({ where: { status: 'CANCELLED' } }),
      this.prisma.searchSession.count({ where: { status: 'COMPLETED' } }),
      this.prisma.searchSession.count({ where: { status: 'ERROR' } }),
    ]);
    return {
      active,
      cancelled,
      completed,
      error,
    };
  }
  async getActiveSessionsByUser(userId) {
    const sessions = await this.prisma.searchSession.findMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
      orderBy: {
        lastActivityAt: 'desc',
      },
    });
    return {
      count: sessions.length,
      sessions: sessions.map((session) =>
        Object.assign(Object.assign({}, session), {
          searchParams: session.searchParams,
        })
      ),
    };
  }
}

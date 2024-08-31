import { VerificationToken } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import dayjs from 'dayjs';
import jwt from 'jsonwebtoken';
import { cookies, headers } from 'next/headers';

import { env } from '@/env.mjs';
import {
  VALIDATION_TOKEN_EXPIRATION_IN_MINUTES,
  getValidationRetryDelayInSeconds,
} from '@/features/auth/utils';
import { zUser } from '@/features/users/schemas';
import { db } from '@/server/config/db';
import { AppContext } from '@/server/config/trpc';

export const AUTH_COOKIE_NAME = 'auth';

/**
 * getServerAuthSession
 */
export const getServerAuthSession = async () => {
  const token =
    // Get from Headers
    headers().get('Authorization')?.split('Bearer ')[1] ??
    // Get from Cookies
    cookies().get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const jwtDecoded = decodeJwt(token);

  if (!jwtDecoded?.id) {
    return null;
  }

  const userPick = {
    id: true,
    name: true,
    email: true,
    authorizations: true,
    language: true,
    accountStatus: true,
  } as const;

  const user = await db.user.findUnique({
    where: { id: jwtDecoded.id, accountStatus: 'ENABLED' },
    select: userPick,
  });

  if (!user) {
    return null;
  }

  return zUser().pick(userPick).parse(user);
};

export const setAuthCookie = (token: string) => {
  cookies().set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: false,
    expires: dayjs().add(1, 'day').toDate(),
  });
};

export const decodeJwt = (token: string) => {
  try {
    const jwtDecoded = jwt.verify(token, env.AUTH_SECRET);
    if (
      !jwtDecoded ||
      typeof jwtDecoded !== 'object' ||
      !('id' in jwtDecoded)
    ) {
      return null;
    }
    return jwtDecoded;
  } catch {
    return null;
  }
};

export async function validate({
  ctx,
  id,
  password,
}: {
  ctx: AppContext;
  id: string;
  password: string;
}): Promise<{ verificationToken: VerificationToken; userJwt: string }> {
  ctx.logger.info('Removing expired verification tokens from database');
  await ctx.db.verificationToken.deleteMany({
    where: { expires: { lt: new Date() } },
  });
  ctx.logger.info('Checking password');

  ctx.logger.info('Checking if verification token exists');
  const user = await ctx.db.user.findUnique({
    where: { id },
  });

  const isCorrectPassword = bcrypt.compareSync(password, user?.password ?? '');

  if (!user) {
    ctx.logger.warn('User not found, silent error for security reasons');
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Failed to authenticate the user',
    });
  }

  if (user.accountStatus !== 'ENABLED') {
    ctx.logger.warn('Invalid user, silent error for security reasons');
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Failed to authenticate the user',
    });
  }

  if (!isCorrectPassword) {
    ctx.logger.warn('Invalid user, silent error for security reasons');
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Failed to authenticate the user',
    });
  }

  ctx.logger.info('Saving token to database');
  const token = randomUUID();
  await ctx.db.verificationToken.create({
    data: {
      userId: user.id,
      expires: dayjs()
        .add(VALIDATION_TOKEN_EXPIRATION_IN_MINUTES, 'minutes')
        .toDate(),
      token,
    },
  });

  const verificationToken = await ctx.db.verificationToken.findUnique({
    where: {
      token,
    },
  });

  let retryDelayInSeconds = getValidationRetryDelayInSeconds(
    verificationToken?.attempts ?? 0
  );

  ctx.logger.info('Check last attempt date');
  if (
    dayjs().isBefore(
      dayjs(verificationToken?.lastAttemptAt).add(
        retryDelayInSeconds,
        'seconds'
      )
    )
  ) {
    ctx.logger.warn('Last attempt was to close');
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Failed to authenticate the user',
    });
  }

  if (!verificationToken) {
    ctx.logger.warn('Verification token does not exist');
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Failed to authenticate the user',
    });
  }

  retryDelayInSeconds = getValidationRetryDelayInSeconds(
    verificationToken.attempts
  );

  ctx.logger.info('Check last attempt date');
  if (
    dayjs().isBefore(
      dayjs(verificationToken.lastAttemptAt).add(retryDelayInSeconds, 'seconds')
    )
  ) {
    ctx.logger.warn('Last attempt was to close');
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Failed to authenticate the user',
    });
  }

  ctx.logger.info('Encoding JWT');
  const userJwt = jwt.sign({ id: verificationToken.userId }, env.AUTH_SECRET);
  if (!userJwt) {
    ctx.logger.error('Failed to encode JWT');
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
    });
  }

  return { verificationToken, userJwt };
}

export async function deleteUsedCode({
  ctx,
  token,
}: {
  ctx: AppContext;
  token: string;
}) {
  ctx.logger.info('Deleting used token');
  try {
    await ctx.db.verificationToken.delete({
      where: { token },
    });
  } catch (e) {
    ctx.logger.warn('Failed to delete the used token');
  }
}

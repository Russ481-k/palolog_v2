import { TRPCError } from '@trpc/server';
import { AES, enc } from 'crypto-js';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';

import { env } from '@/env.mjs';
import { AppContext } from '@/server/config/context';

const SECRET_KEY = env.NEXT_PUBLIC_LICENSE_SECRET as string;
const LICENSE_KEY = 'app_license';

// 클라이언트 전용 유틸리티
export function generateDeviceId(): string {
  const existingId = localStorage.getItem('device_id');
  if (existingId) return existingId;

  const newId = uuidv4();
  localStorage.setItem('device_id', newId);
  return newId;
}

export function generateLicenseKey(deviceId: string, activatedAt: string) {
  const payload = {
    deviceId,
    activatedAt,
    hash: generateHash(deviceId, activatedAt),
  };
  return AES.encrypt(JSON.stringify(payload), SECRET_KEY).toString();
}

function generateHash(deviceId: string, activatedAt: string) {
  // 기기 ID와 활성화 시간을 조합하여 해시 생성
  return AES.encrypt(
    `${deviceId}:${activatedAt}:${SECRET_KEY}`,
    SECRET_KEY
  ).toString();
}

export function initializeLicense(): void {
  const existingLicense = localStorage.getItem(LICENSE_KEY);
  if (!existingLicense) {
    const deviceId = generateDeviceId();
    const activatedAt = new Date().toISOString();

    fetch('/api/license/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, activatedAt }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.licenseKey) {
          localStorage.setItem(LICENSE_KEY, data.licenseKey);
        }
      });
  }
}

export function verifyLicense(licenseKey: string) {
  try {
    const decrypted = AES.decrypt(licenseKey, SECRET_KEY).toString(enc.Utf8);
    const license = JSON.parse(decrypted);

    // 해시 검증
    const expectedHash = generateHash(license.deviceId, license.activatedAt);
    if (expectedHash !== license.hash) {
      return false;
    }

    return license;
  } catch {
    return false;
  }
}

export function getLicenseInfo(): Promise<{
  daysLeft: number;
  isExpired: boolean;
  shouldWarn: boolean;
}> {
  const licenseKey = localStorage.getItem(LICENSE_KEY);
  if (!licenseKey) {
    return Promise.resolve({
      daysLeft: 0,
      isExpired: true,
      shouldWarn: false,
    });
  }

  return fetch('/api/license/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ licenseKey }),
  })
    .then((res) => res.json())
    .then((data) => data.license);
}

export async function validateLicense(ctx: AppContext) {
  const license = await ctx.db.systemLicense.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  if (!license) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'No valid license found',
    });
  }

  const now = dayjs().tz('Asia/Seoul');
  const expiresAt = dayjs(license.expiresAt).tz('Asia/Seoul');
  const daysLeft = expiresAt.diff(now, 'day');

  if (daysLeft <= 0) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'License expired',
    });
  }

  return { daysLeft, isExpired: false, shouldWarn: daysLeft <= 7 };
}

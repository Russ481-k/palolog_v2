import { randomUUID } from 'node:crypto';

export const USER_ID = 'user';
export const ADMIN_ID = 'admin';

export const getRandomId = async () => {
  const randomId = await randomUUID();
  return `${randomId}`;
};

import { expect, test } from '@playwright/test';
import { pageUtils } from 'e2e/utils/pageUtils';
import { ADMIN_ID } from 'e2e/utils/users';

import { env } from '@/env.mjs';
import { ADMIN_PATH } from '@/features/admin/constants';

test.describe('Admin access', () => {
  test(`Redirect to Admin (${ADMIN_PATH})`, async ({ page }) => {
    const utils = pageUtils(page);

    await utils.loginAdmin({ id: ADMIN_ID, password: ADMIN_ID });
    await page.waitForURL(`${env.NEXT_PUBLIC_BASE_URL}${ADMIN_PATH || '/'}**`);

    await expect(page.getByTestId('admin-layout')).toBeVisible();
  });
});

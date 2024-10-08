import { expect, test } from '@playwright/test';
import { pageUtils } from 'e2e/utils/pageUtils';
import { USER_ID } from 'e2e/utils/users';

import { env } from '@/env.mjs';
import { APP_PATH } from '@/features/app/constants';

test.describe('App access', () => {
  test(`Redirect to App (${APP_PATH})`, async ({ page }) => {
    const utils = pageUtils(page);

    await utils.loginApp({ id: USER_ID, password: USER_ID });
    await page.waitForURL(`${env.NEXT_PUBLIC_BASE_URL}${APP_PATH || '/'}**`);

    await expect(page.getByTestId('app-layout')).toBeVisible();
  });
});

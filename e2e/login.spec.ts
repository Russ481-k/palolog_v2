import { expect, test } from '@playwright/test';
import { pageUtils } from 'e2e/utils/pageUtils';
import { ADMIN_ID, USER_ID, getRandomId } from 'e2e/utils/users';

import locales from '@/locales';

test.describe('Login flow', () => {
  test('Login as admin', async ({ page }) => {
    const utils = pageUtils(page);

    await utils.loginAdmin({ id: ADMIN_ID, password: ADMIN_ID });

    await expect(
      page.getByText(locales.en.auth.data.verificationCode.unknown)
    ).not.toBeVisible();
  });

  test('Login as user', async ({ page }) => {
    const utils = pageUtils(page);

    await utils.loginApp({ id: USER_ID, password: USER_ID });

    await expect(
      page.getByText(locales.en.auth.data.verificationCode.unknown)
    ).not.toBeVisible();
  });

  test('Login with a wrong code', async ({ page }) => {
    const utils = pageUtils(page);

    await utils.loginApp({ id: USER_ID, password: USER_ID });

    await expect(
      page.getByText(locales.en.auth.data.verificationCode.unknown)
    ).toBeVisible();
  });

  test('Login with a wrong email', async ({ page }) => {
    const utils = pageUtils(page);

    const id = await getRandomId();
    await utils.loginApp({ id, password: id });

    await expect(
      page.getByText(locales.en.auth.data.verificationCode.unknown)
    ).toBeVisible();
  });
});

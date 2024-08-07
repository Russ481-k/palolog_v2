import React from 'react';

import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { LuDatabase, LuMenu, LuUsers } from 'react-icons/lu';

import { Nav, NavGroup, NavItem } from '@/components/Nav';
import { LinkAdmin } from '@/features/admin/LinkAdmin';
import { ADMIN_PATH } from '@/features/admin/constants';

export const AdminNav = () => {
  const { t } = useTranslation(['management']);
  const pathname = usePathname();
  const isActive = (to: string) => pathname?.startsWith(to);
  return (
    <Nav>
      <NavGroup title={t('management:nav.title')}>
        <NavItem
          as={LinkAdmin}
          href="/management/users"
          isActive={isActive(`${ADMIN_PATH}/management/users`)}
          icon={LuUsers}
        >
          {t('management:nav.users')}
        </NavItem>
        {/* add menu NavItem */}
        <NavItem
          as={LinkAdmin}
          href="/management/menus"
          isActive={isActive(`${ADMIN_PATH}/management/menus`)}
          icon={LuMenu}
        >
          {t('management:nav.menus')}
        </NavItem>
        <NavItem
          as={LinkAdmin}
          href="/management/database"
          isActive={isActive(`${ADMIN_PATH}/management/database`)}
          icon={LuDatabase}
        >
          {t('management:nav.database')}
        </NavItem>
      </NavGroup>
    </Nav>
  );
};

import { Tag, TagLabel, TagLeftIcon, ThemeTypings } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { LuCheck, LuX } from 'react-icons/lu';

export type MenuStatusProps = {
  isActivated?: boolean;
  showLabelBreakpoint?: ThemeTypings['breakpoints'];
};

export const MenuStatus = ({
  isActivated = false,
  showLabelBreakpoint = 'base',
}: MenuStatusProps) => {
  const { t } = useTranslation(['menus']);

  return (
    <Tag
      size="sm"
      colorScheme={isActivated ? 'success' : 'warning'}
      gap={1}
      justifyContent="center"
      px={{ base: 0, [showLabelBreakpoint]: 2 }}
    >
      <TagLeftIcon
        as={isActivated ? LuCheck : LuX}
        mr={0}
        aria-label={
          isActivated
            ? t('menus:data.status.activated')
            : t('menus:data.status.deactivated')
        }
      />
      <TagLabel
        lineHeight={1}
        display={{ base: 'none', [showLabelBreakpoint]: 'inline' }}
        whiteSpace="nowrap"
      >
        {isActivated
          ? t('menus:data.status.activated')
          : t('menus:data.status.deactivated')}
      </TagLabel>
    </Tag>
  );
};

import { Tag, TagLabel, TagLeftIcon, ThemeTypings } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { LuCheck, LuX } from 'react-icons/lu';

export type DatabaseStatusProps = {
  isActivated?: boolean;
  showLabelBreakpoint?: ThemeTypings['breakpoints'];
};

export const DatabaseStatus = ({
  isActivated = false,
  showLabelBreakpoint = 'base',
}: DatabaseStatusProps) => {
  const { t } = useTranslation(['database']);

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
            ? t('database:data.status.activated')
            : t('database:data.status.deactivated')
        }
      />
      <TagLabel
        lineHeight={1}
        display={{ base: 'none', [showLabelBreakpoint]: 'inline' }}
        whiteSpace="nowrap"
      >
        {isActivated
          ? t('database:data.status.activated')
          : t('database:data.status.deactivated')}
      </TagLabel>
    </Tag>
  );
};

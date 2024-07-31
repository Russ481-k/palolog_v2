import React from 'react';

import { Stack } from '@chakra-ui/react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { FormField } from '@/components/Form';
import { FormFieldMenu } from '@/features/menus/schemas';

export const MenuForm = () => {
  const { t } = useTranslation(['common', 'menus']);
  const form = useFormContext<FormFieldMenu>();

  return (
    <Stack spacing={4}>
      <FormField
        control={form.control}
        type="text"
        name="name"
        label={t('menus:data.name.label')}
      />
      <FormField
        control={form.control}
        type="text"
        name="description"
        label={t('menus:data.description.label')}
      />
    </Stack>
  );
};

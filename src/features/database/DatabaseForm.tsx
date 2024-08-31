import React from 'react';

import { Stack } from '@chakra-ui/react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { FormField } from '@/components/Form';
import { FormFieldDatabase } from '@/features/database/schemas';

export const DatabaseForm = () => {
  const { t } = useTranslation(['common', 'database']);
  const form = useFormContext<FormFieldDatabase>();

  return (
    <Stack spacing={4}>
      <FormField
        control={form.control}
        type="text"
        name="name"
        label={t('database:data.name.label')}
      />
      <FormField
        control={form.control}
        type="text"
        name="description"
        label={t('database:data.description.label')}
      />
    </Stack>
  );
};

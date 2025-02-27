import React from 'react';

import { Button, Heading } from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Form } from '@/components/Form';
import { AdminBackButton } from '@/features/admin/AdminBackButton';
import { AdminCancelButton } from '@/features/admin/AdminCancelButton';
import {
  AdminLayoutPage,
  AdminLayoutPageContent,
  AdminLayoutPageTopBar,
} from '@/features/admin/AdminLayoutPage';
import { DatabaseForm } from '@/features/database/DatabaseForm';
import {
  FormFieldDatabase,
  zFormFieldsDatabase,
} from '@/features/database/schemas';

export default function PageAdminDatabaseCreate() {
  const { t } = useTranslation(['common', 'database']);

  // const createDatabase = trpc.database.create.useMutation({
  //   onSuccess: async () => {
  //     await trpcUtils.database.getAll.invalidate();
  //     toastSuccess({
  //       title: t('database:create.feedbacks.updateSuccess.title'),
  //     });
  //     router.back();
  //   },
  //   onError: (error) => {
  //     if (isErrorDatabaseConflict(error, 'name')) {
  //       form.setError('name', { message: t('database:data.id.alreadyUsed') });
  //       return;
  //     }
  //     toastError({
  //       title: t('database:create.feedbacks.updateError.title'),
  //     });
  //   },
  // });

  const form = useForm<FormFieldDatabase>({
    resolver: zodResolver(zFormFieldsDatabase()),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  return (
    <Form
      {...form}
      // onSubmit={(values) => {
      //   createDatabase.mutate(values);
      // }}
    >
      <AdminLayoutPage containerMaxWidth="container.md">
        <AdminLayoutPageTopBar
          leftActions={<AdminBackButton withConfirm={form.formState.isDirty} />}
          rightActions={
            <>
              <AdminCancelButton withConfirm={form.formState.isDirty} />
              <Button
                type="submit"
                variant="@primary"
                // isLoading={createDatabase.isLoading || createDatabase.isSuccess}
              >
                {t('database:create.action.save')}
              </Button>
            </>
          }
        >
          <Heading size="sm">{t('database:create.title')}</Heading>
        </AdminLayoutPageTopBar>
        <AdminLayoutPageContent>
          <DatabaseForm />
        </AdminLayoutPageContent>
      </AdminLayoutPage>
    </Form>
  );
}

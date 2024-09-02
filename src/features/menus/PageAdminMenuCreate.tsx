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
import { MenuForm } from '@/features/menus/MenuForm';
import { FormFieldMenu, zFormFieldsMenu } from '@/features/menus/schemas';

export default function PageAdminMenuCreate() {
  const { t } = useTranslation(['common', 'menus']);

  // const createMenu = trpc.menus.create.useMutation({
  //   onSuccess: async () => {
  //     await trpcUtils.menus.getAll.invalidate();
  //     toastSuccess({
  //       title: t('menus:create.feedbacks.updateSuccess.title'),
  //     });
  //     router.back();
  //   },
  //   onError: (error) => {
  //     if (isErrorDatabaseConflict(error, 'name')) {
  //       form.setError('name', { message: t('menus:data.id.alreadyUsed') });
  //       return;
  //     }
  //     toastError({
  //       title: t('menus:create.feedbacks.updateError.title'),
  //     });
  //   },
  // });

  const form = useForm<FormFieldMenu>({
    resolver: zodResolver(zFormFieldsMenu()),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  return (
    <Form
      {...form}
      // onSubmit={(values) => {
      //   createMenu.mutate(values);
      // }}
    >
      <AdminLayoutPage containerMaxWidth="container.md" showNavBar={false}>
        <AdminLayoutPageTopBar
          leftActions={<AdminBackButton withConfirm={form.formState.isDirty} />}
          rightActions={
            <>
              <AdminCancelButton withConfirm={form.formState.isDirty} />
              <Button
                type="submit"
                variant="@primary"
                // isLoading={createMenu.isLoading || createMenu.isSuccess}
              >
                {t('menus:create.action.save')}
              </Button>
            </>
          }
        >
          <Heading size="sm">{t('menus:create.title')}</Heading>
        </AdminLayoutPageTopBar>
        <AdminLayoutPageContent>
          <MenuForm />
        </AdminLayoutPageContent>
      </AdminLayoutPage>
    </Form>
  );
}

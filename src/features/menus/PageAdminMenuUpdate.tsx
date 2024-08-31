import React from 'react';

import { Button, Flex, Heading, SkeletonText } from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { ErrorPage } from '@/components/ErrorPage';
import { Form } from '@/components/Form';
import { LoaderFull } from '@/components/LoaderFull';
import { useToastError, useToastSuccess } from '@/components/Toast';
import { AdminBackButton } from '@/features/admin/AdminBackButton';
import { AdminCancelButton } from '@/features/admin/AdminCancelButton';
import {
  AdminLayoutPage,
  AdminLayoutPageContent,
  AdminLayoutPageTopBar,
} from '@/features/admin/AdminLayoutPage';
import { MenuForm } from '@/features/menus/MenuForm';
import { MenuStatus } from '@/features/menus/MenuStatus';
import { FormFieldMenu, zFormFieldsMenu } from '@/features/menus/schemas';
import { trpc } from '@/lib/trpc/client';
import { isErrorDatabaseConflict } from '@/lib/trpc/errors';

export default function PageAdminMenuUpdate() {
  const { t } = useTranslation(['common', 'menus']);
  const trpcUtils = trpc.useUtils();

  const params = useParams();
  const router = useRouter();
  // const menu = trpc.menus.getById.useQuery(
  //   {
  //     name: params?.name?.toString() ?? '',
  //     description: params?.description?.toString() ?? '',
  //   },
  //   {
  //     staleTime: Infinity,
  //   }
  // );

  const toastSuccess = useToastSuccess();
  const toastError = useToastError();

  // const menuUpdate = trpc.menus.updateById.useMutation({
  //   onSuccess: async () => {
  //     await trpcUtils.menus.invalidate();
  //     toastSuccess({
  //       title: t('menus:update.feedbacks.updateSuccess.title'),
  //     });
  //     router.back();
  //   },
  //   onError: (error) => {
  //     if (isErrorDatabaseConflict(error, 'name')) {
  //       form.setError('name', { message: t('menus:data.id.alreadyUsed') });
  //       return;
  //     }
  //     toastError({
  //       title: t('menus:update.feedbacks.updateError.title'),
  //     });
  //   },
  // });

  // const isReady = !menu.isFetching;

  // const form = useForm<FormFieldMenu>({
  //   resolver: zodResolver(zFormFieldsMenu()),
  //   values: {
  //     name: menu.data?.name ?? '',
  //     description: menu.data?.description ?? '',
  //   },
  // });

  // return (
  //   <Form
  //     {...form}
  //     // onSubmit={(values) => {
  //     //   if (!menu.data?.name) return;
  //     //   menuUpdate.mutate({
  //     //     ...values,
  //     //   });
  //     // }}
  //   >
  //     <AdminLayoutPage containerMaxWidth="container.md" showNavBar={false}>
  //       <AdminLayoutPageTopBar
  //         leftActions={<AdminBackButton withConfirm={form.formState.isDirty} />}
  //         rightActions={
  //           <>
  //             <AdminCancelButton withConfirm={form.formState.isDirty} />
  //             <Button
  //               type="submit"
  //               variant="@primary"
  //               // isLoading={menuUpdate.isLoading || menuUpdate.isSuccess}
  //             >
  //               {t('menus:update.action.save')}
  //             </Button>
  //           </>
  //         }
  //       >
  //         {menu.isLoading || menu.isError ? (
  //           <SkeletonText maxW="6rem" noOfLines={2} />
  //         ) : (
  //           <Flex
  //             flexDirection={{ base: 'column', md: 'row' }}
  //             alignItems={{ base: 'start', md: 'center' }}
  //             rowGap={1}
  //             columnGap={4}
  //           >
  //             <Heading size="sm">{menu.data.name}</Heading>
  //             <MenuStatus isActivated={menu.data.description === 'ENABLED'} />
  //           </Flex>
  //         )}
  //       </AdminLayoutPageTopBar>
  //       {!isReady && <LoaderFull />}
  //       {isReady && menu.isError && <ErrorPage />}
  //       {isReady && menu.isSuccess && (
  //         <AdminLayoutPageContent>
  //           <MenuForm />
  //         </AdminLayoutPageContent>
  //       )}
  //     </AdminLayoutPage>
  //   </Form>
  // );
}

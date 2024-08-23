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
import { DatabaseForm } from '@/features/database/DatabaseForm';
import { DatabaseStatus } from '@/features/database/DatabaseStatus';
import {
  FormFieldDatabase,
  zFormFieldsDatabase,
} from '@/features/database/schemas';
import { trpc } from '@/lib/trpc/client';
import { isErrorDatabaseConflict } from '@/lib/trpc/errors';

export default function PageAdminDatabaseUpdate() {
  const { t } = useTranslation(['common', 'database']);
  const trpcUtils = trpc.useUtils();

  const params = useParams();
  const router = useRouter();
  // const database = trpc.database.getById.useQuery(
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

  // const databaseUpdate = trpc.database.updateById.useMutation({
  //   onSuccess: async () => {
  //     await trpcUtils.database.invalidate();
  //     toastSuccess({
  //       title: t('database:update.feedbacks.updateSuccess.title'),
  //     });
  //     router.back();
  //   },
  //   onError: (error) => {
  //     if (isErrorDatabaseConflict(error, 'name')) {
  //       form.setError('name', { message: t('database:data.id.alreadyUsed') });
  //       return;
  //     }
  //     toastError({
  //       title: t('database:update.feedbacks.updateError.title'),
  //     });
  //   },
  // });

  // const isReady = !database.isFetching;

  // const form = useForm<FormFieldDatabase>({
  //   resolver: zodResolver(zFormFieldsDatabase()),
  //   values: {
  //     name: database.data?.name ?? '',
  //     description: database.data?.description ?? '',
  //   },
  // });

  // return (
  //   <Form
  //     {...form}
  //     // onSubmit={(values) => {
  //     //   if (!database.data?.name) return;
  //     //   databaseUpdate.mutate({
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
  //               // isLoading={databaseUpdate.isLoading || databaseUpdate.isSuccess}
  //             >
  //               {t('database:update.action.save')}
  //             </Button>
  //           </>
  //         }
  //       >
  //         {database.isLoading || database.isError ? (
  //           <SkeletonText maxW="6rem" noOfLines={2} />
  //         ) : (
  //           <Flex
  //             flexDirection={{ base: 'column', md: 'row' }}
  //             alignItems={{ base: 'start', md: 'center' }}
  //             rowGap={1}
  //             columnGap={4}
  //           >
  //             <Heading size="sm">{database.data.name}</Heading>
  //             <databasetatus isActivated={database.data.description === 'ENABLED'} />
  //           </Flex>
  //         )}
  //       </AdminLayoutPageTopBar>
  //       {!isReady && <LoaderFull />}
  //       {isReady && database.isError && <ErrorPage />}
  //       {isReady && database.isSuccess && (
  //         <AdminLayoutPageContent>
  //           <DatabaseForm />
  //         </AdminLayoutPageContent>
  //       )}
  //     </AdminLayoutPage>
  //   </Form>
  // );
}

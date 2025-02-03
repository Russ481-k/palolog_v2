import { memo, useEffect } from 'react';

import { Button, Flex, Heading } from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Form, FormField } from '@/components/Form';
import { MenuType } from '@/types/project';

import MenuSetter from '../MenuSetter';
import { FormFieldsPaloLogsParams, zPaloLogsParams } from '../schemas';

interface SearchHeaderProps {
  menu: MenuType;
  onMenuChange: (menu: MenuType) => void;
  onSearch: (values: FormFieldsPaloLogsParams) => void;
  defaultValues: {
    timeFrom: string;
    timeTo: string;
    searchTerm: string;
  };
  isLoading: boolean;
}

export const SearchHeader = memo(
  ({
    menu,
    onMenuChange,
    onSearch,
    defaultValues,
    isLoading,
  }: SearchHeaderProps) => {
    const form = useForm<FormFieldsPaloLogsParams>({
      mode: 'onSubmit',
      resolver: zodResolver(zPaloLogsParams()),
      defaultValues: {
        timeFrom: defaultValues.timeFrom,
        timeTo: defaultValues.timeTo,
        currentPage: 1,
        searchTerm: defaultValues.searchTerm,
      },
    });

    useEffect(() => {
      if (isLoading) {
        form.reset(form.getValues(), {
          keepValues: true,
        });
      }
    }, [isLoading, form]);

    return (
      <Form {...form} onSubmit={onSearch}>
        <Flex
          justifyContent="space-between"
          h="24px"
          gap={3}
          alignItems="center"
        >
          <Flex
            flexDirection={{ base: 'column', md: 'row' }}
            alignItems={{ base: 'start', md: 'center' }}
            gap={3}
          >
            <MenuSetter
              menu={menu}
              handleSetMenuChange={onMenuChange}
              disabled={isLoading}
            />
            <Flex gap={1}>
              <FormField
                control={form.control}
                name="timeFrom"
                size="xs"
                type="text"
                width="140px"
                isDisabled={isLoading}
              />
              <Heading color="gray.500" flex="none" size="xs" py="3px">
                ~
              </Heading>
              <FormField
                control={form.control}
                name="timeTo"
                size="xs"
                type="text"
                width="140px"
                isDisabled={isLoading}
              />
            </Flex>
          </Flex>
          <Flex w="100%">
            <FormField
              type="search-input"
              size="xs"
              borderRightRadius={0}
              control={form.control}
              name="searchTerm"
              isDisabled={isLoading}
            />
            <Button
              type="submit"
              w="4.5rem"
              size="xs"
              borderLeftRadius={0}
              isDisabled={isLoading}
              isLoading={isLoading}
              aria-label="Search"
            >
              Search
            </Button>
          </Flex>
        </Flex>
      </Form>
    );
  }
);

SearchHeader.displayName = 'SearchHeader';

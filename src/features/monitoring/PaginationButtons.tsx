import { useEffect, useMemo, useState } from 'react';

import { Button, Flex } from '@chakra-ui/react';
import { useForm } from 'react-hook-form';

interface PaginationButtonsProps {
  isLoading?: boolean;
  isIndeterminate?: boolean;
  isRefetch?: boolean;
  pageLength: number;
  pagination: {
    currentPage: number;
  };
  onCurrentPageChange?: (page: number) => void;
  onRefetch?: (isRefetch: boolean) => void;
}
const PaginationButtons = ({
  isLoading,
  isRefetch,
  pageLength,
  pagination,
  onCurrentPageChange,
  onRefetch,
}: PaginationButtonsProps) => {
  const scrollToTop = () => {
    const targetElement = document.getElementById('main');
    targetElement?.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
    const targetModalElement = document.getElementById('send-modal');
    targetModalElement?.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };
  const { getValues } = useForm<{
    batchSize: string;
  }>({
    mode: 'onChange',
  });
  const [pageList, setPageList] = useState<number[]>([1]);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const handleCurrentPageChange = (page: number) => {
    onCurrentPageChange?.(page);
    setCurrentPage(page);
    scrollToTop();
  };
  const paginationButtonsData = useMemo(
    () => [
      {
        id: 1,
        buttonNumber: () => {
          if (pageList.length < 9 || currentPage < 5) {
            return 1;
          } else if (pageList.length <= currentPage + 4) {
            return pageList.length - 8;
          } else {
            return currentPage - 4;
          }
        },
      },
      {
        id: 2,
        buttonNumber: () => {
          if (pageList.length < 9 || currentPage < 5) {
            return 2;
          } else if (pageList.length <= currentPage + 4) {
            return pageList.length - 7;
          } else {
            return currentPage - 3;
          }
        },
      },
      {
        id: 3,
        buttonNumber: () => {
          if (pageList.length < 9 || currentPage < 5) {
            return 3;
          } else if (pageList.length <= currentPage + 4) {
            return pageList.length - 6;
          } else {
            return currentPage - 2;
          }
        },
      },
      {
        id: 4,
        buttonNumber: () => {
          if (pageList.length < 9 || currentPage < 5) {
            return 4;
          } else if (pageList.length <= currentPage + 4) {
            return pageList.length - 5;
          } else {
            return currentPage - 1;
          }
        },
      },
      {
        id: 5,
        buttonNumber: () => {
          if (pageList.length < 9 || currentPage < 5) {
            return 5;
          } else if (pageList.length <= currentPage + 4) {
            return pageList.length - 4;
          } else {
            return currentPage;
          }
        },
      },
      {
        id: 6,
        buttonNumber: () => {
          if (pageList.length < 9 || currentPage < 5) {
            return 6;
          } else if (pageList.length <= currentPage + 4) {
            return pageList.length - 3;
          } else {
            return currentPage + 1;
          }
        },
      },
      {
        id: 7,
        buttonNumber: () => {
          if (pageList.length < 9 || currentPage < 5) {
            return 7;
          } else if (pageList.length <= currentPage + 4) {
            return pageList.length - 2;
          } else {
            return currentPage + 2;
          }
        },
      },
      {
        id: 8,
        buttonNumber: () => {
          if (pageList.length < 9 || currentPage < 5) {
            return 8;
          } else if (pageList.length <= currentPage + 4) {
            return pageList.length - 1;
          } else {
            return currentPage + 3;
          }
        },
      },
      {
        id: 9,
        buttonNumber: () => {
          if (pageList.length < 9 || currentPage < 5) {
            return 9;
          } else if (pageList.length <= currentPage + 4) {
            return pageList.length;
          } else {
            return currentPage + 4;
          }
        },
      },
    ],
    [pageList, currentPage]
  );

  useEffect(() => {
    if (!!pagination) {
      const totalPageCount = pageLength ?? 1;
      const pageCount = [];
      for (let count = 2; count < totalPageCount + 1; count++) {
        pageCount.push(count);
      }
      setPageList([1, ...pageCount]);
      setCurrentPage(pagination.currentPage);
    } else if (!!pageLength && currentPage > pageLength) {
      onCurrentPageChange?.(currentPage - 1);
    }
  }, [currentPage, pagination, pageLength, getValues, onCurrentPageChange]);

  useEffect(() => {
    if (isRefetch) {
      setCurrentPage(1);
      onCurrentPageChange?.(1);
    }
    onRefetch?.(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRefetch]);

  return (
    <Flex alignItems="center" flex={1} justifyContent="space-between">
      <Flex flex={4} justifyContent="center" gap={1}>
        <Button
          bgColor="white"
          borderColor="gray.300"
          borderWidth={1}
          color="gray.800"
          fontSize="xs"
          h="32px"
          isDisabled={pageLength <= 0 || isLoading}
          minW="32px"
          p={3}
          onClick={() => (currentPage > 1 ? handleCurrentPageChange(1) : '')}
        >{`<<`}</Button>
        <Button
          bgColor="white"
          borderColor="gray.300"
          borderWidth={1}
          color="gray.800"
          fontSize="xs"
          h="32px"
          isDisabled={pageLength <= 0 || isLoading}
          minW="32px"
          p={3}
          onClick={() =>
            currentPage > 1 ? handleCurrentPageChange(currentPage - 1) : ''
          }
        >{`<`}</Button>
        {paginationButtonsData?.map((page) => (
          <Button
            bgColor={currentPage === page.buttonNumber() ? 'gray.200' : 'white'}
            borderColor={
              currentPage === page.buttonNumber() ? 'gray.400' : 'gray.300'
            }
            borderWidth={1}
            color={
              currentPage === page.buttonNumber() ? 'gray.700' : 'gray.800'
            }
            display={
              page.buttonNumber() > pageList.length ? 'none' : 'inline-flex'
            }
            fontSize="xs"
            fontWeight={currentPage === page.buttonNumber() ? '800' : '300'}
            h="32px"
            key={`page-${page.id}`}
            minW="32px"
            p={3}
            pointerEvents={
              currentPage === page.buttonNumber() ? 'none' : 'initial'
            }
            onClick={() => handleCurrentPageChange(page.buttonNumber())}
          >
            {page.buttonNumber()}
          </Button>
        ))}
        <Button
          bgColor="white"
          borderColor="gray.300"
          borderWidth={1}
          color="gray.800"
          fontSize="xs"
          h="32px"
          isDisabled={pageLength <= 0 || isLoading}
          minW="32px"
          p={3}
          onClick={() =>
            currentPage < pageList.length
              ? handleCurrentPageChange(currentPage + 1)
              : ''
          }
        >{`>`}</Button>
        <Button
          bgColor="white"
          borderColor="gray.300"
          borderWidth={1}
          color="gray.800"
          fontSize="xs"
          h="32px"
          isDisabled={pageLength <= 0 || isLoading}
          minW="32px"
          p={3}
          onClick={() =>
            currentPage < pageList.length
              ? handleCurrentPageChange(pageList.length)
              : ''
          }
        >{`>>`}</Button>
      </Flex>
    </Flex>
  );
};

export default PaginationButtons;

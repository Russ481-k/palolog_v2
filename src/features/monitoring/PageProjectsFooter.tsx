import { ChangeEvent, useState } from 'react';

import {
  Button,
  Flex,
  Input,
  InputGroup,
  InputLeftAddon,
  Progress,
  ProgressLabel,
  Select,
  useColorMode,
} from '@chakra-ui/react';

import { DownloadButton } from './DownloadButton';
import PaginationButtons from './PaginationButtons';

export const PageProjectsFooter = ({
  nextCurrentPage,
  pageLength,
  totalCnt,
  onChangeLimit,
  onCurrentPageChange,
  isLoading,
  searchId,
  searchParams,
  loadingProgress = {
    current: 0,
    total: totalCnt,
    status: isLoading ? 'loading' : 'ready',
  },
}: {
  isLoading: boolean;
  nextCurrentPage: number;
  pageLength: number;
  totalCnt: number;
  onChangeLimit: (e: ChangeEvent<HTMLSelectElement>) => void;
  onCurrentPageChange: (page: number) => void;
  searchId: string;
  searchParams: {
    timeFrom: string;
    timeTo: string;
    menu: string;
    searchTerm: string;
  };
  loadingProgress?: {
    current: number;
    total: number;
    status: 'ready' | 'loading' | 'complete' | 'error';
  };
}) => {
  const { colorMode } = useColorMode();

  const [goToPage, setGoToPage] = useState<number>(1);
  const onGoToPageClick = () => {
    onCurrentPageChange(goToPage);
  };

  const progress =
    Math.round((loadingProgress.current / loadingProgress.total) * 100) || 0;
  const currentStatus = isLoading ? 'loading' : loadingProgress.status;

  return (
    <Flex justifyContent="space-between" h="24px">
      <Flex flex={1}>
        <Flex gap={2}>
          <InputGroup size="xs" lineHeight="16px">
            <InputLeftAddon borderLeftRadius={4}>Batch</InputLeftAddon>
            <Select
              borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
              borderWidth={1}
              borderRightRadius={4}
              textAlign="center"
              variant="filled"
              onChange={onChangeLimit}
              fontSize="xs"
              size="xs"
            >
              <option value="100">100</option>
              <option value="500">500</option>
              <option value="1000">1,000</option>
            </Select>
          </InputGroup>
          <Flex>
            <InputGroup size="xs">
              <InputLeftAddon borderLeftRadius={5}>Go To</InputLeftAddon>
              <Input
                id="pagination_batch"
                textAlign="right"
                borderRightWidth={0}
                borderRightRadius={0}
                placeholder={`${nextCurrentPage.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ',')} / ${pageLength.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ',')}`}
                onChange={(e) => setGoToPage(Number(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    return onGoToPageClick();
                  }
                }}
                width="auto"
              />
              <Button size="xs" borderLeftRadius={0} onClick={onGoToPageClick}>
                Page
              </Button>
            </InputGroup>
          </Flex>
        </Flex>
      </Flex>
      <Flex flex={1} w="180px" justifyContent="center">
        <PaginationButtons
          pageLength={pageLength}
          pagination={{
            currentPage: nextCurrentPage,
          }}
          onCurrentPageChange={onCurrentPageChange}
        />
      </Flex>
      <Flex
        flex={1}
        gap={2}
        w="180px"
        justifyContent="right"
        alignItems="center"
      >
        <Progress
          value={progress}
          size="xs"
          w="200px"
          h="16px"
          borderRadius={6}
          isIndeterminate={isLoading && progress === 0}
          colorScheme={currentStatus === 'complete' ? 'green' : 'blue'}
          transition="none"
        >
          <ProgressLabel
            fontSize="xs"
            color={currentStatus === 'loading' ? 'blue.500' : 'gray.500'}
            fontWeight="normal"
          >
            {currentStatus === 'error'
              ? 'Error'
              : currentStatus === 'complete'
                ? 'Complete'
                : currentStatus === 'loading'
                  ? 'Loading...'
                  : 'Ready'}
          </ProgressLabel>
        </Progress>
        <InputGroup size="xs" w="150px">
          <InputLeftAddon borderLeftRadius={5}>Total</InputLeftAddon>
          <Input
            textAlign="right"
            borderRightRadius={5}
            readOnly
            value={totalCnt
              .toString()
              .replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ',')}
          />
        </InputGroup>
      </Flex>
      {/* <DownloadButton
        searchId={searchId}
        totalRows={totalCnt}
        searchParams={searchParams}
      /> */}
    </Flex>
  );
};

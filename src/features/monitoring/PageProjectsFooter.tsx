'use client';

import { ChangeEvent, useState } from 'react';

import {
  Button,
  Flex,
  Input,
  InputGroup,
  InputLeftAddon,
  Select,
  useColorMode,
} from '@chakra-ui/react';

import PaginationButtons from './Pagination';

export const PageProjectsFooter = ({
  isLoading,
  currentPage,
  pageLength,
  totalCnt,
  onChangeLimit,
  onCurrentPageChange,
}: {
  isLoading: boolean;
  currentPage: number;
  pageLength: number;
  totalCnt: number;
  onChangeLimit: (e: ChangeEvent<HTMLSelectElement>) => void;
  onCurrentPageChange: (page: number) => void;
}) => {
  const { colorMode } = useColorMode();
  const [goToPage, setGoToPage] = useState<number>(1);
  const onGoToPageClick = () => {
    onCurrentPageChange(goToPage);
  };
  return (
    <Flex justifyContent="space-between">
      <Flex flex={1}>
        <Flex gap={3}>
          <InputGroup size="sm" w="180px">
            <InputLeftAddon borderLeftRadius={5}>Batch</InputLeftAddon>
            <Select
              borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
              borderWidth={1}
              borderRightRadius={5}
              textAlign="center"
              variant="filled"
              onChange={onChangeLimit}
            >
              <option value="100">100</option>
              <option value="500">500</option>
              <option value="1000">1,000</option>
              <option value="5000">5,000</option>
              <option value="10000">10,000</option>
            </Select>
          </InputGroup>
          <Flex>
            <InputGroup size="sm" w="180px">
              <InputLeftAddon borderLeftRadius={5}>Go To</InputLeftAddon>
              <Input
                textAlign="right"
                borderRightWidth={0}
                borderRightRadius={0}
                placeholder={pageLength
                  .toString()
                  .replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ',')}
                onChange={(e) => setGoToPage(Number(e.target.value))}
              />
            </InputGroup>
            <Button size="sm" borderLeftRadius={0} onClick={onGoToPageClick}>
              Page
            </Button>
          </Flex>
        </Flex>
      </Flex>
      <Flex flex={1} w="180px" justifyContent="center">
        <PaginationButtons
          isLoading={isLoading}
          pageLength={pageLength}
          pagination={{
            currentPage: currentPage,
          }}
          onCurrentPageChange={onCurrentPageChange}
        />
      </Flex>
      <Flex flex={1} w="180px" justifyContent="right">
        <InputGroup size="sm" w="180px">
          <InputLeftAddon borderLeftRadius={5}>Total</InputLeftAddon>
          <Input
            textAlign="right"
            borderRightWidth={0}
            borderRightRadius={0}
            value={totalCnt
              .toString()
              .replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ',')}
          />
        </InputGroup>
        <Button size="sm" borderLeftRadius={0}>
          Download
        </Button>
      </Flex>
    </Flex>
  );
};

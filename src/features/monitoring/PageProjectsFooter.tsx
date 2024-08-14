import { ChangeEvent, useRef, useState } from 'react';

import {
  Button,
  Flex,
  Heading,
  Input,
  InputGroup,
  InputLeftAddon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Progress,
  Select,
  useColorMode,
  useDisclosure,
} from '@chakra-ui/react';
import { AgGridReact } from 'ag-grid-react';

import PaginationButtons from './PaginationButtons';

export const PageProjectsFooter = ({
  nextCurrentPage,
  pageLength,
  totalCnt,
  onChangeLimit,
  onCurrentPageChange,
}: {
  isLoading: boolean;
  nextCurrentPage: number;
  pageLength: number;
  totalCnt: number;
  onChangeLimit: (e: ChangeEvent<HTMLSelectElement>) => void;
  onCurrentPageChange: (page: number) => void;
}) => {
  const gridRef = useRef(null);

  const { colorMode } = useColorMode();
  const { isOpen, onOpen, onClose } = useDisclosure();

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
            </Select>
          </InputGroup>
          <Flex>
            <InputGroup size="sm" w="180px">
              <InputLeftAddon borderLeftRadius={5}>Go To</InputLeftAddon>
              <Input
                id="pagination_batch"
                textAlign="right"
                borderRightWidth={0}
                borderRightRadius={0}
                placeholder={
                  nextCurrentPage
                    .toString()
                    .replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ',') +
                  ' / ' +
                  pageLength
                    .toString()
                    .replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ',')
                }
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
          pageLength={pageLength}
          pagination={{
            currentPage: nextCurrentPage,
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
        <Button size="sm" borderLeftRadius={0} onClick={onOpen}>
          Download
        </Button>
        <Modal isOpen={isOpen} size="xxl" onClose={onClose}>
          <ModalOverlay />
          <ModalContent my="auto">
            <ModalHeader>
              <Heading size="md">DOWNLOAD CENTER</Heading>
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody minHeight="640px">
              <div
                className={
                  colorMode === 'light'
                    ? 'ag-theme-quartz'
                    : 'ag-theme-quartz-dark'
                }
                style={{ width: '100%', height: '65vh', zIndex: 0 }}
              >
                <AgGridReact
                  ref={gridRef}
                  rowData={
                    // !isLoading ? data?.pages[0]?.logs :
                    [
                      {
                        no: 1,
                        fromRows: 65151326,
                        toRows: 65151326,
                        pages: 6513216516,
                        size: 15211451412,
                        progress: true,
                        button: true,
                      },
                      {
                        no: 2,
                        fromRows: 65151326,
                        toRows: 65151326,
                        pages: 651654116,
                        size: 11114451412,
                        progress: true,
                        button: true,
                      },
                      {
                        no: 3,
                        fromRows: 65151326,
                        toRows: 65151326,
                        pages: 6516516,
                        size: 111451413212,
                        progress: true,
                        button: true,
                      },
                    ]
                  }
                  columnDefs={[
                    {
                      headerName: 'No',
                      field: 'no',
                      width: 60,
                    },
                    { field: 'fromRows' },
                    { field: 'toRows' },
                    { field: 'pages' },
                    { field: 'size' },
                    {
                      field: 'progress',
                      cellRenderer: () => (
                        <Progress size="sm" isIndeterminate m={4} />
                      ),
                      minWidth: 800,
                    },
                    {
                      field: 'button',
                      cellRenderer: () => (
                        <Button size="sm" m={0}>
                          DOWNLOAD
                        </Button>
                      ),
                    },
                  ]}
                />
              </div>
              <Flex gap={3}>
                <Heading fontSize={16}>ROWS : {totalCnt}</Heading>
                <Heading fontSize={16}>PAGES : {pageLength}</Heading>
                <Heading fontSize={16}>
                  FILES : {Math.ceil(totalCnt / 65535)}
                </Heading>
              </Flex>
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="blue" mr={3} onClick={onClose}>
                Close
              </Button>
              <Button variant="ghost">DOWNLOAD</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Flex>
    </Flex>
  );
};

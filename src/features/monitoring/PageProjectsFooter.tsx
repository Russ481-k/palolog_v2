import { ChangeEvent, useState } from 'react';

import {
  Button,
  Flex,
  Input,
  InputGroup,
  InputLeftAddon, // Progress,
  // ProgressLabel,
  Select, // Heading,
  // Modal,
  // ModalBody,
  // ModalCloseButton,
  // ModalContent,
  // ModalFooter,
  // ModalHeader,
  // ModalOverlay,
  // Progress,
  // useDisclosure,
  useColorMode,
} from '@chakra-ui/react';

// import { AgGridReact } from 'ag-grid-react';
import PaginationButtons from './PaginationButtons';

export const PageProjectsFooter = ({
  nextCurrentPage,
  pageLength,
  totalCnt,
  onChangeLimit,
  onCurrentPageChange,
  // scrollProgress = { progress: 0, current: 0, total: 0, status: 'complete' },
}: {
  isLoading: boolean;
  nextCurrentPage: number;
  pageLength: number;
  totalCnt: number;
  onChangeLimit: (e: ChangeEvent<HTMLSelectElement>) => void;
  onCurrentPageChange: (page: number) => void;
  // scrollProgress?: ProgressStatus;
}) => {
  // const gridRef = useRef(null);

  const { colorMode } = useColorMode();
  // const { isOpen, onOpen, onClose } = useDisclosure();

  const [goToPage, setGoToPage] = useState<number>(1);
  const onGoToPageClick = () => {
    onCurrentPageChange(goToPage);
  };

  // const progressRef = useRef<ProgressStatus>(scrollProgress);

  // useEffect(() => {
  //   if (progressRef.current !== scrollProgress) {
  //     progressRef.current = scrollProgress;
  //     console.log('Progress updated:', scrollProgress);
  //   }
  // }, [scrollProgress]);

  // useEffect(() => {
  //   console.log('Footer received progress:', scrollProgress);
  // }, [scrollProgress]);

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
        {/* <Progress
          value={scrollProgress.progress}
          size="xs"
          w="200px"
          h="16px"
          borderRadius={6}
          isIndeterminate={false}
          colorScheme={scrollProgress.progress === 100 ? 'green' : 'blue'}
          transition="none"
        >
          <ProgressLabel
            fontSize="xs"
            color={
              scrollProgress.status === 'loading' ? 'blue.500' : 'gray.500'
            }
            fontWeight="normal"
          >
            {scrollProgress.status === 'error'
              ? 'Error'
              : scrollProgress.status === 'complete'
                ? 'Complete'
                : scrollProgress.progress === 0
                  ? 'Ready'
                  : `Loading... ${scrollProgress.progress}% (${scrollProgress.current.toLocaleString()}/${scrollProgress.total.toLocaleString()})`}
          </ProgressLabel>
        </Progress> */}
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
        {/* <Button size="sm" borderLeftRadius={0} onClick={onOpen}>
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
        </Modal> */}
      </Flex>
    </Flex>
  );
};

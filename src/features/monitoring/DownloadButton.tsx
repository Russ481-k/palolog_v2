import { useEffect, useRef, useState } from 'react';

import {
  Button,
  Flex,
  Heading,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Progress,
  useColorMode,
  useDisclosure,
} from '@chakra-ui/react';
import { AgGridReact } from 'ag-grid-react';

export const DownloadButton = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { colorMode } = useColorMode();
  const gridRef = useRef<AgGridReact>(null);
  const [totalCnt, setTotalCnt] = useState(0);
  const [pageLength, setPageLength] = useState(0);

  useEffect(() => {
    setTotalCnt(65151326);
    setPageLength(6513216516);
  }, []);

  return (
    <>
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
                rowData={[
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
                ]}
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
    </>
  );
};

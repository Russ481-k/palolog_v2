import React from 'react';

import { CheckCircleIcon, NotAllowedIcon } from '@chakra-ui/icons';
import { Box, Flex, GridItem, Text, useColorMode } from '@chakra-ui/react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

export const DaemonStatusCard = ({
  daemonStatus,
}: {
  daemonStatus: { dbms: 'active' | 'inactive'; parser: 'active' | 'inactive' };
}) => {
  const { colorMode } = useColorMode();

  return (
    <GridItem
      borderRadius="lg"
      bg={colorMode === 'light' ? 'white' : 'whiteAlpha.50'}
      borderWidth={1}
      borderColor={colorMode === 'light' ? 'gray.200' : 'whiteAlpha.300'}
      colSpan={1}
      overflow="hidden"
      height={{
        base: ' 260px',
        sm: '260px',
        md: '260px',
        lg: '260px',
        xl: '260px',
      }}
    >
      <Box
        display="grid"
        m="auto"
        alignItems="center"
        textAlign="center"
        justifyContent="center"
        height="260px"
      >
        <Box>
          <Text fontSize="xl" fontWeight="bold">
            Daemon 상태
          </Text>
          <Text fontSize="sm" fontWeight="regular">
            Daemon Status
          </Text>
        </Box>
        <Box width="200px">
          <Flex alignItems="center" justifyContent="space-between">
            <Text fontSize={40} fontWeight="extrabold">
              DBMS
            </Text>
            {daemonStatus.dbms === 'active' ? (
              <CheckCircleIcon
                color={colorMode === 'light' ? 'green.400' : 'green.300'}
                fontSize={40}
              />
            ) : (
              <NotAllowedIcon color="red.500" fontSize={40} />
            )}
          </Flex>
          <Flex alignItems="center" justifyContent="space-between">
            <Text fontSize={40} fontWeight="extrabold">
              Parser
            </Text>
            {daemonStatus.parser === 'active' ? (
              <CheckCircleIcon
                color={colorMode === 'light' ? 'green.400' : 'green.300'}
                fontSize={40}
              />
            ) : (
              <NotAllowedIcon color="red.500" fontSize={40} />
            )}
          </Flex>
        </Box>
        <Box />
      </Box>
    </GridItem>
  );
};

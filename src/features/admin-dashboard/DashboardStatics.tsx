import React from 'react';

import { Grid, Text } from '@chakra-ui/react';

import { DashboardStaticsThreatLog } from './grid/ThreatLog';
import { DashboardStaticsCpu } from './statics/CPU';
import { DashboardStaticsCollectionsCount } from './statics/CollectionsCount';
import { DashboardStaticsDisk } from './statics/Disk';
import { DashboardStaticsMemory } from './statics/Memory';
import { DashboardStaticsThreatLogData } from './statics/ThreatLogData';

export const DashboardStatics = () => {
  console.log('test');
  return (
    <Grid
      height="80vh"
      gap={3}
      templateColumns={{
        base: 'repeat(1, 6fr)',
        sm: 'repeat(1, 6fr)',
        md: 'repeat(2, 3fr)',
        lg: 'repeat(3, 2fr)',
        xl: 'repeat(4, 2fr)',
      }}
    >
      <DashboardStaticsCollectionsCount />
      <DashboardStaticsCpu />
      <DashboardStaticsDisk />
      <DashboardStaticsMemory />
      <DashboardStaticsThreatLog />
      <DashboardStaticsThreatLogData />
      <Text
        fontSize="xs"
        gridColumn="1/-1"
        textAlign="center"
        color="gray.500"
        style={{ textWrap: 'balance' }}
      >
        Copyright 2024. Yun Su-Bin all rights reserved.
      </Text>
    </Grid>
  );
};

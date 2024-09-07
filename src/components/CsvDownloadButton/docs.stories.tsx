import React from 'react';

import { CsvDownloadButton } from '.';

export default {
  title: 'components/CsvDownloadButton',
};

export const Default = () => (
  <CsvDownloadButton data={''} dateFromTo={'2024-01-01~2024-01-31'}>
    Add something
  </CsvDownloadButton>
);

export const WithCustomBreakpoints = () => (
  <CsvDownloadButton data="" dateFromTo={'2024-02-01~2024-02-31'}>
    Add something
  </CsvDownloadButton>
);

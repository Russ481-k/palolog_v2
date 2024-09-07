import React from 'react';

import { CsvDownloadButton } from '.';

export default {
  title: 'components/CsvDownloadButton',
};

export const Default = () => (
  <CsvDownloadButton data={''}>Add something</CsvDownloadButton>
);

export const WithCustomBreakpoints = () => (
  <CsvDownloadButton data="">Add something</CsvDownloadButton>
);

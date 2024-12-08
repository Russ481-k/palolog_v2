import { ColorMode } from '@chakra-ui/react';
import { AgChartOptions } from 'ag-charts-community';
import { AgCharts } from 'ag-charts-react';

export const AgChartsThemeChanged = ({
  colorMode,
  options,
}: {
  colorMode: ColorMode;
  options: AgChartOptions;
}) => {
  if (colorMode === 'light') {
    options.theme = 'ag-polychroma';
  } else if (colorMode === 'dark') {
    options.theme = 'ag-polychroma-dark';
  }
  return <AgCharts options={options} />;
};

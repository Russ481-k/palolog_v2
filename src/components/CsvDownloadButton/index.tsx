import { Button, ButtonProps, forwardRef } from '@chakra-ui/react';

type CsvDownloadButtonProps = ButtonProps & {
  data: string;
};

export const CsvDownloadButton = forwardRef<CsvDownloadButtonProps, 'button'>(
  ({ children, data, ...rest }, ref) => {
    const downloadCSV = () => {
      const dataString = data;
      const csvContent = 'data:text/csv;charset=utf-8,' + dataString;
      const encodedUri = encodeURI(csvContent);

      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', 'user_list.csv');

      document.body.appendChild(link);
      link.click();
      link.remove();
    };
    return (
      <Button ref={ref} {...rest} onClick={downloadCSV}>
        {children}
      </Button>
    );
  }
);

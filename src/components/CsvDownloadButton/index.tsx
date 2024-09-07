import { Button, ButtonProps, forwardRef } from '@chakra-ui/react';

import { csvDownload } from '@/lib/csvDownload';

type CsvDownloadButtonProps = ButtonProps & {
  data: string;
  dateFromTo: string;
};

export const CsvDownloadButton = forwardRef<CsvDownloadButtonProps, 'button'>(
  ({ children, data, dateFromTo, ...rest }, ref) => {
    return (
      <Button
        id={dateFromTo}
        ref={ref}
        {...rest}
        onClick={() => csvDownload(data, dateFromTo)}
      >
        {children}
      </Button>
    );
  }
);

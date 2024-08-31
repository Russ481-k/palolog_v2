import { StyleFunctionProps, Styles } from '@chakra-ui/theme-tools';

import * as externals from './externals';

const externalsStyles = (props: StyleFunctionProps) =>
  Object.values(externals).reduce(
    (acc: object, cur) => ({
      ...acc,
      ...(typeof cur === 'function' ? cur(props) : cur),
    }),
    {}
  );

export const styles: Styles = {
  global: (props) => ({
    html: {
      bg: 'gray.900',
    },
    body: {
      WebkitTapHighlightColor: 'transparent',
      bg: 'white',
      _dark: {
        bg: 'gray.900',
      },
    },
    '#chakra-toast-portal > *': {
      pt: 'safe-top',
      pl: 'safe-left',
      pr: 'safe-right',
      pb: 'safe-bottom',
    },
    form: {
      display: 'flex',
      flexDir: 'column',
      flex: 1,
    },
    '.rc-time-picker-input': {
      height: '32px !important',
      cursor: 'text',
      borderRadius: '0',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      fontSize: '14px !important',
      color: 'black',
      textAlign: 'center',
      alignItems: 'center',
      backgroundColor: 'white',
      borderColor: '#e2e8f0 !important',
      borderBottom: '1px soild #e2e8f0 !important',
      _dark: {
        color: 'white',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderColor: 'rgba(255, 255, 255, 0.06) !important',
        borderBottom: '1px soild rgba(255, 255, 255, 0.06) !important',
      },
    },
    '.rc-time-picker-panel': {
      color: 'black',
      width: '182px !important',
      backgroundColor: 'rgba(255,255,255,0)',
      overflow: 'hidden',
      _dark: {
        color: 'white',
      },
    },
    '.rc-time-picker-panel-inner': {
      color: 'black',
      overflow: 'hidden',
      borderRadius: '0',
      margin: '0px',
      boxShadow:
        '0 4px 6px -1px rgba(0, 0, 0, 0.1),0 2px 4px -1px rgba(0, 0, 0, 0.06) !important',
      borderColor: '#e2e8f0 !important',
      _dark: {
        color: 'white',
        backgroundColor: 'rgb(30,41,59)',
        borderColor: 'rgb(30,41,59) !important',
      },
    },
    '.rc-time-picker-panel-select': {
      color: 'black',
      fontSize: '16px !important',
      backgroundColor: 'white',
      width: '33.6% !important',
      _dark: {
        color: 'white',
        backgroundColor: 'rgb(30,41,59)',
        borderColor: 'rgba(255, 255, 255, 0.06) !important',
      },
    },
    '.rc-time-picker-panel-select li:hover': {
      color: 'black',
      fontSize: '16px !important',
      backgroundColor: 'white',
      _dark: {
        color: 'white',
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderColor: 'rgba(255, 255, 255, 0.06) !important',
      },
    },
    '.rc-time-picker-panel-select-option-selected': {
      color: 'black',
      backgroundColor: 'white',
      borderColor: 'rgba(255, 255, 255, 0.06) !important',
      _dark: {
        color: 'white',

        backgroundColor: 'rgba(255,255,255,0.05)',
      },
    },
    '.rc-time-picker-panel-input': {
      color: 'black',
      fontSize: '16px !important',
      backgroundColor: 'white',
      textAlign: 'center',
      _dark: {
        color: 'white',
        backgroundColor: 'rgb(30,41,59)',
      },
    },
    'rc-time-picker-panel-input-wrap': {
      height: '40px',
      backgroundColor: 'white',
      _dark: {
        color: 'white',
        backgroundColor: 'rgb(30,41,59)',
        borderColor: 'rgba(255, 255, 255, 0.06) !important',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06) !important',
      },
    },
    '.rc-time-picker-panel-input-wrap': {
      height: '40px',
      backgroundColor: 'white',
      _dark: {
        color: 'white',
        backgroundColor: 'rgb(30,41,59)',
        borderColor: 'rgba(255, 255, 255, 0.06) !important',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06) !important',
      },
    },
    ...externalsStyles(props),
  }),
};

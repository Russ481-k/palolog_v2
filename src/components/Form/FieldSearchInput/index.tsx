import { ReactNode } from 'react';

import {
  InputGroup,
  InputLeftElement,
  InputProps,
  InputRightElement,
} from '@chakra-ui/react';
import { Controller, FieldPath, FieldValues } from 'react-hook-form';

import { FieldCommonProps } from '@/components/Form/FormField';
import { FormFieldError } from '@/components/Form/FormFieldError';
import { FormFieldHelper } from '@/components/Form/FormFieldHelper';
import { FormFieldItem } from '@/components/Form/FormFieldItem';
import { FormFieldLabel } from '@/components/Form/FormFieldLabel';
import { SearchInput } from '@/components/SearchInput';

export type FieldSearchInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  type: 'search-input';
  label?: ReactNode;
  helper?: ReactNode;
  startElement?: ReactNode;
  endElement?: ReactNode;
} & Pick<
  InputProps,
  'borderRightRadius' | 'placeholder' | 'size' | 'autoFocus'
> &
  FieldCommonProps<TFieldValues, TName>;

export const FieldSearchInput = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(
  props: FieldSearchInputProps<TFieldValues, TName>
) => {
  return (
    <Controller
      {...props}
      render={({ field }) => (
        <FormFieldItem>
          {!!props.label && <FormFieldLabel>{props.label}</FormFieldLabel>}
          <InputGroup size={props.size}>
            <SearchInput
              type={props.type}
              placeholder={props.placeholder}
              autoFocus={props.autoFocus}
              borderRightRadius={props.borderRightRadius}
              {...field}
            />
            {!!props.startElement && (
              <InputLeftElement>{props.startElement}</InputLeftElement>
            )}
            {!!props.endElement && (
              <InputRightElement>{props.endElement}</InputRightElement>
            )}
          </InputGroup>
          {!!props.helper && <FormFieldHelper>{props.helper}</FormFieldHelper>}
          <FormFieldError />
        </FormFieldItem>
      )}
    />
  );
};

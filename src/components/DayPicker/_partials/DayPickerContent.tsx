import React, {
  ChangeEventHandler,
  RefObject,
  forwardRef,
  useState,
} from 'react';

import { Box, Button, Input, Portal } from '@chakra-ui/react';
import { setHours, setMinutes } from 'date-fns';
import en from 'date-fns/locale/en-US';
import dayjs from 'dayjs';
import {
  DayModifiers,
  ModifiersStyles,
  DayPicker as ReactDayPicker,
} from 'react-day-picker';
import FocusLock from 'react-focus-lock';
import { useTranslation } from 'react-i18next';

import { DayPickerProps } from '@/components/DayPicker';
import { Caption, Day } from '@/components/DayPicker/_partials';
import {
  DEFAULT_MODIFIERS,
  DEFAULT_MODIFIERS_STYLES,
} from '@/components/DayPicker/constants';
import { useDayPickerCalendarFocusController } from '@/components/DayPicker/hooks/useDayPickerCalendarFocusController';
import { UseDayPickerMonthNavigationValue } from '@/components/DayPicker/hooks/useDayPickerMonthNavigation';
import { UseDayPickerPopperManagementValue } from '@/components/DayPicker/hooks/useDayPickerPopperManagement';
import { matcherToArray } from '@/components/DayPicker/matcherToArray';
import { MonthPicker } from '@/components/MonthPicker';

type DayPickerContentProps = {
  timeValue: string;
  isCalendarFocused: boolean;
  setIsCalendarFocused: (value: boolean) => void;
  buttonRef: RefObject<HTMLButtonElement>;
  hookMonthNavigation: UseDayPickerMonthNavigationValue;
  handleSelectMonth: (date: Date) => void;
  handleChangeMonth: (date?: Date | null) => void;
  handleDaySelect: (date?: Date | null) => void;
  handleTimeSelect: (time: string) => void;
  handleOnTapEnter: () => void;
  value?: Date | null;
  popperManagement: UseDayPickerPopperManagementValue;
} & Omit<DayPickerProps, 'onChange'>;

export const DayPickerContent = forwardRef<
  HTMLDivElement,
  DayPickerContentProps
>(
  (
    {
      timeValue,
      isCalendarFocused,
      setIsCalendarFocused,
      buttonRef,
      hookMonthNavigation,
      handleSelectMonth,
      handleChangeMonth,
      handleOnTapEnter,
      dayPickerProps,
      handleDaySelect,
      handleTimeSelect,
      value,
      popperManagement,
      arePastDaysDisabled = false,
      usePortal = true,
      required = false,
      hasTodayButton = true,
      ...rest
    }: DayPickerContentProps,
    ref
  ) => {
    const { t } = useTranslation(['components']);
    const { mode, toggleMode, month } = hookMonthNavigation;
    // Gestion des modifiers et leurs styles

    const [selected, setSelected] = useState<Date>();

    const handleTimeChange: ChangeEventHandler<HTMLInputElement> = (e) => {
      const time = e.target.value;
      if (!selected) {
        handleTimeSelect(time);
        return;
      }
      const [hours, minutes] = time.split(':').map((str) => parseInt(str, 10));
      const newSelectedDate = setHours(
        setMinutes(selected, minutes ?? 0),
        hours ?? 0
      );
      setSelected(newSelectedDate);
      handleTimeSelect(time);
    };

    const modifiers: DayModifiers = {
      ...DEFAULT_MODIFIERS,
      ...dayPickerProps?.modifiers,
    };

    const modifiersStyles: ModifiersStyles = {
      ...DEFAULT_MODIFIERS_STYLES,
      ...dayPickerProps?.modifiersStyles,
    };

    const { popper, closePopper, isPopperOpen } = popperManagement;

    useDayPickerCalendarFocusController({
      isCalendarFocused,
      setIsCalendarFocused,
      closeCalendar: closePopper,
      onTapEnter: handleOnTapEnter,
    });

    const todayButtonProps = hasTodayButton
      ? {
          footer: (
            <Button
              onClick={() =>
                handleDaySelect(new Date(dayjs().startOf('day').toISOString()))
              }
              variant="@secondary"
              size="sm"
              w="full"
              mt="2"
              onBlur={() => (isCalendarFocused ? undefined : closePopper())} // fix tab not locked in popper issue
            >
              {t('components:dayPicker.today')}
            </Button>
          ),
        }
      : {};

    const content = (
      <Box
        tabIndex={-1}
        style={popper.styles.popper}
        {...popper.attributes.popper}
        ref={ref}
        zIndex={2}
        minW={250}
        role="dialog"
      >
        <FocusLock
          disabled={!isCalendarFocused}
          onDeactivation={() => setTimeout(() => buttonRef.current?.focus(), 0)} // setTimeout recommended by FocusLock
        >
          <Box
            shadow="md"
            bg="white"
            p={1}
            _dark={{
              bg: 'gray.800',
            }}
            {...rest}
          >
            {
              <form style={{ marginBlockEnd: '1em' }}>
                <Input
                  size="sm"
                  type="time"
                  value={timeValue}
                  onChange={handleTimeChange}
                />
              </form>
            }
            {mode === 'DAY' && (
              <ReactDayPicker
                mode="single"
                initialFocus={isCalendarFocused}
                month={month ?? undefined}
                onMonthChange={(date) => {
                  handleChangeMonth(date);
                }}
                selected={
                  new Date(dayjs(value).format('YYYY-MM-DD')) ?? undefined
                }
                onSelect={handleDaySelect}
                components={{
                  Caption: (props) => (
                    <Caption
                      {...props}
                      onCaptionLabelClick={toggleMode}
                      setMonth={(date) => {
                        handleChangeMonth(date);
                      }}
                    />
                  ),
                  Day,
                }}
                disabled={
                  arePastDaysDisabled
                    ? [
                        {
                          before: new Date(
                            dayjs().startOf('day').toISOString()
                          ),
                        },
                        ...matcherToArray(dayPickerProps?.disabled),
                      ]
                    : dayPickerProps?.disabled
                }
                modifiers={modifiers}
                modifiersStyles={modifiersStyles}
                {...todayButtonProps}
                locale={en}
                required={required}
              />
            )}
            {mode === 'MONTH' && (
              <MonthPicker
                year={month?.getFullYear()}
                onMonthClick={handleSelectMonth}
                onTodayButtonClick={() =>
                  handleSelectMonth(
                    new Date(dayjs().startOf('day').toISOString())
                  )
                }
              />
            )}
          </Box>
        </FocusLock>
      </Box>
    );

    return (
      <>
        {isPopperOpen &&
          (usePortal ? <Portal>{content}</Portal> : <>{content}</>)}
      </>
    );
  }
);

DayPickerContent.displayName = 'DayPickerContent';

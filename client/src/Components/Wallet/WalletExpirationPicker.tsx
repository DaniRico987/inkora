import type { ChangeEvent } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

type WalletExpirationPickerProps = {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  helperText?: string;
  disabled?: boolean;
};

const WalletExpirationPicker = ({
  label,
  value,
  onChange,
  helperText,
  disabled,
}: WalletExpirationPickerProps) => {
  const pickerValue = value ? dayjs(value, 'YYYY-MM-DD', true) : null;
  const selectedValue = pickerValue?.isValid() ? pickerValue : null;

  const handleChange = (nextValue: Dayjs | null) => {
    const nextDate = nextValue && nextValue.isValid()
      ? nextValue.endOf('month').format('YYYY-MM-DD')
      : '';

    onChange({
      target: {
        value: nextDate,
      },
    } as ChangeEvent<HTMLInputElement>);
  };

  return (
    <DatePicker
      label={label}
      value={selectedValue}
      onChange={handleChange}
      views={['year', 'month']}
      openTo="month"
      format="MM/YYYY"
      disabled={disabled}
      slotProps={{
        textField: {
          fullWidth: true,
          variant: 'outlined',
          size: 'small',
          helperText,
          sx: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              color: 'var(--color-text)',
              backgroundColor: 'var(--color-bg-secondary)',
            },
            '& .MuiInputLabel-root': {
              color: 'var(--color-text-muted)',
            },
            '& .MuiInputBase-input': {
              color: 'var(--color-text)',
            },
            '& .MuiSvgIcon-root': {
              color: 'var(--color-text-muted)',
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--color-border)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--color-primary-500)',
            },
            '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--color-primary-500)',
            },
          },
        },
        openPickerButton: {
          sx: {
            color: 'var(--color-text-muted)',
          },
        },
      }}
    />
  );
};

export default WalletExpirationPicker;
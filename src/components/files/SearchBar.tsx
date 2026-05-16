import { memo, useCallback } from 'react';
import { LIMITS } from '@/lib/validation';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

function SearchBarImpl({ value, onChange, placeholder = 'ПОИСК ФАЙЛОВ…' }: Props) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
    [onChange],
  );
  return (
    <input
      className="rename-input search"
      type="search"
      value={value}
      maxLength={LIMITS.searchMax}
      placeholder={placeholder}
      onChange={handleChange}
    />
  );
}

export const SearchBar = memo(SearchBarImpl);

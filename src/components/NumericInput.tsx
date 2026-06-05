import React, { useCallback } from 'react';

interface NumericInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  step?: number;
  style?: React.CSSProperties;
}

export const NumericInput: React.FC<NumericInputProps> = ({
  value, onChange, placeholder, className, step = 1, style
}) => {
  const updateValue = useCallback((delta: number) => {
    try {
      const current = BigInt(value || '0');
      const next = current + BigInt(delta);
      onChange(next >= 0n ? next.toString() : '0');
    } catch (e) {
      // If not a valid number, don't update or reset to 0
      onChange('0');
    }
  }, [value, onChange]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      updateValue(step);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      updateValue(-step);
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      updateValue(step);
    } else {
      updateValue(-step);
    }
  };

  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value.replace(/[^0-9]/g, ''))}
      onKeyDown={onKeyDown}
      onWheel={onWheel}
      placeholder={placeholder}
      className={`modern-input ${className || ''}`}
      style={style}
    />
  );
};

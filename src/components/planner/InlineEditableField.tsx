import React from 'react';

type InlineEditableFieldProps = {
  isEditing: boolean;
  value: string;
  title: string;
  onChange: (value: string) => void;
  className?: string;
  displayClassName?: string;
  multiline?: boolean;
};

export function InlineEditableField({
  isEditing,
  value,
  title,
  onChange,
  className,
  displayClassName,
  multiline = false,
}: InlineEditableFieldProps) {
  if (!isEditing) {
    return <p className={displayClassName}>{value}</p>;
  }

  if (multiline) {
    return (
      <textarea
        title={title}
        value={value}
        onChange={event => onChange(event.target.value)}
        className={className}
      />
    );
  }

  return (
    <input
      title={title}
      value={value}
      onChange={event => onChange(event.target.value)}
      className={className}
    />
  );
}

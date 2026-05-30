import { useState } from 'react';

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  /** Called when the user presses Enter (commits the search). */
  onSubmit: () => void;
};

/** A rounded search pill that expands into an input on click. */
export const SearchBar = ({ value, onChange, onSubmit }: SearchBarProps) => {
  const [open, setOpen] = useState(false);
  const expanded = open || value.length > 0;

  return (
    <div className="flex items-center h-9 rounded-full border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-3 text-gray-500 dark:text-gray-400">
      <button
        aria-label="Search"
        onClick={() => setOpen(true)}
        className="cursor-pointer"
      >
        🔍
      </button>
      {expanded && (
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onSubmit();
              setOpen(false);
              e.currentTarget.blur();
            }
          }}
          onBlur={() => setOpen(false)}
          placeholder="Search"
          className="ml-2 w-28 sm:w-40 bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
        />
      )}
    </div>
  );
};

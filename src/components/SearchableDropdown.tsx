import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, Sparkles } from 'lucide-react';

export interface DropdownOption {
  label: string;
  value: string;
  badge?: string;
  hint?: string;
}

interface SearchableDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: (string | DropdownOption)[];
  placeholder?: string;
  label?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  inputClassName?: string;
  compact?: boolean;
  emptyPrompt?: string;
  allowCustom?: boolean;
  accentColor?: 'blue' | 'emerald' | 'amber' | 'purple';
}

export const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select or type...',
  label,
  icon,
  disabled = false,
  required = false,
  className = '',
  inputClassName = '',
  compact = false,
  emptyPrompt = 'No preset matches found. You can type any custom value.',
  allowCustom = true,
  accentColor = 'blue',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Normalize options to DropdownOption format and filter out duplicates or empty items
  const normalizedOptions: DropdownOption[] = (() => {
    const uniqueList: DropdownOption[] = [];
    const seen = new Set<string>();
    options.forEach((opt) => {
      if (!opt) return;
      const parsed = typeof opt === 'string' ? { label: opt, value: opt } : opt;
      if (!parsed.value || !parsed.value.trim()) return;
      
      const lower = parsed.value.toLowerCase().trim();
      if (!seen.has(lower)) {
        seen.add(lower);
        uniqueList.push({
          label: parsed.label.trim(),
          value: parsed.value.trim(),
          badge: parsed.badge,
          hint: parsed.hint,
        });
      }
    });
    return uniqueList;
  })();

  // Filter options based on user text (case-insensitive)
  const filteredOptions = normalizedOptions.filter((opt) =>
    opt.label.toLowerCase().includes((value || '').toLowerCase().trim())
  );

  // Check if current value matches an existing option exactly
  const exactMatch = normalizedOptions.some(
    (opt) => opt.value.toLowerCase() === (value || '').toLowerCase().trim()
  );

  // Accent color classes
  const focusBorderColor = {
    blue: 'focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30',
    emerald: 'focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30',
    amber: 'focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/30',
    purple: 'focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30',
  }[accentColor];

  const activeBgColor = {
    blue: 'bg-blue-600/20 text-blue-300 border-blue-500/30',
    emerald: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30',
    amber: 'bg-yellow-600/20 text-yellow-300 border-yellow-500/30',
    purple: 'bg-purple-600/20 text-purple-300 border-purple-500/30',
  }[accentColor];

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  // Keep highlighted item in view
  useEffect(() => {
    if (isOpen && listRef.current && highlightedIndex >= 0) {
      const items = listRef.current.children;
      if (items[highlightedIndex]) {
        (items[highlightedIndex] as HTMLElement).scrollIntoView({
          block: 'nearest',
        });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
      }
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
        e.preventDefault();
        handleSelect(filteredOptions[highlightedIndex].value);
      } else if (isOpen) {
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1">
            {icon}
            {label}
            {required && <span className="text-rose-400 ml-0.5">*</span>}
          </span>
          <span className="text-[10px] text-slate-500 font-normal">
            Select or Type
          </span>
        </label>
      )}

      {/* Input container */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          required={required}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onClick={() => {
            if (!disabled) setIsOpen(true);
          }}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full rounded-lg border border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
            compact ? 'px-2 py-1 text-xs pr-14' : 'px-3 py-2 text-sm pr-16'
          } ${focusBorderColor} ${inputClassName}`}
        />

        {/* Right buttons: Clear (X) + Dropdown toggle arrow */}
        <div className="absolute right-1.5 flex items-center gap-0.5">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="Clear input"
            >
              <X className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
            </button>
          )}

          <button
            type="button"
            disabled={disabled}
            onClick={handleToggle}
            className={`p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-transform ${
              isOpen ? 'rotate-180 text-blue-400' : ''
            }`}
            title="Toggle dropdown options"
          >
            <ChevronDown className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
          </button>
        </div>
      </div>

      {/* Floating Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden backdrop-blur-md animate-in fade-in zoom-in-95 duration-100">
          {/* Header count info */}
          <div className="px-3 py-1.5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              {filteredOptions.length > 0
                ? `${filteredOptions.length} available ${filteredOptions.length === 1 ? 'option' : 'options'}`
                : 'Custom input mode'}
            </span>
            <span className="text-[10px] text-slate-500">Tap to select</span>
          </div>

          <ul
            ref={listRef}
            className="max-h-56 overflow-y-auto p-1 space-y-0.5 divide-y divide-slate-800/40 text-xs"
          >
            {/* If user typed custom text not matching anything exactly */}
            {allowCustom && value.trim() && !exactMatch && (
              <li>
                <button
                  type="button"
                  onClick={() => handleSelect(value.trim())}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between text-blue-300 hover:bg-blue-600/20 bg-blue-950/30 border border-blue-500/20 transition-colors"
                >
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>Use &ldquo;{value.trim()}&rdquo;</span>
                  </span>
                  <span className="text-[10px] bg-blue-500/20 px-1.5 py-0.5 rounded text-blue-300 border border-blue-500/30">
                    Custom Entry
                  </span>
                </button>
              </li>
            )}

            {/* List of matching options */}
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const isSelected =
                  (value || '').toLowerCase().trim() === opt.value.toLowerCase().trim();
                const isHighlighted = idx === highlightedIndex;

                return (
                  <li key={`${opt.value}-${idx}`}>
                    <button
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        isSelected
                          ? `${activeBgColor} font-bold border`
                          : isHighlighted
                          ? 'bg-slate-800 text-slate-100'
                          : 'text-slate-300 hover:bg-slate-800/70 hover:text-slate-100'
                      }`}
                    >
                      <div className="flex flex-col pr-2 min-w-0">
                        <span className="truncate">{opt.label}</span>
                        {opt.hint && (
                          <span className="text-[10px] text-slate-400 truncate">
                            {opt.hint}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {opt.badge && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            {opt.badge}
                          </span>
                        )}
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        )}
                      </div>
                    </button>
                  </li>
                );
              })
            ) : (
              <li className="px-3 py-3 text-center text-slate-400 text-xs">
                {value.trim() ? (
                  <div>
                    <p className="text-slate-300 font-medium mb-1">
                      No preset match for &ldquo;{value}&rdquo;
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Press enter or keep typing to use this as your custom value.
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">{emptyPrompt}</p>
                )}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

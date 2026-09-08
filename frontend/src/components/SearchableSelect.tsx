import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function SearchableSelect({ options, value, onChange, placeholder, creatable, onCreate, disabled, tabIndex, onTabNext, autoFocus, dataAttr }: {
  options: { label: string, value: any }[],
  value: any,
  onChange: (val: any) => void,
  placeholder?: string,
  creatable?: boolean,
  onCreate?: (name: string) => void,
  disabled?: boolean,
  tabIndex?: number,
  onTabNext?: () => void,
  autoFocus?: boolean,
  dataAttr?: Record<string, string>,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [dropdownStyle, setDropdownStyle] = useState({ top: 0, left: 0, width: 0 });

  const selectedOption = options.find(o => String(o.value) === String(value));
  const displayLabel = selectedOption ? selectedOption.label : (creatable && value && value !== 0 ? value : (placeholder || 'Select...'));

  const filteredOptions = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));

  useLayoutEffect(() => {
    if (isOpen && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setDropdownStyle({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [isOpen]);

  const didAutoFocus = useRef(false);

  useEffect(() => {
    if (autoFocus && !disabled && !didAutoFocus.current) {
      didAutoFocus.current = true;
      const timer = setTimeout(() => {
        triggerRef.current?.focus();
        setIsOpen(true);
      }, 80);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (isOpen) setHighlightedIndex(0);
  }, [isOpen, search]);

  useEffect(() => {
    if (isOpen && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (target.closest('.searchable-select-dropdown')) return;
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleScroll(event: Event) {
      const target = event.target as HTMLElement;
      if (target.closest && target.closest('.searchable-select-dropdown')) return;
      setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', () => setIsOpen(false));
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', () => setIsOpen(false));
    };
  }, [isOpen]);

  const selectOption = (option: { label: string; value: any }) => {
    onChange(option.value);
    setIsOpen(false);
    setSearch('');
    setTimeout(() => onTabNext?.(), 50);
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
    } else if (e.key === 'Tab') {
      // Allow normal tab without opening
    }
  };

  const handleTriggerFocus = () => {
    if (!disabled) setIsOpen(true);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(i => Math.min(i + 1, filteredOptions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (creatable && search.trim() && filteredOptions.length === 0) {
        onCreate?.(search.trim());
        setIsOpen(false);
        setSearch('');
      } else if (filteredOptions[highlightedIndex]) {
        selectOption(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      setIsOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        selectOption(filteredOptions[highlightedIndex]);
      } else {
        setIsOpen(false);
        onTabNext?.();
      }
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full text-[13px]">
      <div
        ref={triggerRef}
        tabIndex={disabled ? -1 : (tabIndex ?? 0)}
        onClick={() => { if (!disabled) setIsOpen(!isOpen); }}
        onKeyDown={handleTriggerKeyDown}
        onFocus={handleTriggerFocus}
        {...(dataAttr ?? {})}
        className={`w-full px-2 py-1.5 border border-[#D1D5DB] rounded flex justify-between items-center outline-none
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white cursor-pointer'}
          focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]`}
      >
        <span className={value && value !== 0 && value !== '' ? 'text-[#1F2937] font-bold' : 'text-gray-400 truncate'}>
          {displayLabel}
        </span>
        <ChevronDown size={14} className="text-gray-500 shrink-0" />
      </div>

      {isOpen && createPortal(
        <div
          className="searchable-select-dropdown absolute z-[9999] bg-white border border-[#D1D5DB] rounded shadow-lg text-[13px]"
          style={{ top: dropdownStyle.top, left: dropdownStyle.left, width: dropdownStyle.width }}
        >
          <div className="p-2 border-b border-[#E5E7EB]">
            <div className="flex items-center px-2 py-1 border border-[#D1D5DB] rounded bg-[#F9FAFB]">
              <Search size={12} className="text-gray-400 mr-2 shrink-0" />
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search..."
                className="w-full bg-transparent outline-none text-[12px]"
              />
            </div>
          </div>
          <div ref={listRef} className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 && !creatable && (
              <div className="px-3 py-2 text-gray-400 text-center">No results found</div>
            )}
            {filteredOptions.map((option, idx) => (
              <div
                key={option.value}
                onClick={() => selectOption(option)}
                className={`px-3 py-2 cursor-pointer transition-colors
                  ${idx === highlightedIndex ? 'bg-[#3B82F6] text-white font-bold' :
                    String(value) === String(option.value) ? 'bg-[#EFF6FF] text-[#3B82F6] font-bold' : 'text-[#374151] hover:bg-[#EFF6FF]'}`}
              >
                {option.label}
              </div>
            ))}
            {creatable && search.trim() && !options.some(o => o.label.toLowerCase() === search.trim().toLowerCase()) && (
              <div
                onClick={() => { onCreate?.(search.trim()); setIsOpen(false); setSearch(''); }}
                className="px-3 py-2 cursor-pointer hover:bg-[#EFF6FF] transition-colors text-[#10B981] font-bold flex items-center gap-2 border-t border-[#E5E7EB]"
              >
                <span className="bg-[#10B981] text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">+</span>
                Create "{search.trim()}"
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

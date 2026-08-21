import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function SearchableSelect({ options, value, onChange, placeholder, creatable, onCreate }: {
  options: { label: string, value: any }[],
  value: any,
  onChange: (val: any) => void,
  placeholder?: string,
  creatable?: boolean,
  onCreate?: (name: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [dropdownStyle, setDropdownStyle] = useState({ top: 0, left: 0, width: 0 });

  // If the value is not in options, but it has a string value (when creatable is used and we are waiting for API), 
  // or it might just be 0. We display selectedOption.label. 
  // If it's a new temporary string, we can just show the string itself.
  const selectedOption = options.find(o => String(o.value) === String(value));
  const displayLabel = selectedOption ? selectedOption.label : (creatable && value && value !== 0 ? value : (placeholder || "Select..."));

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
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", handleScroll, true); 
      window.addEventListener("resize", () => setIsOpen(false));
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", () => setIsOpen(false));
    };
  }, [isOpen]);

  const filteredOptions = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = () => {
    if (onCreate && search.trim()) {
      onCreate(search.trim());
      setIsOpen(false);
      setSearch('');
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full text-[13px]">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-2 py-1.5 border border-[#D1D5DB] rounded bg-white flex justify-between items-center cursor-pointer focus-within:border-[#3B82F6]"
      >
        <span className={value && value !== 0 && value !== '' ? "text-[#1F2937] font-bold" : "text-gray-400 truncate"}>
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
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation();
                    setIsOpen(false);
                  } else if (e.key === 'Enter' && creatable && search.trim() && filteredOptions.length === 0) {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
                placeholder="Search..."
                className="w-full bg-transparent outline-none text-[12px]"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 && !creatable && (
              <div className="px-3 py-2 text-gray-400 text-center">No results found</div>
            )}
            
            {filteredOptions.map(option => (
              <div 
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                  setSearch('');
                }}
                className={`px-3 py-2 cursor-pointer hover:bg-[#EFF6FF] transition-colors ${String(value) === String(option.value) ? 'bg-[#EFF6FF] text-[#3B82F6] font-bold' : 'text-[#374151]'}`}
              >
                {option.label}
              </div>
            ))}

            {creatable && search.trim() && !options.some(o => o.label.toLowerCase() === search.trim().toLowerCase()) && (
              <div 
                onClick={handleCreate}
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

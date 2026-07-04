import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

export interface DropdownOptionObject {
  value: string;
  label: string;
}

export type DropdownOption = string | DropdownOptionObject;

interface SearchableDropdownProps {
  label: string;
  options: DropdownOption[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  emptyLabel?: string;
}

export function SearchableDropdown({
  label,
  options,
  value,
  onChange,
  placeholder = "Search...",
  emptyLabel = "No options found"
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Normalize options to objects
  const normalizedOptions: DropdownOptionObject[] = options.map(opt => 
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  // Filter options based on search term (comparing against label)
  const filteredOptions = normalizedOptions.filter(opt =>
    (opt.label || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Find label for active value
  const activeOption = normalizedOptions.find(opt => opt.value === value);
  const displayVal = activeOption 
    ? (activeOption.value === 'All' ? `All ${label}s` : activeOption.label)
    : (value === 'All' ? `All ${label}s` : value);

  return (
    <div className="relative space-y-1" ref={dropdownRef}>
      <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider">{label}</label>
      
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchTerm('');
        }}
        className="w-full flex items-center justify-between text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none bg-white font-sans text-slate-700 hover:border-slate-350 hover:bg-slate-50/50 transition-all text-left cursor-pointer shadow-2xs"
      >
        <span className="truncate">{displayVal || `Select ${label}...`}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-450 shrink-0 ml-1.5 transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </button>

      {/* Popover overlay */}
      {isOpen && (
        <div className="absolute left-0 mt-1 w-full min-w-[180px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 animate-scale-up font-sans border-slate-200/80">
          {/* Search box (Only if options length is relatively large, e.g. > 5 items) */}
          {options.length > 5 && (
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 text-xs border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/60 text-slate-800"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          
          {/* Scrollable Options list */}
          <div className="max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="text-slate-400 italic text-[11px] p-2 text-center">{emptyLabel}</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md transition-colors text-left cursor-pointer ${
                      isSelected 
                        ? 'bg-blue-50 text-blue-700 font-semibold' 
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="truncate">{opt.value === 'All' ? `All ${label}s` : opt.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

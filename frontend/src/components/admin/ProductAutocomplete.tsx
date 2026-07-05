import { useState, useEffect, useRef } from 'react';
import apiClient from '@/services/api';

interface ProductOption {
  id?: number;
  name_en: string;
  name_bn: string | null;
}

interface ProductAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  lockOnSelect?: boolean;
}

export default function ProductAutocomplete({ value, onChange, className, lockOnSelect = false }: ProductAutocompleteProps) {
  const [allProducts, setAllProducts] = useState<ProductOption[]>([]);
  const [inputValue, setInputValue] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<ProductOption[]>([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [selectionLocked, setSelectionLocked] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Fetch all product names once
  useEffect(() => {
    apiClient.get('/order-management/product-names')
      .then((res) => {
        if (Array.isArray(res.data)) setAllProducts(res.data);
      })
      .catch(() => {});
  }, []);

  // Sync external value changes
  useEffect(() => {
    setInputValue(value);
    if (!value.trim()) {
      setSelectionLocked(false);
      setShowDropdown(false);
    }
  }, [value]);

  // Filter products as user types — match against both English and Bengali names
  useEffect(() => {
    if (selectionLocked || !inputValue.trim()) {
      setFilteredProducts([]);
      setShowDropdown(false);
      return;
    }
    const query = inputValue.toLowerCase();
    const matches = allProducts.filter(
      (p) =>
        p.name_en.toLowerCase().includes(query) ||
        (p.name_bn && p.name_bn.includes(query))
    );
    setFilteredProducts(matches);
    setShowDropdown(matches.length > 0);
    setHighlightIndex(-1);
  }, [inputValue, allProducts, selectionLocked]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const items = listRef.current.children;
      if (items[highlightIndex]) {
        (items[highlightIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightIndex]);

  const selectProduct = (product: ProductOption) => {
    setInputValue(product.name_en);
    onChange(product.name_en);
    setSelectionLocked(lockOnSelect);
    setShowDropdown(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectionLocked) return;
    const val = e.target.value;
    setSelectionLocked(false);
    setInputValue(val);
    // Always propagate the typed value so the parent filter stays in sync.
    // An empty string clears the filter; any other text triggers ILIKE search on the backend.
    onChange(val.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev < filteredProducts.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < filteredProducts.length) {
        selectProduct(filteredProducts[highlightIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="font-semibold text-blue-600">{text.slice(idx, idx + query.length)}</span>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (selectionLocked) return;
          if (inputValue.trim() && filteredProducts.length > 0) {
            setShowDropdown(true);
          }
        }}
        readOnly={selectionLocked}
        placeholder="Type to search products..."
        className={className || 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'}
      />
      {inputValue.trim() && (
        <button
          type="button"
          onClick={() => {
            setInputValue('');
            setSelectionLocked(false);
            onChange('');
            setShowDropdown(false);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
          title="Clear"
        >
          ✕
        </button>
      )}
      {showDropdown && filteredProducts.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {filteredProducts.map((product, idx) => (
            <li
              key={product.id || product.name_en}
              onClick={() => selectProduct(product)}
              onMouseEnter={() => setHighlightIndex(idx)}
              className={`px-3 py-2 text-sm cursor-pointer ${
                idx === highlightIndex ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
              }`}
            >
              <div>{highlightMatch(product.name_en, inputValue)}</div>
              {product.name_bn && (
                <div className="text-xs text-gray-500 mt-0.5">
                  {highlightMatch(product.name_bn, inputValue)}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

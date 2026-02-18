import { useState, useEffect, useRef } from 'react';
import apiClient from '@/services/api';

interface ProductAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function ProductAutocomplete({ value, onChange, className }: ProductAutocompleteProps) {
  const [allProducts, setAllProducts] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<string[]>([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);
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
  }, [value]);

  // Filter products as user types
  useEffect(() => {
    if (!inputValue.trim()) {
      setFilteredProducts([]);
      setShowDropdown(false);
      return;
    }
    const query = inputValue.toLowerCase();
    const matches = allProducts.filter((p) => p.toLowerCase().includes(query));
    setFilteredProducts(matches);
    setShowDropdown(matches.length > 0);
    setHighlightIndex(-1);
  }, [inputValue, allProducts]);

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

  const selectProduct = (product: string) => {
    setInputValue(product);
    onChange(product);
    setShowDropdown(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (!val.trim()) {
      onChange('');
    }
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
          if (inputValue.trim() && filteredProducts.length > 0) {
            setShowDropdown(true);
          }
        }}
        placeholder="Type to search products..."
        className={className || 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'}
      />
      {inputValue.trim() && (
        <button
          type="button"
          onClick={() => {
            setInputValue('');
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
              key={product}
              onClick={() => selectProduct(product)}
              onMouseEnter={() => setHighlightIndex(idx)}
              className={`px-3 py-2 text-sm cursor-pointer ${
                idx === highlightIndex ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
              }`}
            >
              {highlightMatch(product, inputValue)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaChevronRight, FaSearch, FaTimes } from 'react-icons/fa';
import { products as productsApi } from '@/services/api';

type VariantOption = {
  name: string;
  price?: number | string;
  stock?: number | string;
  sku_suffix?: string;
};

type ProductOption = {
  id: number;
  name?: string;
  nameEn?: string;
  nameBn?: string;
  name_en?: string;
  name_bn?: string;
  sku?: string;
  status?: string;
  price?: number;
  basePrice?: number;
  sale_price?: number | string | null;
  salePrice?: number | null;
  size_variants?: VariantOption[] | string | null;
  sizeVariants?: VariantOption[] | string | null;
};

type InventoryProductPickerProps = {
  products?: ProductOption[];
  productId?: string | number | null;
  variantKey?: string | null;
  onChange: (productId: string, variantKey?: string, product?: ProductOption | null, variant?: VariantOption | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowBaseProduct?: boolean;
};

const parseVariants = (product?: ProductOption | null): VariantOption[] => {
  if (!product) return [];
  let raw = product.sizeVariants ?? product.size_variants;
  if (!raw) return [];
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw.filter((variant: any) => variant && typeof variant.name === 'string' && variant.name.trim());
};

const productName = (product?: ProductOption | null) =>
  product?.name || product?.nameEn || product?.name_en || `Product #${product?.id || ''}`;

const productNameBn = (product?: ProductOption | null) => product?.nameBn || product?.name_bn || '';

const productPrice = (product?: ProductOption | null) =>
  Number(product?.salePrice ?? product?.sale_price ?? product?.price ?? product?.basePrice ?? 0);

export default function InventoryProductPicker({
  products,
  productId,
  variantKey,
  onChange,
  placeholder = 'Type to search products...',
  className,
  disabled = false,
  allowBaseProduct = true,
}: InventoryProductPickerProps) {
  const [internalProducts, setInternalProducts] = useState<ProductOption[]>([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null);
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const allProducts = products || internalProducts;

  useEffect(() => {
    if (products) return;
    productsApi.listAll()
      .then((items) => setInternalProducts(Array.isArray(items) ? items : []))
      .catch(() => setInternalProducts([]));
  }, [products]);

  const selectedProduct = useMemo(
    () => allProducts.find((product) => String(product.id) === String(productId || '')) || null,
    [allProducts, productId],
  );

  const selectedLabel = selectedProduct
    ? `${productName(selectedProduct)}${variantKey ? ` (${variantKey})` : ''}`
    : '';

  useEffect(() => {
    if (!open) setQuery(selectedLabel);
  }, [open, selectedLabel]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideInput = wrapperRef.current?.contains(target);
      const isInsideDropdown = dropdownRef.current?.contains(target);
      if (!isInsideInput && !isInsideDropdown) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const viewportGap = 12;
      const spaceBelow = window.innerHeight - rect.bottom - viewportGap;
      const spaceAbove = rect.top - viewportGap;
      const maxHeight = Math.max(220, Math.min(360, Math.max(spaceBelow, spaceAbove)));
      const openAbove = spaceBelow < 260 && spaceAbove > spaceBelow;

      setDropdownStyle({
        position: 'fixed',
        zIndex: 9999,
        left: rect.left,
        top: openAbove ? undefined : rect.bottom + 4,
        bottom: openAbove ? window.innerHeight - rect.top + 4 : undefined,
        width: rect.width,
        maxHeight,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    const source = allProducts;
    if (!term) return source.slice(0, 30);
    return source
      .filter((product) => {
        const variants = parseVariants(product).map((variant) => variant.name).join(' ');
        return `${productName(product)} ${productNameBn(product)} ${product.sku || ''} ${product.id} ${variants}`
          .toLowerCase()
          .includes(term);
      })
      .slice(0, 30);
  }, [allProducts, query]);

  const selectProduct = (product: ProductOption, variant?: VariantOption | null) => {
    const nextVariant = variant?.name || '';
    onChange(String(product.id), nextVariant, product, variant || null);
    setQuery(`${productName(product)}${nextVariant ? ` (${nextVariant})` : ''}`);
    setOpen(false);
    setExpandedProductId(null);
  };

  const clearSelection = () => {
    onChange('', '', null, null);
    setQuery('');
    setOpen(false);
    setExpandedProductId(null);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
        <input
          type="text"
          disabled={disabled}
          value={open ? query : selectedLabel}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setQuery(selectedLabel);
            setOpen(true);
          }}
          placeholder={placeholder}
          className={className || 'w-full border rounded px-8 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'}
        />
        {(productId || query) && !disabled ? (
          <button type="button" onClick={clearSelection} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" title="Clear product">
            <FaTimes size={12} />
          </button>
        ) : null}
      </div>

      {open && !disabled ? createPortal(
        <div ref={dropdownRef} style={dropdownStyle} className="overflow-y-auto rounded-lg border bg-white shadow-lg">
          {filteredProducts.length === 0 ? (
            <div className="px-3 py-3 text-sm text-gray-500">No products found</div>
          ) : (
            filteredProducts.map((product) => {
              const variants = parseVariants(product);
              const isExpanded = expandedProductId === product.id;
              return (
                <div key={product.id} className="border-b last:border-b-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (variants.length > 0) setExpandedProductId(isExpanded ? null : product.id);
                      else selectProduct(product);
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-blue-50"
                  >
                    {variants.length > 0 ? (
                      <FaChevronRight className={`text-xs text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    ) : (
                      <span className="w-3" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-gray-900">{productName(product)}</div>
                      <div className="truncate text-xs text-gray-500">
                        SKU: {product.sku || 'N/A'}{product.status && product.status !== 'active' ? ` | ${product.status}` : ''}
                      </div>
                      {variants.length > 0 ? <div className="text-xs text-blue-600">{variants.length} variant{variants.length > 1 ? 's' : ''}</div> : null}
                    </div>
                    {variants.length === 0 ? <div className="text-sm font-semibold text-blue-600">৳{productPrice(product).toFixed(2)}</div> : null}
                  </button>

                  {variants.length > 0 && isExpanded ? (
                    <div className="border-t bg-gray-50">
                      {variants.map((variant, index) => (
                        <button
                          key={`${product.id}-${variant.name}-${index}`}
                          type="button"
                          onClick={() => selectProduct(product, variant)}
                          className="flex w-full items-center gap-3 border-b border-gray-100 px-8 py-2 text-left last:border-b-0 hover:bg-blue-100"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm text-gray-800">{variant.name}</div>
                            {variant.sku_suffix ? <div className="text-xs text-gray-400">SKU: {variant.sku_suffix}</div> : null}
                          </div>
                          <div className="text-right">
                            {variant.price != null ? <div className="text-sm font-semibold text-green-600">৳{Number(variant.price).toFixed(2)}</div> : null}
                            {variant.stock != null ? <div className="text-xs text-gray-400">Stock: {variant.stock}</div> : null}
                          </div>
                        </button>
                      ))}
                      {allowBaseProduct ? (
                        <button
                          type="button"
                          onClick={() => selectProduct(product)}
                          className="flex w-full items-center justify-between px-8 py-2 text-left text-sm italic text-gray-500 hover:bg-yellow-50"
                        >
                          <span>Base product (no variant)</span>
                          <span className="font-semibold not-italic text-blue-600">৳{productPrice(product).toFixed(2)}</span>
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>,
        document.body,
      ) : null}
    </div>
  );
}

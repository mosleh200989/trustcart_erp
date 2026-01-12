import Link from 'next/link';
import { useState } from 'react';

interface ProductCardProps {
  id: number;
  slug?: string; // ADD: slug prop
  name: string;
  nameEn?: string;
  nameBn?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  image?: string;
  thumb?: string;
  stock?: number;
  sold?: number;
  rating?: number;
  reviews?: number;
}

export default function ProductCard({
  id,
  slug, // ADD: slug parameter
  name,
  nameEn = name,
  nameBn = '',
  price,
  originalPrice,
  discount = 0,
  image = '/default-product.png',
  thumb,
  stock = 100,
  sold = 0,
  rating = 5,
  reviews = 0
}: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Use thumb for card display, fallback to image
  const displayImage = (thumb || image || '').trim();
  const safeImage = !imageError && displayImage ? displayImage : '/default-product.png';

  const addToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingItem = cart.find((item: any) => item.id === id);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({
        id,
        name: nameEn,
        nameBn,
        price,
        image,
        quantity: 1
      });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
    
    // Show toast notification
    alert(`✅ ${nameEn} added to cart!`);
  };

  const discountPercent = discount || (originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0);

  return (
    <div
      className="product-card"
      style={{
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        backgroundColor: 'white',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 4px rgba(0,0,0,0.08)'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/product/${slug || id}`} className="text-decoration-none" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'relative', paddingTop: '100%', backgroundColor: '#f5f5f5' }}>
          <img
            src={safeImage}
            alt={nameEn}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.3s ease',
              transform: isHovered ? 'scale(1.05)' : 'scale(1)'
            }}
            onError={() => setImageError(true)}
          />
          {discountPercent > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                backgroundColor: '#d32f2f',
                color: 'white',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: '700'
              }}
            >
              -{discountPercent}%
            </span>
          )}
          {stock === 0 && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(0,0,0,0.8)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '4px',
                fontSize: '0.9rem',
                fontWeight: '600'
              }}
            >
              Out of Stock
            </div>
          )}
        </div>

        <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '8px', minHeight: '45px' }}>
            {nameBn && nameEn && (
              <div style={{
                fontSize: '0.95rem',
                fontWeight: '500',
                color: '#323232',
                marginBottom: '2px',
                lineHeight: '1.3'
              }}>
                {nameBn} | {nameEn}
              </div>
            )}
            {!nameBn && (
              <div style={{
                fontSize: '0.95rem',
                fontWeight: '500',
                color: '#323232',
                lineHeight: '1.3'
              }}>
                {nameEn}
              </div>
            )}
          </div>

          <div style={{ marginTop: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{
                fontSize: '1.1rem',
                fontWeight: '700',
                color: '#1b5e20'
              }}>
                ৳{price}
              </span>
              {originalPrice && originalPrice > price && (
                <span style={{
                  fontSize: '0.9rem',
                  color: '#999',
                  textDecoration: 'line-through'
                }}>
                  ৳{originalPrice}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
      
      <div style={{ padding: '0 12px 12px' }}>
        <button
          onClick={addToCart}
          disabled={stock === 0}
          style={{
            width: '100%',
            padding: '8px',
            backgroundColor: stock === 0 ? '#ccc' : '#1b5e20',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '0.9rem',
            fontWeight: '600',
            cursor: stock === 0 ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.3s ease'
          }}
          onMouseEnter={(e) => {
            if (stock > 0) e.currentTarget.style.backgroundColor = '#2d7a3a';
          }}
          onMouseLeave={(e) => {
            if (stock > 0) e.currentTarget.style.backgroundColor = '#1b5e20';
          }}
        >
          {stock === 0 ? 'Out of Stock' : '🛒 Add to Cart'}
        </button>
      </div>
    </div>
  );
}

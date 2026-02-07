/**
 * Google Tag Manager (GTM) E-commerce Tracking Utility
 * 
 * This module provides functions to push e-commerce events to the GTM dataLayer.
 * Events follow the GA4 e-commerce schema for compatibility with Google Analytics 4,
 * Meta Pixel (via GTM), and other analytics platforms configured in GTM.
 * 
 * @see https://developers.google.com/analytics/devguides/collection/ga4/ecommerce
 */

// Declare dataLayer on window
declare global {
  interface Window {
    dataLayer: any[];
  }
}

// ============ CORE FUNCTIONS ============

/**
 * Initialize the dataLayer if it doesn't exist
 * Should be called once when the app loads
 */
export const initDataLayer = () => {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
  }
};

/**
 * Push any data to the GTM dataLayer
 * @param data - Data object to push
 */
export const pushToDataLayer = (data: Record<string, any>) => {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(data);
  }
};

/**
 * Clear the previous ecommerce object before pushing a new event
 * This is recommended by Google to prevent data leakage between events
 */
export const clearEcommerce = () => {
  pushToDataLayer({ ecommerce: null });
};

// ============ PAGE VIEW TRACKING ============

/**
 * Track a page view (for SPA route changes)
 * @param url - The page URL
 * @param title - Optional page title
 */
export const trackPageView = (url: string, title?: string) => {
  pushToDataLayer({
    event: 'page_view',
    page_location: typeof window !== 'undefined' ? window.location.href : url,
    page_path: url,
    page_title: title || (typeof document !== 'undefined' ? document.title : ''),
  });
};

// ============ E-COMMERCE EVENTS ============

export interface EcommerceItem {
  item_id: string | number;
  item_name: string;
  price: number;
  quantity: number;
  item_category?: string;
  item_brand?: string;
  item_variant?: string;
  discount?: number;
}

/**
 * Track when a user views a product (Product Detail Page)
 */
export const trackViewItem = (product: {
  id: string | number;
  name: string;
  price: number;
  category?: string;
  brand?: string;
  variant?: string;
}) => {
  clearEcommerce();
  pushToDataLayer({
    event: 'view_item',
    ecommerce: {
      currency: 'BDT',
      value: product.price,
      items: [{
        item_id: String(product.id),
        item_name: product.name,
        price: product.price,
        item_category: product.category || 'Products',
        item_brand: product.brand || 'TrustCart',
        item_variant: product.variant || undefined,
        quantity: 1,
      }],
    },
  });
};

/**
 * Track when a user adds a product to cart
 */
export const trackAddToCart = (product: {
  id: string | number;
  name: string;
  price: number;
  quantity: number;
  category?: string;
  variant?: string;
}) => {
  clearEcommerce();
  pushToDataLayer({
    event: 'add_to_cart',
    ecommerce: {
      currency: 'BDT',
      value: product.price * product.quantity,
      items: [{
        item_id: String(product.id),
        item_name: product.name,
        price: product.price,
        item_category: product.category || 'Products',
        item_variant: product.variant || undefined,
        quantity: product.quantity,
      }],
    },
  });
};

/**
 * Track when a user removes a product from cart
 */
export const trackRemoveFromCart = (product: {
  id: string | number;
  name: string;
  price: number;
  quantity: number;
}) => {
  clearEcommerce();
  pushToDataLayer({
    event: 'remove_from_cart',
    ecommerce: {
      currency: 'BDT',
      value: product.price * product.quantity,
      items: [{
        item_id: String(product.id),
        item_name: product.name,
        price: product.price,
        quantity: product.quantity,
      }],
    },
  });
};

/**
 * Track when a user views their cart
 */
export const trackViewCart = (
  items: Array<{
    id: string | number;
    name: string;
    price: number;
    quantity: number;
  }>,
  totalValue: number
) => {
  clearEcommerce();
  pushToDataLayer({
    event: 'view_cart',
    ecommerce: {
      currency: 'BDT',
      value: totalValue,
      items: items.map(item => ({
        item_id: String(item.id),
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
    },
  });
};

/**
 * Track when a user begins checkout
 */
export const trackBeginCheckout = (
  items: Array<{
    id: string | number;
    name: string;
    price: number;
    quantity: number;
  }>,
  totalValue: number
) => {
  clearEcommerce();
  pushToDataLayer({
    event: 'begin_checkout',
    ecommerce: {
      currency: 'BDT',
      value: totalValue,
      items: items.map(item => ({
        item_id: String(item.id),
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
    },
  });
};

/**
 * Track when a user adds shipping info during checkout
 */
export const trackAddShippingInfo = (
  items: Array<{ id: string | number; name: string; price: number; quantity: number }>,
  totalValue: number,
  shippingTier: string
) => {
  clearEcommerce();
  pushToDataLayer({
    event: 'add_shipping_info',
    ecommerce: {
      currency: 'BDT',
      value: totalValue,
      shipping_tier: shippingTier,
      items: items.map(item => ({
        item_id: String(item.id),
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
    },
  });
};

/**
 * Track when a user adds payment info during checkout
 */
export const trackAddPaymentInfo = (
  items: Array<{ id: string | number; name: string; price: number; quantity: number }>,
  totalValue: number,
  paymentType: string
) => {
  clearEcommerce();
  pushToDataLayer({
    event: 'add_payment_info',
    ecommerce: {
      currency: 'BDT',
      value: totalValue,
      payment_type: paymentType,
      items: items.map(item => ({
        item_id: String(item.id),
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
    },
  });
};

/**
 * Track a completed purchase (Order Success)
 * This is the most important e-commerce event!
 */
export const trackPurchase = (order: {
  orderId: string | number;
  totalValue: number;
  shipping?: number;
  tax?: number;
  discount?: number;
  coupon?: string;
  items: Array<{
    id: string | number;
    name: string;
    price: number;
    quantity: number;
    category?: string;
  }>;
}) => {
  clearEcommerce();
  pushToDataLayer({
    event: 'purchase',
    ecommerce: {
      transaction_id: String(order.orderId),
      currency: 'BDT',
      value: order.totalValue,
      shipping: order.shipping || 0,
      tax: order.tax || 0,
      discount: order.discount || 0,
      coupon: order.coupon || undefined,
      items: order.items.map(item => ({
        item_id: String(item.id),
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
        item_category: item.category || 'Products',
      })),
    },
  });
};

// ============ USER EVENTS ============

/**
 * Track user login
 */
export const trackLogin = (method: string = 'email') => {
  pushToDataLayer({
    event: 'login',
    method: method,
  });
};

/**
 * Track user sign up / registration
 */
export const trackSignUp = (method: string = 'email') => {
  pushToDataLayer({
    event: 'sign_up',
    method: method,
  });
};

// ============ SEARCH EVENTS ============

/**
 * Track when a user searches for something
 */
export const trackSearch = (searchTerm: string) => {
  pushToDataLayer({
    event: 'search',
    search_term: searchTerm,
  });
};

// ============ CUSTOM EVENTS ============

/**
 * Track a custom event (for any event not covered above)
 */
export const trackCustomEvent = (eventName: string, eventData?: Record<string, any>) => {
  pushToDataLayer({
    event: eventName,
    ...eventData,
  });
};

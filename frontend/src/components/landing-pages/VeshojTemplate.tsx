import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type WheelEvent } from 'react';
import Head from 'next/head';
import apiClient from '@/services/api';
import PhoneInput from '@/components/PhoneInput';
import HeroVideoEmbed from '@/components/landing-pages/HeroVideoEmbed';
import { useToast } from '@/contexts/ToastContext';
import {
  BANGLADESH_DISTRICTS,
  BangladeshDistrict,
  districtLabel,
  findDistrictInText,
  getDistrictSearchValues,
  isDhakaDistrictText,
  normalizeDistrictText,
} from '@/utils/bangladeshDistricts';
import { getOrderGuardNoteHtml, isOrderGuardBlocked } from '@/utils/orderGuard';
import { TrackingService } from '@/utils/tracking';
import {
  FaCheckCircle,
  FaChevronLeft,
  FaChevronRight,
  FaExclamationTriangle,
  FaMinus,
  FaPhone,
  FaPlayCircle,
  FaPlus,
  FaShoppingCart,
  FaStar,
  FaTruck,
  FaWhatsapp,
} from 'react-icons/fa';

const html = (value: string) => ({ __html: value });

interface LandingPageSection {
  id: string;
  type: 'hero' | 'benefits' | 'images' | 'trust' | 'order-form' | 'cta' | 'custom-html' | 'phone-cta' | 'spacer';
  title?: string;
  content?: string;
  items?: Array<{ icon?: string; text: string }>;
  images?: string[];
  videoUrl?: string;
  videoTitlePosition?: 'above-video' | 'below-video';
  reviewDisplay?: 'video' | 'image' | 'both';
  reviewVideoUrls?: string[];
  buttonText?: string;
  buttonLink?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  buttonBorderColor?: string;
  buttonBorderRadius?: number;
  backgroundColor?: string;
  textColor?: string;
  paddingY?: number;
  order: number;
  is_visible: boolean;
}

interface LandingPageProduct {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  price: number;
  compare_price?: number;
  qty?: number;
  product_id?: number;
  is_default: boolean;
  allow_quantity_selector?: boolean;
  is_featured?: boolean;
  featured_label?: string;
}

interface LandingPageData {
  id: number;
  title: string;
  slug: string;
  description: string;
  hero_image_url: string;
  hero_background_image_url?: string;
  hero_video_url?: string;
  hero_title: string;
  hero_subtitle: string;
  hero_button_text: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  order_form_bg_color?: string;
  order_form_card_bg_color?: string;
  order_form_title_color?: string;
  order_form_text_color?: string;
  order_form_accent_color?: string;
  order_form_border_color?: string;
  footer_bg_color?: string;
  footer_text_color?: string;
  footer_link_bg_color?: string;
  footer_link_text_color?: string;
  footer_border_color?: string;
  btn_bg_color?: string;
  btn_text_color?: string;
  btn_border_color?: string;
  btn_border_radius?: number;
  meta_title: string;
  meta_description: string;
  og_image_url: string;
  sections: LandingPageSection[];
  products: LandingPageProduct[];
  phone_number: string;
  whatsapp_number: string;
  floating_whatsapp_color?: string;
  floating_phone_color?: string;
  show_order_form: boolean;
  cash_on_delivery: boolean;
  free_delivery: boolean;
  delivery_charge: number;
  delivery_charge_outside: number;
  delivery_note: string;
  hero_layout?: string;
  hero_subtitle_position?: string;
}

interface OrderItem {
  product: LandingPageProduct;
  quantity: number;
}

interface VeshojTemplateProps {
  page: LandingPageData;
  trafficSource?: string;
}

const VESHOJ_PURPLE = '#B53389';
const VESHOJ_ORANGE = '#FF7B00';
const VESHOJ_PHONE = '01973-298146';
const VESHOJ_ASSET_BASE = 'https://beshoj.com/wp-content/uploads';
const VESHOJ_OFFER_SECTION_ID = 'veshoj-offer-price';

const VESHOJ_DEFAULT_PRODUCTS: LandingPageProduct[] = [
  {
    id: 'veshoj-single',
    name: 'লিউকোন গার্ড এর সাথে রুচিলতা ফ্রী (1pcs)',
    image_url: `${VESHOJ_ASSET_BASE}/2025/05/facebook-cover-veshoj-5.jpg.jpeg`,
    price: 990,
    compare_price: 1250,
    qty: 1,
    is_default: true,
    allow_quantity_selector: true,
  },
  {
    id: 'veshoj-double',
    name: '২টি লিউকোন গার্ড এর সাথে রুচিলতা ও ইন্টিমেট সাবান ফ্রী',
    image_url: `${VESHOJ_ASSET_BASE}/2025/05/facebook-cover-veshoj-5.jpg.jpeg`,
    price: 1590,
    compare_price: 0,
    qty: 1,
    is_default: false,
    allow_quantity_selector: true,
    is_featured: true,
    featured_label: 'বেস্ট অফার',
  },
];

const VESHOJ_DEFAULT_SECTIONS: LandingPageSection[] = [
  {
    id: 'veshoj-video',
    type: 'custom-html',
    title: 'আলহামদুলিল্লাহ্‌, ইতোমধ্যেই ১ লক্ষেরও বেশি মা–বোন সাদা স্রা-ব সমস্যার কার্যকর ও নিরাপদ সমাধান পেয়েছেন লিউকোন ফিমেল গার্ড ব্যবহারের মাধ্যমে।',
    content: '',
    images: [`${VESHOJ_ASSET_BASE}/2025/05/facebook-cover-veshoj-5.jpg.jpeg`],
    videoUrl: '',
    videoTitlePosition: 'below-video',
    buttonText: 'অর্ডার করুন',
    buttonLink: '#order-form',
    order: 1,
    is_visible: true,
  },
  {
    id: 'veshoj-symptoms',
    type: 'images',
    title: 'এই লক্ষণগুলো কি আপনাকেও ভুগাচ্ছে?',
    images: [
      `${VESHOJ_ASSET_BASE}/2025/05/for-web-infographic-1.jpg`,
      `${VESHOJ_ASSET_BASE}/2025/05/for-web-infographic-2.jpg`,
      `${VESHOJ_ASSET_BASE}/2025/05/for-web-infographic-3.jpg`,
      `${VESHOJ_ASSET_BASE}/2025/05/for-web-infographic-4.jpg`,
      `${VESHOJ_ASSET_BASE}/2025/05/for-web-infographic-5.jpg`,
      `${VESHOJ_ASSET_BASE}/2025/05/for-web-infographic-6.jpg`,
    ],
    order: 2,
    is_visible: true,
  },
  {
    id: 'veshoj-benefit-images',
    type: 'images',
    title: 'লিউকোন ফিমেল গার্ড সেবনে যেসব সমস্যা দূর হবে',
    images: [
      `${VESHOJ_ASSET_BASE}/2025/05/14-1-1024x1024.jpg`,
    ],
    items: [
      { text: 'দীর্ঘদিনের পুরনো সাদা-স্রাব সমস্যা!' },
      { text: 'মাসিক চলাকালীন সময়ে অতিরিক্ত ব্যথা ও অস্বাভাবিক রক্তক্ষরণ!' },
      { text: 'অতিরিক্ত যোনি চুলকানি ও অস্বস্তি!' },
      { text: 'শারীরিক দুর্বলতা!' },
      { text: 'ওজন কমে যাওয়া!' },
      { text: 'খাবারের রুচি কম হওয়া।' },
      { text: 'মানসিক দুশ্চিন্তা ও বিভিন্ন ভিটামিনের ঘাটতি!' },
    ],
    order: 3,
    is_visible: true,
  },
  {
    id: 'veshoj-usage',
    type: 'custom-html',
    title: 'খাওয়ার নিয়ম ও সময়',
    content:
      '<div class="veshoj-usage-main">প্রতিদিন - সকাল, দুপুর এবং রাতের খাবারের ৩০ মিনিট পর ২ টা করে বড়ি সেবন করতে হবে। রুচিলতা সেবনের নিয়ম: প্রতিদিন সকাল ও রাতে আধা চামচ রুচিলতা আধা গ্লাস পানিতে মিশিয়ে পান করুন।</div><div class="veshoj-usage-note">বি. দ্র: ঠান্ডা পানি, অতিরিক্ত ঝাল-মিষ্টি ও তেলযুক্ত খাবার খাওয়া থেকে বিরত থাকতে হবে।</div><div class="veshoj-usage-safe">আপনার ব্যবহারের জন্য সম্পূর্ণ নিরাপদ ও পরীক্ষিত – এখনই নিশ্চিত ব্যবহার করুন।</div>',
    order: 4,
    is_visible: true,
  },
  {
    id: VESHOJ_OFFER_SECTION_ID,
    type: 'custom-html',
    title: 'লিউকোন ফিমেল গার্ড পূর্বের মূল্য',
    content: 'লিউকোন কিনলেই পাচ্ছেন রুচি লতা এবং কোজিক ব্রাইট সোপ<br />একদম <span class="veshoj-offer-free">ফ্রি!</span>',
    items: [
      { text: '১২৫০' },
      { text: 'অফার মূল্য' },
      { text: '৯৯০ টাকা' },
    ],
    buttonText: 'অর্ডার করুন',
    buttonLink: '#order-form',
    buttonColor: VESHOJ_ORANGE,
    buttonTextColor: '#ffffff',
    buttonBorderColor: 'transparent',
    buttonBorderRadius: 10,
    backgroundColor: '#ffe8f9',
    textColor: '#55585a',
    order: 5,
    is_visible: true,
  },
  {
    id: 'veshoj-comments',
    type: 'images',
    title: 'সম্মানিত গ্রাহকের মন্তব্য',
    content: 'সম্মানিত কাস্টমারদের মতামত',
    reviewDisplay: 'both',
    reviewVideoUrls: [],
    images: [
      `${VESHOJ_ASSET_BASE}/2025/05/5.jpg`,
      `${VESHOJ_ASSET_BASE}/2025/05/6.jpg`,
      `${VESHOJ_ASSET_BASE}/2025/05/7-1024x1024.jpg`,
      `${VESHOJ_ASSET_BASE}/2025/05/8-1024x1024.jpg`,
      `${VESHOJ_ASSET_BASE}/2025/05/9.jpg`,
      `${VESHOJ_ASSET_BASE}/2025/05/10-1024x1024.jpg`,
      `${VESHOJ_ASSET_BASE}/2025/05/11-1-1024x1024.jpg`,
      `${VESHOJ_ASSET_BASE}/2025/05/12-1024x1024.jpg`,
      `${VESHOJ_ASSET_BASE}/2025/05/13-1024x1024.jpg`,
      `${VESHOJ_ASSET_BASE}/2025/05/14-1024x1024.jpg`,
    ],
    order: 6,
    is_visible: true,
  },
  {
    id: 'veshoj-phone',
    type: 'phone-cta',
    title: 'কল করে অর্ডার করতে চাই',
    buttonText: VESHOJ_PHONE,
    order: 7,
    is_visible: true,
  },
];

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString('en-US', {
    maximumFractionDigits: 0,
  });
}

function plainPhone(phone: string) {
  return phone.replace(/[^\d+]/g, '');
}

function getYouTubeEmbedUrl(url?: string) {
  const raw = String(url || '').trim();
  if (!raw) return '';

  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : '';
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      const watchId = parsed.searchParams.get('v');
      if (watchId) return `https://www.youtube.com/embed/${watchId}`;
      const parts = parsed.pathname.split('/').filter(Boolean);
      const embedIndex = parts.findIndex((part) => part === 'embed' || part === 'shorts');
      const id = embedIndex >= 0 ? parts[embedIndex + 1] : '';
      return id ? `https://www.youtube.com/embed/${id}` : '';
    }
  } catch {
    return '';
  }

  return '';
}

export default function VeshojTemplate({ page, trafficSource = 'landing_page' }: VeshojTemplateProps) {
  const orderFormRef = useRef<HTMLDivElement>(null);
  const districtDropdownRef = useRef<HTMLDivElement>(null);
  const reviewCarouselRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const touchedRef = useRef<Record<string, boolean>>({});
  const toast = useToast();

  const brandLogo = page.hero_image_url || `${VESHOJ_ASSET_BASE}/2025/04/veshoj-logo-new-scaled.png`;
  const coverImage = page.hero_background_image_url || `${VESHOJ_ASSET_BASE}/2025/05/facebook-cover-veshoj-5.jpg.jpeg`;
  const heroVideoUrl = page.hero_video_url?.trim();
  const primaryColor = page.primary_color || VESHOJ_PURPLE;
  const secondaryColor = page.secondary_color?.trim();
  const veshojSoftBgColor = secondaryColor && secondaryColor.toLowerCase() !== '#ffffff'
    ? secondaryColor
    : '#fde7f6';
  const accentColor = page.btn_bg_color || VESHOJ_ORANGE;
  const buttonTextColor = page.btn_text_color || '#ffffff';
  const buttonBorderColor = page.btn_border_color || 'transparent';
  const buttonBorderWidth = buttonBorderColor && buttonBorderColor !== 'transparent' ? 2 : 0;
  const buttonRadius = page.btn_border_radius ?? 10;
  const orderFormBgColor = page.order_form_bg_color || '#ffffff';
  const orderFormCardBgColor = page.order_form_card_bg_color || '#ffffff';
  const orderFormTitleColor = page.order_form_title_color || '#111827';
  const orderFormTextColor = page.order_form_text_color || '#374151';
  const orderFormAccentColor = page.order_form_accent_color || primaryColor;
  const orderFormBorderColor = page.order_form_border_color || '#e5e7eb';
  const footerBgColor = page.footer_bg_color || '#111827';
  const footerTextColor = page.footer_text_color || '#ffffff';
  const footerBorderColor = page.footer_border_color || '#1f2937';
  const phoneNumber = page.phone_number || VESHOJ_PHONE;
  const whatsappNumber = page.whatsapp_number || phoneNumber;

  const displayProducts = useMemo(() => {
    return page.products?.length ? page.products : VESHOJ_DEFAULT_PRODUCTS;
  }, [page.products]);

  const visibleSections = useMemo(() => {
    const customSections = (page.sections || [])
      .filter((s) => s.is_visible)
      .sort((a, b) => a.order - b.order);
    return customSections.length ? customSections : VESHOJ_DEFAULT_SECTIONS;
  }, [page.sections]);

  const heroVideoSection = useMemo(() => {
    return visibleSections.find(
      (section) =>
        section.id === 'veshoj-video' &&
        section.type === 'custom-html' &&
        Boolean(section.videoUrl || section.images?.length),
    );
  }, [visibleSections]);

  const contentSections = useMemo(() => {
    if (!heroVideoSection) return visibleSections;
    return visibleSections.filter((section) => section.id !== heroVideoSection.id);
  }, [heroVideoSection, visibleSections]);

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderForm, setOrderForm] = useState({ name: '', phone: '', address: '', district: '', note: '' });
  const [deliveryZone, setDeliveryZone] = useState<'inside' | 'outside'>('outside');
  const [districtDropdownOpen, setDistrictDropdownOpen] = useState(false);
  const [districtQuery, setDistrictQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formTouched, setFormTouched] = useState(false);
  const [orderGuardNoteHtml, setOrderGuardNoteHtml] = useState('');
  const [reviewActiveIndexes, setReviewActiveIndexes] = useState<Record<string, number>>({});

  const sessionIdRef = useRef<string>('');
  const trackingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasTrackedRef = useRef(false);

  const resolveVeshojSoftBackground = (value?: string) => {
    const color = value?.trim();
    if (!color || color.toLowerCase() === '#ffe8f9' || color.toLowerCase() === '#fde7f6') {
      return veshojSoftBgColor;
    }
    return color;
  };

  useEffect(() => {
    sessionIdRef.current = `lp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }, []);

  useEffect(() => {
    if (displayProducts.length > 0) {
      const defaultProduct = displayProducts.find((p) => p.is_default) || displayProducts[0];
      setOrderItems([{ product: defaultProduct, quantity: 1 }]);
    }
  }, [displayProducts]);

  useEffect(() => {
    const address = orderForm.address.toLowerCase();
    if (address.includes('dhaka') || address.includes('ঢাকা')) {
      setDeliveryZone('inside');
    } else if (address.length > 10 && !address.includes('dhaka') && !address.includes('ঢাকা')) {
      setDeliveryZone('outside');
    }
  }, [orderForm.address]);

  useEffect(() => {
    if (touchedRef.current.district || !orderForm.address.trim()) return;

    const detectedDistrict = findDistrictInText(orderForm.address);
    if (!detectedDistrict) return;

    const nextDistrict = districtLabel(detectedDistrict);
    setOrderForm((prev) => {
      if (prev.district === nextDistrict) return prev;
      return { ...prev, district: nextDistrict };
    });
    setDistrictQuery(nextDistrict);
  }, [orderForm.address]);

  useEffect(() => {
    const locationText = `${orderForm.address} ${orderForm.district}`.trim();
    if (isDhakaDistrictText(locationText)) {
      setDeliveryZone('inside');
    } else if (locationText.length > 10 || orderForm.district.trim()) {
      setDeliveryZone('outside');
    }
  }, [orderForm.address, orderForm.district]);

  useEffect(() => {
    if (!districtDropdownOpen) {
      setDistrictQuery(orderForm.district);
    }
  }, [districtDropdownOpen, orderForm.district]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!districtDropdownRef.current?.contains(event.target as Node)) {
        setDistrictDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const districtSearch = normalizeDistrictText(districtQuery);
  const filteredDistricts = useMemo(() => {
    return BANGLADESH_DISTRICTS.filter((district) => {
      if (!districtSearch) return true;
      const searchableValues = getDistrictSearchValues(district);
      return (
        searchableValues.some((value) => value.includes(districtSearch)) ||
        searchableValues.some((value) => districtSearch.includes(value))
      );
    }).slice(0, 10);
  }, [districtSearch]);

  const selectDistrict = (district: BangladeshDistrict) => {
    const selectedDistrict = districtLabel(district);
    touchedRef.current.district = true;
    setDistrictQuery(selectedDistrict);
    setOrderForm((prev) => ({ ...prev, district: selectedDistrict }));
    setDistrictDropdownOpen(false);
  };

  const getSubtotal = useCallback(() => {
    return orderItems.reduce((sum, item) => sum + Number(item.product.price || 0) * item.quantity, 0);
  }, [orderItems]);

  const getDeliveryCharge = useCallback(() => {
    if (page.free_delivery) return 0;
    return deliveryZone === 'inside'
      ? Number(page.delivery_charge || 0)
      : Number(page.delivery_charge_outside || page.delivery_charge || 0);
  }, [deliveryZone, page.delivery_charge, page.delivery_charge_outside, page.free_delivery]);

  const getTotal = useCallback(() => getSubtotal() + getDeliveryCharge(), [getDeliveryCharge, getSubtotal]);

  const trackIncompleteOrder = useCallback(
    (stage: string) => {
      if (!page || submitted) return;
      const hasAnyData = orderForm.name || orderForm.phone || orderForm.address || orderForm.district;
      if (!hasAnyData) return;
      if (trackingTimerRef.current) clearTimeout(trackingTimerRef.current);

      trackingTimerRef.current = setTimeout(() => {
        apiClient
          .post('/lead-management/incomplete-order/track', {
            sessionId: sessionIdRef.current,
            name: orderForm.name || null,
            phone: orderForm.phone || null,
            address: [orderForm.address, orderForm.district].filter(Boolean).join(', ') || null,
            note: orderForm.note || null,
            email: null,
            source: trafficSource,
            landingPageId: page.id,
            landingPageSlug: page.slug,
            landingPageTitle: page.title,
            abandonedStage: stage,
            deliveryZone,
            totalAmount: getSubtotal(),
            cartData: orderItems.map((i) => ({
              product_id: i.product.product_id || null,
              name: i.product.name,
              price: i.product.price,
              quantity: i.quantity,
              image_url: i.product.image_url || null,
            })),
            referrerUrl: window.location.href,
            userAgent: navigator.userAgent,
          })
          .catch(() => {});
        hasTrackedRef.current = true;
      }, 2000);
    },
    [deliveryZone, getSubtotal, orderForm, orderItems, page, submitted, trafficSource],
  );

  useEffect(() => {
    if (!page || submitted) return;
    const stage = orderForm.name && orderForm.phone && orderForm.address && orderForm.district
      ? 'form_filled'
      : orderForm.phone
        ? 'phone_entered'
        : orderForm.name
          ? 'name_entered'
          : 'form_started';
    trackIncompleteOrder(stage);
  }, [orderForm.name, orderForm.phone, orderForm.address, orderForm.district, orderForm.note, deliveryZone, page, submitted, trackIncompleteOrder]);

  useEffect(() => {
    if (!page || submitted || !hasTrackedRef.current) return;
    trackIncompleteOrder('product_changed');
  }, [orderItems, page, submitted, trackIncompleteOrder]);

  const isBdPhoneValid = () => {
    if (!orderForm.phone) return false;
    const digits = orderForm.phone.replace(/^\+?88/, '').replace(/\D/g, '');
    return digits.length === 11 && digits.startsWith('0');
  };

  const scrollToOrderForm = () => {
    orderFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleProduct = (product: LandingPageProduct) => {
    setOrderItems([{ product, quantity: 1 }]);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setOrderItems((prev) =>
      prev.map((item) =>
        item.product.id === productId && item.product.allow_quantity_selector !== false
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item,
      ),
    );
  };

  const handleSubmitOrder = async () => {
    setFormTouched(true);
    setOrderGuardNoteHtml('');
    if (!orderForm.name || !orderForm.phone || !orderForm.address || !orderForm.district) {
      toast.warning('অনুগ্রহ করে সব তথ্য পূরণ করুন');
      return;
    }
    if (!isBdPhoneValid()) {
      toast.warning('ফোন নম্বর অবশ্যই 0 দিয়ে শুরু হতে হবে এবং ১১ ডিজিট হতে হবে');
      return;
    }
    if (orderItems.length === 0) {
      toast.warning('অনুগ্রহ করে একটি প্রোডাক্ট নির্বাচন করুন');
      return;
    }

    try {
      setSubmitting(true);
      const subtotal = getSubtotal();
      const deliveryCharge = getDeliveryCharge();
      const total = subtotal + deliveryCharge;
      const shippingAddress = [orderForm.address, orderForm.district].filter(Boolean).join(', ');
      const orderPayload = {
        customer_name: orderForm.name,
        customer_phone: orderForm.phone,
        district: orderForm.district,
        shipping_address: shippingAddress,
        notes: orderForm.note || '',
        payment_method: 'cash',
        items: orderItems.map((item) => {
          const productQty = item.product.qty || 1;
          const effectiveQty = item.quantity * productQty;
          const perUnitPrice = Number(item.product.price || 0) / productQty;
          return {
            product_id: item.product.product_id || null,
            product_name: item.product.name,
            product_image: item.product.image_url || null,
            quantity: effectiveQty,
            unit_price: perUnitPrice,
            total_price: perUnitPrice * effectiveQty,
          };
        }),
        subtotal,
        delivery_charge: deliveryCharge,
        total_amount: total,
        status: 'processing',
        order_source: 'landing_page',
        traffic_source: trafficSource,
        referrer_url: window.location.href,
        utm_source: page.slug,
        utm_medium: 'landing_page',
        utm_campaign: page.title,
        ...TrackingService.collectMetaAttribution(),
      };
      const res = await apiClient.post('/sales', orderPayload);
      const savedOrderId = res.data?.id || res.data?.data?.id;

      apiClient.post(`/landing-pages/${page.id}/increment-order`).catch(() => {});
      if (savedOrderId && sessionIdRef.current && page.id) {
        apiClient.post('/lead-management/incomplete-order/converted', {
          sessionId: sessionIdRef.current,
          landingPageId: page.id,
          landingPageSlug: page.slug,
          orderId: savedOrderId,
        }).catch(() => {});
      }
      if (savedOrderId) {
        window.location.href = `/thank-you?orderId=${savedOrderId}&landing_page=${encodeURIComponent(page.slug || 'veshoj')}`;
        return;
      }
      setSubmitted(true);
      toast.success('আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে! ধন্যবাদ।');
    } catch (err: any) {
      if (isOrderGuardBlocked(err)) {
        setOrderGuardNoteHtml(getOrderGuardNoteHtml(err));
        orderFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      const savedId = err?.response?.data?.id || err?.response?.data?.data?.id;
      if (savedId) {
        apiClient.post(`/landing-pages/${page.id}/increment-order`).catch(() => {});
        window.location.href = `/thank-you?orderId=${savedId}&landing_page=${encodeURIComponent(page.slug || 'veshoj')}`;
        return;
      }
      const status = err?.response?.status;
      if (status && status >= 500) {
        setSubmitted(true);
        toast.success('আপনার অর্ডারটি গ্রহণ করা হয়েছে! শীঘ্রই আমরা আপনার সাথে যোগাযোগ করবো।');
      } else {
        toast.error('অর্ডার জমা দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderSectionButton = (section: LandingPageSection) => {
    if (!section.buttonText) return null;
    const sectionBorderColor = section.buttonBorderColor || buttonBorderColor;
    const sectionBorderWidth = sectionBorderColor && sectionBorderColor !== 'transparent' ? 2 : 0;
    return (
      <button
        type="button"
        onClick={() => {
          if (section.buttonLink && section.buttonLink !== '#order-form') {
            window.location.href = section.buttonLink;
            return;
          }
          scrollToOrderForm();
        }}
        className="veshoj-cta-button"
        style={{
          backgroundColor: section.buttonColor || accentColor,
          color: section.buttonTextColor || buttonTextColor,
          borderColor: sectionBorderColor,
          borderWidth: sectionBorderWidth,
          borderRadius: section.buttonBorderRadius ?? buttonRadius,
        }}
      >
        {section.buttonText}
      </button>
    );
  };

  const renderVideoFrame = (section: LandingPageSection) => {
    const embedUrl = getYouTubeEmbedUrl(section.videoUrl);
    const thumbnailImage = section.images?.[0] || coverImage;
    return (
      <div className="veshoj-video-frame">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={section.title || page.title || 'Veshoj video'}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <>
            <img src={thumbnailImage} alt={section.title || page.title} loading="lazy" />
            <FaPlayCircle className="veshoj-play" />
          </>
        )}
      </div>
    );
  };

  const renderVideoTitle = (section: LandingPageSection, fallbackTitle = '') => {
    const title = section.title || fallbackTitle;
    if (!title) return null;
    return <h2 className="veshoj-video-title" dangerouslySetInnerHTML={{ __html: title }} />;
  };

  const renderReviewHeading = (title: string) => {
    if (!title) return null;
    return (
      <div className="veshoj-review-heading">
        <FaStar />
        <h2 dangerouslySetInnerHTML={{ __html: title }} />
        <FaStar />
      </div>
    );
  };

  const updateReviewActiveIndex = useCallback((carouselKey: string, itemCount: number) => {
    const carousel = reviewCarouselRefs.current[carouselKey];
    if (!carousel || itemCount <= 1) return;

    const maxScroll = carousel.scrollWidth - carousel.clientWidth;
    const nextIndex = maxScroll > 0
      ? Math.round((carousel.scrollLeft / maxScroll) * (itemCount - 1))
      : 0;

    setReviewActiveIndexes((prev) => (
      prev[carouselKey] === nextIndex ? prev : { ...prev, [carouselKey]: nextIndex }
    ));
  }, []);

  const scrollReviewToIndex = useCallback((carouselKey: string, index: number, itemCount: number) => {
    const carousel = reviewCarouselRefs.current[carouselKey];
    if (!carousel || itemCount <= 1) return;

    const targetIndex = Math.max(0, Math.min(index, itemCount - 1));
    const maxScroll = carousel.scrollWidth - carousel.clientWidth;
    const left = maxScroll > 0 ? (targetIndex / (itemCount - 1)) * maxScroll : 0;

    carousel.scrollTo({ left, behavior: 'smooth' });
    setReviewActiveIndexes((prev) => ({ ...prev, [carouselKey]: targetIndex }));
  }, []);

  const scrollReviewByStep = useCallback((carouselKey: string, direction: -1 | 1, itemCount: number) => {
    const currentIndex = reviewActiveIndexes[carouselKey] || 0;
    scrollReviewToIndex(carouselKey, currentIndex + direction, itemCount);
  }, [reviewActiveIndexes, scrollReviewToIndex]);

  const handleReviewWheel = useCallback((event: WheelEvent<HTMLDivElement>, carouselKey: string, itemCount: number) => {
    const carousel = event.currentTarget;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || carousel.scrollWidth <= carousel.clientWidth) return;

    event.preventDefault();
    carousel.scrollLeft += event.deltaY;
    updateReviewActiveIndex(carouselKey, itemCount);
  }, [updateReviewActiveIndex]);

  const renderReviewDots = (count: number, carouselKey: string) => {
    if (count <= 1) return null;
    const dotCount = Math.min(count, 10);
    const activeIndex = Math.min(reviewActiveIndexes[carouselKey] || 0, count - 1);
    const activeDotIndex = dotCount > 1
      ? Math.round((activeIndex / (count - 1)) * (dotCount - 1))
      : 0;

    return (
      <div className="veshoj-review-dots">
        {Array.from({ length: dotCount }).map((_, index) => (
          <button
            key={index}
            type="button"
            className={index === activeDotIndex ? 'is-active' : ''}
            aria-label={`Go to review ${index + 1}`}
            onClick={() => {
              const targetIndex = dotCount > 1
                ? Math.round((index / (dotCount - 1)) * (count - 1))
                : 0;
              scrollReviewToIndex(carouselKey, targetIndex, count);
            }}
          />
        ))}
      </div>
    );
  };

  const renderHeroVideoBanner = (section: LandingPageSection) => {
    const titleAboveVideo = section.videoTitlePosition === 'above-video';
    const ctaSection = {
      ...section,
      buttonText: section.buttonText || page.hero_button_text || 'অর্ডার করুন',
      buttonLink: section.buttonLink || '#order-form',
    };

    return (
      <section className="veshoj-hero-video">
        {titleAboveVideo && renderVideoTitle(section, page.hero_subtitle)}
        {renderVideoFrame(section)}
        {!titleAboveVideo && renderVideoTitle(section, page.hero_subtitle)}
        <div className="veshoj-cta-wrap">{renderSectionButton(ctaSection)}</div>
        {section.content && (
          <div
            className="veshoj-rich-text"
            dangerouslySetInnerHTML={{ __html: section.content }}
          />
        )}
      </section>
    );
  };

  const renderOfferMarker = (text: string, variant: 'x' | 'double-underline') => (
    <span className={`veshoj-offer-marker veshoj-offer-marker-${variant}`}>
      <span className="veshoj-offer-marker-text">{text}</span>
      {variant === 'x' ? (
        <svg viewBox="0 0 500 150" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path d="M30 22 C140 40 300 112 470 132" />
          <path d="M470 24 C330 40 160 104 28 128" />
        </svg>
      ) : (
        <svg viewBox="0 0 500 70" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path d="M18 42 C120 22 240 62 482 35" />
          <path d="M22 58 C160 43 300 72 478 52" />
        </svg>
      )}
    </span>
  );

  const renderVeshojOfferSection = (section: LandingPageSection) => {
    const previousPrice = section.items?.[0]?.text || '১২৫০';
    const offerLabel = section.items?.[1]?.text || 'অফার মূল্য';
    const offerPrice = section.items?.[2]?.text || '৯৯০ টাকা';
    const previousLabel = section.title || 'লিউকোন ফিমেল গার্ড পূর্বের মূল্য';
    const bandContent = section.content || 'লিউকোন কিনলেই পাচ্ছেন রুচি লতা এবং কোজিক ব্রাইট সোপ<br />একদম <span class="veshoj-offer-free">ফ্রি!</span>';
    const offerButton = {
      ...section,
      buttonText: section.buttonText || 'অর্ডার করুন',
      buttonLink: section.buttonLink || '#order-form',
      buttonColor: section.buttonColor || VESHOJ_ORANGE,
      buttonTextColor: section.buttonTextColor || '#ffffff',
      buttonBorderColor: section.buttonBorderColor || 'transparent',
      buttonBorderRadius: section.buttonBorderRadius ?? 10,
    };

    return (
      <section
        key={section.id}
        className="veshoj-offer-price-section"
        style={{
          backgroundColor: resolveVeshojSoftBackground(section.backgroundColor),
          color: section.textColor || '#55585a',
        }}
      >
        <div className="veshoj-offer-inner">
          <h2 className="veshoj-offer-old-price">
            <span>{previousLabel} </span>
            {renderOfferMarker(previousPrice, 'x')}
          </h2>
          <h3 className="veshoj-offer-current-price">
            <span>{offerLabel} </span>
            {renderOfferMarker(offerPrice, 'double-underline')}
          </h3>
          <div className="veshoj-offer-band">
            <div className="veshoj-offer-band-text" dangerouslySetInnerHTML={html(bandContent)} />
          </div>
          <div className="veshoj-offer-button-wrap">{renderSectionButton(offerButton)}</div>
        </div>
      </section>
    );
  };

  const renderReviewSection = (section: LandingPageSection) => {
    const reviewDisplay = section.reviewDisplay || 'image';
    const videoUrls = (section.reviewVideoUrls || []).filter(Boolean);
    const imageUrls = section.images || [];
    const showVideos = (reviewDisplay === 'video' || reviewDisplay === 'both') && videoUrls.length > 0;
    const showImages = (reviewDisplay === 'image' || reviewDisplay === 'both') && imageUrls.length > 0;
    const videoCarouselKey = `${section.id}-video`;
    const imageCarouselKey = `${section.id}-image`;

    if (!showVideos && !showImages) return null;

    return (
      <section
        key={section.id}
        className="veshoj-review-section"
        style={{
          '--veshoj-review-bg': resolveVeshojSoftBackground(section.backgroundColor),
          '--veshoj-review-text': section.textColor || '#111111',
        } as CSSProperties}
      >
        {showVideos && (
          <>
            {renderReviewHeading(section.title || 'সম্মানিত গ্রাহকের মন্তব্য')}
            <div className="veshoj-review-carousel-wrap">
              <button
                type="button"
                className="veshoj-review-nav veshoj-review-nav-prev"
                aria-label="Previous video review"
                onClick={() => scrollReviewByStep(videoCarouselKey, -1, videoUrls.length)}
              >
                <FaChevronLeft />
              </button>
              <div
                ref={(node) => {
                  reviewCarouselRefs.current[videoCarouselKey] = node;
                }}
                className="veshoj-review-carousel veshoj-video-review-carousel"
                onScroll={() => updateReviewActiveIndex(videoCarouselKey, videoUrls.length)}
                onWheel={(event) => handleReviewWheel(event, videoCarouselKey, videoUrls.length)}
              >
                {videoUrls.map((url, index) => {
                  const embedUrl = getYouTubeEmbedUrl(url);
                  return (
                    <div key={`${url}-${index}`} className="veshoj-video-review-card">
                      {embedUrl ? (
                        <iframe
                          src={embedUrl}
                          title={`${section.title || page.title || 'Veshoj review'} ${index + 1}`}
                          loading="lazy"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      ) : (
                        <div className="veshoj-video-review-empty">Invalid YouTube URL</div>
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                className="veshoj-review-nav veshoj-review-nav-next"
                aria-label="Next video review"
                onClick={() => scrollReviewByStep(videoCarouselKey, 1, videoUrls.length)}
              >
                <FaChevronRight />
              </button>
            </div>
            {renderReviewDots(videoUrls.length, videoCarouselKey)}
          </>
        )}

        {showImages && (
          <>
            {renderReviewHeading(section.content || (showVideos ? 'সম্মানিত কাস্টমারদের মতামত' : section.title || 'সম্মানিত কাস্টমারদের মতামত'))}
            <div className="veshoj-review-carousel-wrap">
              <button
                type="button"
                className="veshoj-review-nav veshoj-review-nav-prev"
                aria-label="Previous image review"
                onClick={() => scrollReviewByStep(imageCarouselKey, -1, imageUrls.length)}
              >
                <FaChevronLeft />
              </button>
              <div
                ref={(node) => {
                  reviewCarouselRefs.current[imageCarouselKey] = node;
                }}
                className="veshoj-review-carousel veshoj-image-review-carousel"
                onScroll={() => updateReviewActiveIndex(imageCarouselKey, imageUrls.length)}
                onWheel={(event) => handleReviewWheel(event, imageCarouselKey, imageUrls.length)}
              >
                {imageUrls.map((image, index) => (
                  <div key={`${image}-${index}`} className="veshoj-image-review-card">
                    <img src={image} alt={`${section.content || section.title || page.title} ${index + 1}`} loading="lazy" />
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="veshoj-review-nav veshoj-review-nav-next"
                aria-label="Next image review"
                onClick={() => scrollReviewByStep(imageCarouselKey, 1, imageUrls.length)}
              >
                <FaChevronRight />
              </button>
            </div>
            {renderReviewDots(imageUrls.length, imageCarouselKey)}
          </>
        )}

        {renderSectionButton(section)}
      </section>
    );
  };

  const renderSection = (section: LandingPageSection) => {
    if (section.type === 'spacer') {
      return <div key={section.id} style={{ height: section.paddingY || 24 }} />;
    }

    if (section.type === 'phone-cta') {
      return (
        <section key={section.id} className="veshoj-phone-section">
          {section.title && <h2 dangerouslySetInnerHTML={html(section.title)} />}
          <a href={`tel:${plainPhone(phoneNumber)}`} className="veshoj-phone-button">
            <FaPhone /> {section.buttonText || phoneNumber}
          </a>
        </section>
      );
    }

    if (section.id === 'veshoj-comments') {
      return renderReviewSection(section);
    }

    if (section.id === VESHOJ_OFFER_SECTION_ID) {
      return renderVeshojOfferSection(section);
    }

    if (section.type === 'images') {
      const isComments = (section.images || []).length > 6 || section.title?.includes('মন্তব্য');
      const isBenefitImageSection = section.id === 'veshoj-benefit-images';
      const displayImages = isBenefitImageSection ? (section.images || []).slice(0, 1) : (section.images || []);
      return (
        <section key={section.id} className="veshoj-section">
          {section.title && (
            <div className={isBenefitImageSection ? 'veshoj-heading-band veshoj-wide-heading-band' : 'veshoj-heading-band'}>
              <h2 dangerouslySetInnerHTML={html(section.title)} />
            </div>
          )}
          {section.content && (
            <div
              className="veshoj-section-copy"
              dangerouslySetInnerHTML={{ __html: section.content }}
            />
          )}
          {isBenefitImageSection ? (
            <div className={`veshoj-problems-layout ${(section.items || []).length === 0 ? 'is-image-only' : ''}`}>
              {displayImages.map((image, index) => (
                <img
                  key={`${image}-${index}`}
                  className="veshoj-problems-image"
                  src={image}
                  alt={`${section.title || page.title} ${index + 1}`}
                  loading="lazy"
                />
              ))}
              {(section.items || []).length > 0 && (
                <ul className="veshoj-problems-list">
                  {(section.items || []).map((item, index) => (
                    <li key={`${item.text}-${index}`}>
                      <span className="veshoj-problems-dot" aria-hidden="true" />
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className={isComments ? 'veshoj-comment-gallery' : 'veshoj-image-stack'}>
              {displayImages.map((image, index) => (
                <img key={`${image}-${index}`} src={image} alt={`${section.title || page.title} ${index + 1}`} loading="lazy" />
              ))}
            </div>
          )}
          {renderSectionButton(section)}
        </section>
      );
    }

    if (section.id === 'veshoj-usage') {
      return (
        <section key={section.id} className="veshoj-section veshoj-usage-section">
          {section.title && (
            <div className="veshoj-usage-heading">
              <h2 dangerouslySetInnerHTML={html(section.title)} />
            </div>
          )}
          {section.content && (
            <div
              className="veshoj-usage-content"
              dangerouslySetInnerHTML={{ __html: section.content }}
            />
          )}
          {renderSectionButton(section)}
        </section>
      );
    }

    if (section.type === 'custom-html' && (section.videoUrl || section.images?.length)) {
      const titleAboveVideo = section.videoTitlePosition === 'above-video';
      return (
        <section key={section.id} className="veshoj-section">
          {titleAboveVideo && renderVideoTitle(section)}
          {renderVideoFrame(section)}
          {!titleAboveVideo && renderVideoTitle(section)}
          {section.content && (
            <div
              className="veshoj-rich-text"
              dangerouslySetInnerHTML={{ __html: section.content }}
            />
          )}
          {renderSectionButton(section)}
        </section>
      );
    }

    return (
      <section
        key={section.id}
        className={section.type === 'hero' || section.type === 'cta' ? 'veshoj-purple-strip' : 'veshoj-section'}
        style={{
          backgroundColor: section.backgroundColor || undefined,
          color: section.textColor || undefined,
          paddingTop: section.paddingY,
          paddingBottom: section.paddingY,
        }}
      >
        {section.title && <h2 className={section.type === 'hero' || section.type === 'cta' ? '' : 'veshoj-section-title'} dangerouslySetInnerHTML={html(section.title)} />}
        {section.content && (
          <div
            className={section.type === 'hero' || section.type === 'cta' ? 'veshoj-strip-copy' : 'veshoj-rich-text'}
            dangerouslySetInnerHTML={{ __html: section.content }}
          />
        )}
        {section.items && section.items.length > 0 && (
          <div className="veshoj-check-list">
            {section.items.map((item, index) => (
              <div key={`${item.text}-${index}`} className="veshoj-check-row">
                <FaCheckCircle />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        )}
        {renderSectionButton(section)}
      </section>
    );
  };

  return (
    <>
      <Head>
        <title>{page.meta_title || page.title || 'ভেষজ হেলথ কেয়ার'}</title>
        {page.meta_description && <meta name="description" content={page.meta_description} />}
        {page.og_image_url && <meta property="og:image" content={page.og_image_url} />}
        <meta property="og:title" content={page.meta_title || page.title} />
        <meta property="og:description" content={page.meta_description || page.description} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <style jsx global>{`
        .veshoj-page,
        .veshoj-page * {
          font-family: 'Hind Siliguri', sans-serif;
        }
        .veshoj-page {
          background: ${page.background_color || '#ffffff'};
          color: #111827;
        }
        .veshoj-shell {
          max-width: 900px;
          margin: 0 auto;
          padding: 0 12px 32px;
        }
        .veshoj-logo {
          display: flex;
          justify-content: center;
          padding: 10px 0 0;
        }
        .veshoj-logo img {
          width: 114px;
          height: 59px;
          object-fit: contain;
        }
        .veshoj-purple-strip,
        .veshoj-phone-section {
          margin: 10px auto;
          padding: 8px 10px;
          border-radius: 10px;
          background: ${primaryColor};
          color: #ffffff;
          text-align: center;
        }
        .veshoj-purple-strip h1,
        .veshoj-purple-strip h2,
        .veshoj-heading-band h2,
        .veshoj-phone-section h2 {
          margin: 0;
          color: #ffffff;
          font-size: clamp(20px, 4.2vw, 32px);
          font-weight: 800;
          line-height: 1.25;
        }
        .veshoj-heading-band {
          display: inline-flex;
          justify-content: center;
          max-width: 100%;
          margin: 8px auto 12px;
          padding: 6px 10px;
          border-radius: 10px;
          background: ${primaryColor};
          text-align: center;
        }
        .veshoj-wide-heading-band {
          display: flex;
          width: 100%;
          margin-top: 10px;
          margin-bottom: 16px;
          padding: 8px 16px 9px;
        }
        .veshoj-wide-heading-band h2 {
          font-size: clamp(24px, 4vw, 37px);
        }
        .veshoj-strip-copy {
          font-size: 15px;
          font-weight: 600;
          line-height: 2.4;
        }
        .veshoj-cover {
          display: block;
          width: 100%;
          margin: 0 auto 10px;
          border-radius: 8px;
        }
        .veshoj-hero-video {
          margin: 10px 0 18px;
          text-align: center;
        }
        .veshoj-hero-video-embed {
          max-width: 870px;
          margin-top: 12px;
          margin-bottom: 18px;
        }
        .veshoj-cta-wrap {
          text-align: center;
          margin: 10px 0 14px;
        }
        .veshoj-cta-button,
        .veshoj-main-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 52px;
          padding: 10px 26px;
          border-style: solid;
          border-width: 0;
          background: ${accentColor};
          color: ${buttonTextColor};
          font-size: clamp(20px, 4vw, 32px);
          font-weight: 800;
          line-height: 1.2;
          box-shadow: 2px 3px 0 rgba(135, 135, 135, 0.98);
          transition: transform .2s ease, filter .2s ease;
        }
        .veshoj-cta-button:hover,
        .veshoj-main-button:hover {
          transform: translateY(-1px);
          filter: brightness(1.04);
        }
        .veshoj-subtitle {
          margin: 14px 0 10px;
          text-align: center;
          color: #000000;
          font-size: clamp(18px, 2.5vw, 22px);
          font-weight: 800;
          line-height: 1.25;
        }
        .veshoj-section {
          margin: 14px 0;
          text-align: center;
        }
        .veshoj-section-title {
          margin: 8px 0 12px;
          color: #000000;
          font-size: clamp(20px, 4vw, 32px);
          font-weight: 700;
          line-height: 1.25;
        }
        .veshoj-video-title {
          margin: 14px 0 10px;
          color: #000000;
          font-size: clamp(19px, 3vw, 26px);
          font-weight: 800;
          line-height: 1.32;
          text-align: center;
        }
        .veshoj-section-copy,
        .veshoj-rich-text {
          color: #111827;
          font-size: clamp(16px, 2.4vw, 20px);
          line-height: 1.7;
          font-weight: 500;
          text-align: center;
        }
        .veshoj-rich-text p {
          margin: 8px 0;
        }
        .veshoj-usage-section {
          margin: 26px 0 16px;
        }
        .veshoj-usage-heading {
          display: inline-flex;
          justify-content: center;
          max-width: 100%;
          margin: 0 auto 18px;
          padding: 2px 14px 6px;
          border-radius: 9px;
          background: ${primaryColor};
          text-align: center;
        }
        .veshoj-usage-heading h2 {
          margin: 0;
          color: #ffffff;
          font-size: clamp(30px, 5.2vw, 44px);
          font-weight: 800;
          line-height: 1.12;
        }
        .veshoj-usage-content {
          text-align: center;
          color: #000000;
          font-weight: 700;
        }
        .veshoj-usage-main,
        .veshoj-usage-content > p:first-child {
          padding: 20px 26px 10px;
          background: #fde7f6;
          font-size: clamp(19px, 2.9vw, 25px);
          line-height: 1.08;
          font-weight: 700;
        }
        .veshoj-usage-note,
        .veshoj-usage-content > p:nth-child(2) {
          padding: 6px 26px 18px;
          background: #fde7f6;
          color: ${primaryColor};
          font-size: clamp(17px, 2.5vw, 21px);
          line-height: 1.2;
          font-weight: 800;
        }
        .veshoj-usage-safe,
        .veshoj-usage-content > p:nth-child(3) {
          margin: 7px 0 0;
          color: #000000;
          font-size: clamp(16px, 2.4vw, 20px);
          line-height: 1.25;
          font-weight: 800;
        }
        .veshoj-offer-price-section {
          margin: 18px calc(50% - 50vw) 39px;
          padding: 24px 12px 31px;
          overflow: hidden;
          text-align: center;
        }
        .veshoj-offer-inner {
          width: min(1140px, calc(100vw - 24px));
          margin: 0 auto;
        }
        .veshoj-offer-old-price,
        .veshoj-offer-current-price {
          margin: 0;
          color: inherit;
          text-align: center;
          font-weight: 600;
          letter-spacing: 0;
        }
        .veshoj-offer-old-price {
          font-size: 35px;
          line-height: 1.38;
        }
        .veshoj-offer-current-price {
          margin-top: 0;
          font-size: 74px;
          line-height: 1.18;
        }
        .veshoj-offer-marker {
          position: relative;
          display: inline-block;
          isolation: isolate;
          white-space: nowrap;
        }
        .veshoj-offer-marker-text {
          position: relative;
          z-index: 1;
        }
        .veshoj-offer-marker svg {
          position: absolute;
          z-index: 2;
          pointer-events: none;
          overflow: visible;
        }
        .veshoj-offer-marker path {
          fill: none;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 0 1500;
          animation: veshoj-offer-marker-loop 9200ms ease-in-out infinite;
        }
        .veshoj-offer-marker path:nth-child(2) {
          animation-delay: 120ms;
        }
        .veshoj-offer-marker-x svg {
          inset: -0.24em -0.18em -0.08em;
          width: calc(100% + .36em);
          height: calc(100% + .32em);
        }
        .veshoj-offer-marker-x path {
          stroke: #ff1212;
          stroke-width: 8;
        }
        .veshoj-offer-marker-double-underline svg {
          left: -0.06em;
          right: -0.08em;
          bottom: -0.03em;
          width: calc(100% + .14em);
          height: .42em;
        }
        .veshoj-offer-marker-double-underline path {
          stroke: ${primaryColor};
          stroke-width: 10;
        }
        .veshoj-offer-band {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-height: 105px;
          margin: 25px auto 20px;
          padding: 4px 20px;
          background: ${primaryColor};
          color: #ffffff;
        }
        .veshoj-offer-band-text {
          color: #ffffff;
          font-size: 31px;
          font-weight: 600;
          line-height: 56px;
          text-align: center;
        }
        .veshoj-offer-band-text strong,
        .veshoj-offer-band-text b,
        .veshoj-offer-free {
          color: #ffcc00;
        }
        .veshoj-offer-button-wrap .veshoj-cta-button {
          min-height: 58px;
          margin-top: 0;
          padding: 8px 24px 10px;
          border-radius: 10px;
          background: ${VESHOJ_ORANGE};
          color: #ffffff;
          font-size: 32px;
          font-weight: 700;
          box-shadow: 2px 3px 0 rgba(135, 135, 135, 0.98);
          transition: background .2s ease, box-shadow .2s ease, transform .2s ease;
        }
        .veshoj-offer-button-wrap .veshoj-cta-button:hover,
        .veshoj-offer-button-wrap .veshoj-cta-button:focus {
          background: #a8086c !important;
          color: #ffffff !important;
          box-shadow: 0 0 10px ${VESHOJ_ORANGE};
          transform: none;
          filter: none;
        }
        @keyframes veshoj-offer-marker-loop {
          0% {
            opacity: 1;
            filter: none;
            stroke-dasharray: 0 1500;
          }
          13.04% {
            opacity: 1;
            filter: none;
            stroke-dasharray: 1500 1500;
          }
          86.95% {
            opacity: 1;
            filter: none;
            stroke-dasharray: 1500 1500;
          }
          100% {
            opacity: 0;
            filter: blur(10px);
            stroke-dasharray: 1500 1500;
          }
        }
        .veshoj-check-list {
          display: grid;
          gap: 10px;
          max-width: 720px;
          margin: 14px auto 0;
          text-align: left;
        }
        .veshoj-check-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 12px;
          border: 1px solid #f0d3e6;
          border-radius: 10px;
          background: #fff7fb;
          color: #3f1231;
          font-weight: 600;
        }
        .veshoj-check-row svg {
          margin-top: 4px;
          color: ${primaryColor};
          flex-shrink: 0;
        }
        .veshoj-image-stack {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          align-items: stretch;
        }
        .veshoj-image-stack img,
        .veshoj-video-frame img,
        .veshoj-video-frame iframe {
          width: 100%;
          border-radius: 6px;
          display: block;
        }
        .veshoj-image-stack img {
          height: 100%;
          object-fit: cover;
        }
        .veshoj-problems-layout {
          display: grid;
          grid-template-columns: minmax(0, 420px) minmax(0, 1fr);
          gap: 54px;
          align-items: start;
          width: 100%;
          margin: 16px auto 0;
          text-align: left;
        }
        .veshoj-problems-layout.is-image-only {
          grid-template-columns: 1fr;
        }
        .veshoj-problems-image {
          display: block;
          width: 100%;
          height: auto;
          border-radius: 0;
          object-fit: cover;
        }
        .veshoj-problems-list {
          display: grid;
          gap: 5px;
          margin: 12px 0 0;
          padding: 0;
          color: #565656;
          list-style: none;
        }
        .veshoj-problems-list li {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 20px;
          font-weight: 800;
          line-height: 1.24;
        }
        .veshoj-problems-dot {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          margin-top: 5px;
          border-radius: 999px;
          background: #f57c00;
          flex: 0 0 16px;
        }
        .veshoj-problems-dot::after {
          content: '';
          width: 5px;
          height: 5px;
          border-radius: 999px;
          background: #ffffff;
        }
        .veshoj-video-frame img,
        .veshoj-video-frame iframe {
          aspect-ratio: 16 / 9;
          object-fit: cover;
        }
        .veshoj-video-frame iframe {
          border: 0;
          background: #000000;
        }
        .veshoj-comment-gallery {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding: 2px 0 10px;
          scroll-snap-type: x mandatory;
          scrollbar-width: thin;
        }
        .veshoj-comment-gallery img {
          width: min(230px, 75vw);
          flex: 0 0 min(230px, 75vw);
          aspect-ratio: 1 / 1;
          object-fit: cover;
          border-radius: 8px;
          border: 1px solid #f1f1f1;
          scroll-snap-align: center;
        }
        .veshoj-video-frame {
          position: relative;
          overflow: hidden;
          border-radius: 10px;
        }
        .veshoj-section .veshoj-cta-button {
          margin-top: 12px;
        }
        .veshoj-review-section {
          margin: 26px calc(50% - 50vw) 20px;
          padding: 0 0 16px;
          overflow: hidden;
          text-align: center;
        }
        .veshoj-review-heading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          width: 100%;
          margin: 24px 0 20px;
          padding: 9px 16px 12px;
          background: var(--veshoj-review-bg, ${veshojSoftBgColor});
          color: var(--veshoj-review-text, #111111);
        }
        .veshoj-review-heading h2 {
          margin: 0;
          font-size: clamp(24px, 4.2vw, 38px);
          font-weight: 800;
          line-height: 1.1;
        }
        .veshoj-review-heading svg {
          width: clamp(24px, 4vw, 34px);
          height: clamp(24px, 4vw, 34px);
          color: ${primaryColor};
          flex-shrink: 0;
        }
        .veshoj-review-carousel-wrap {
          position: relative;
          max-width: 1000px;
          margin: 0 auto;
          padding: 0 48px;
        }
        .veshoj-review-carousel {
          display: flex;
          gap: 20px;
          width: 100%;
          margin: 0;
          padding: 0 0 8px;
          overflow-x: auto;
          scroll-behavior: smooth;
          scroll-snap-type: x mandatory;
          scrollbar-color: ${primaryColor} ${veshojSoftBgColor};
          scrollbar-width: thin;
          -webkit-overflow-scrolling: touch;
        }
        .veshoj-review-carousel::-webkit-scrollbar {
          display: block;
          height: 8px;
        }
        .veshoj-review-carousel::-webkit-scrollbar-track {
          border-radius: 999px;
          background: ${veshojSoftBgColor};
        }
        .veshoj-review-carousel::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: ${primaryColor};
        }
        .veshoj-review-nav {
          position: absolute;
          top: 50%;
          z-index: 3;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border: 1px solid ${veshojSoftBgColor};
          border-radius: 999px;
          background: #ffffff;
          color: ${primaryColor};
          box-shadow: 0 8px 18px rgba(17, 24, 39, .14);
          transform: translateY(-50%);
          transition: transform .18s ease, background .18s ease;
        }
        .veshoj-review-nav:hover {
          background: ${veshojSoftBgColor};
          transform: translateY(-50%) scale(1.04);
        }
        .veshoj-review-nav svg {
          width: 18px;
          height: 18px;
        }
        .veshoj-review-nav-prev {
          left: 4px;
        }
        .veshoj-review-nav-next {
          right: 4px;
        }
        .veshoj-video-review-card,
        .veshoj-image-review-card {
          flex: 0 0 calc((100% - 40px) / 3);
          scroll-snap-align: start;
          overflow: hidden;
          border-radius: 4px;
          background: #ffffff;
        }
        .veshoj-video-review-card {
          flex-basis: calc((100% - 20px) / 2);
          border-radius: 8px;
        }
        .veshoj-video-review-card iframe,
        .veshoj-video-review-empty {
          display: block;
          width: 100%;
          aspect-ratio: 16 / 9;
          border: 0;
          background: #000000;
        }
        .veshoj-video-review-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-size: 14px;
          font-weight: 700;
        }
        .veshoj-image-review-card img {
          display: block;
          width: 100%;
          aspect-ratio: 1 / 1;
          object-fit: cover;
        }
        .veshoj-review-dots {
          display: flex;
          justify-content: center;
          gap: 14px;
          margin: 10px 0 18px;
        }
        .veshoj-review-dots button {
          width: 7px;
          height: 7px;
          padding: 0;
          border: 0;
          border-radius: 999px;
          background: #d0d0d0;
          cursor: pointer;
          transition: width .18s ease, background .18s ease;
        }
        .veshoj-review-dots button.is-active {
          width: 16px;
          background: #111111;
        }
        .veshoj-play {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          color: #ffffff;
          width: 72px;
          height: 72px;
          filter: drop-shadow(0 8px 22px rgba(0,0,0,.35));
        }
        .veshoj-phone-section h2 {
          margin-bottom: 10px;
        }
        .veshoj-phone-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 48px;
          padding: 8px 26px;
          border-radius: 10px;
          background: ${accentColor};
          color: #ffffff;
          font-size: clamp(20px, 4vw, 32px);
          font-weight: 800;
          box-shadow: 2px 3px 0 rgba(135, 135, 135, 0.98);
        }
        .veshoj-order-instruction {
          margin: 18px 0 14px;
          color: #000000;
          text-align: center;
          font-size: clamp(17px, 3.4vw, 22px);
          line-height: 1.35;
          font-weight: 600;
        }
        .veshoj-checkout {
          margin-top: 8px;
          padding: 14px;
          border: 1px solid ${orderFormBorderColor};
          border-radius: 10px;
          background: ${orderFormBgColor};
        }
        .veshoj-checkout-grid {
          display: grid;
          grid-template-columns: 1.08fr .92fr;
          gap: 18px;
          align-items: start;
        }
        .veshoj-card {
          border: 1px solid ${orderFormBorderColor};
          border-radius: 8px;
          background: ${orderFormCardBgColor};
          color: ${orderFormTextColor};
          padding: 14px;
        }
        .veshoj-card + .veshoj-card {
          margin-top: 14px;
        }
        .veshoj-card h3 {
          margin: 0 0 12px;
          color: ${orderFormTitleColor};
          font-size: 20px;
          font-weight: 800;
        }
        .veshoj-product-card {
          position: relative;
          display: flex;
          gap: 12px;
          align-items: center;
          width: 100%;
          padding: 10px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          background: #ffffff;
          text-align: left;
          transition: border-color .2s ease, box-shadow .2s ease;
        }
        .veshoj-product-card + .veshoj-product-card {
          margin-top: 10px;
        }
        .veshoj-product-card.is-selected {
          border-color: ${orderFormAccentColor};
          box-shadow: 0 0 0 2px ${orderFormAccentColor}22;
        }
        .veshoj-featured {
          position: absolute;
          top: -12px;
          left: 14px;
          background: ${accentColor};
          color: #ffffff;
          border-radius: 999px;
          padding: 3px 10px;
          font-size: 11px;
          font-weight: 800;
        }
        .veshoj-product-card img {
          width: 74px;
          height: 74px;
          object-fit: cover;
          border-radius: 6px;
          border: 1px solid #f3f4f6;
          flex-shrink: 0;
        }
        .veshoj-product-name {
          color: #111827;
          font-size: 15px;
          font-weight: 700;
          line-height: 1.25;
        }
        .veshoj-product-price {
          margin-top: 5px;
          color: ${orderFormAccentColor};
          font-size: 18px;
          font-weight: 800;
        }
        .veshoj-qty {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-top: 8px;
        }
        .veshoj-qty button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 999px;
          background: #f3f4f6;
          color: #111827;
        }
        .veshoj-form-fields {
          display: grid;
          gap: 12px;
        }
        .veshoj-form-fields label {
          display: block;
          margin-bottom: 5px;
          color: ${orderFormTextColor};
          font-size: 14px;
          font-weight: 700;
        }
        .veshoj-form-fields input,
        .veshoj-form-fields textarea,
        .veshoj-form-fields :global(input) {
          width: 100%;
          min-height: 44px;
          border: 1px solid ${orderFormBorderColor};
          border-radius: 4px;
          padding: 10px 12px;
          color: #111827;
          background: #ffffff;
        }
        .veshoj-form-fields input.is-invalid,
        .veshoj-form-fields textarea.is-invalid,
        .veshoj-form-fields :global(input.is-invalid) {
          border-color: #ef4444;
          background: #fff5f5;
        }
        .veshoj-district-field {
          position: relative;
        }
        .veshoj-district-dropdown {
          position: absolute;
          left: 0;
          right: 0;
          top: calc(100% + 4px);
          z-index: 40;
          max-height: 240px;
          overflow-y: auto;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #ffffff;
          box-shadow: 0 16px 32px rgba(17, 24, 39, .16);
        }
        .veshoj-district-dropdown button {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          width: 100%;
          padding: 10px 12px;
          border-bottom: 1px solid #f3f4f6;
          color: #111827;
          text-align: left;
          font-size: 14px;
          transition: background .16s ease;
        }
        .veshoj-district-dropdown button:hover {
          background: ${orderFormAccentColor}10;
        }
        .veshoj-district-dropdown button:last-child {
          border-bottom: 0;
        }
        .veshoj-district-dropdown span {
          font-weight: 700;
        }
        .veshoj-district-dropdown small {
          color: #6b7280;
          font-size: 13px;
          white-space: nowrap;
        }
        .veshoj-district-empty {
          padding: 11px 12px;
          color: #6b7280;
          font-size: 14px;
        }
        .veshoj-field-error {
          display: flex;
          align-items: center;
          gap: 6px;
          margin: 5px 0 0;
          color: #dc2626;
          font-size: 12px;
          font-weight: 600;
        }
        .veshoj-field-error svg {
          width: 12px;
          height: 12px;
          flex-shrink: 0;
        }
        .veshoj-summary-row {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          border-bottom: 1px solid ${orderFormBorderColor};
          padding: 9px 0;
          color: ${orderFormTextColor};
          font-size: 14px;
        }
        .veshoj-summary-row strong {
          color: ${orderFormTitleColor};
        }
        .veshoj-total {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          padding: 12px 0 4px;
          color: ${orderFormTitleColor};
          font-size: 18px;
          font-weight: 800;
        }
        .veshoj-total span:last-child {
          color: ${orderFormAccentColor};
        }
        .veshoj-delivery-zone {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin: 12px 0;
        }
        .veshoj-delivery-zone button {
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 8px;
          color: #374151;
          font-size: 13px;
          font-weight: 700;
        }
        .veshoj-delivery-zone button.is-selected {
          border-color: ${orderFormAccentColor};
          background: ${orderFormAccentColor}12;
          color: ${orderFormAccentColor};
        }
        .veshoj-payment {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 12px 0;
          color: #4b5563;
          font-size: 14px;
        }
        .veshoj-privacy {
          margin: 8px 0 12px;
          color: #6b7280;
          font-size: 12px;
          line-height: 1.5;
        }
        .veshoj-submit {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          width: 100%;
          min-height: 54px;
          padding: 12px 18px;
          border-style: solid;
          border-width: ${buttonBorderWidth}px;
          border-color: ${buttonBorderColor};
          border-radius: ${buttonRadius}px;
          background: ${accentColor};
          color: ${buttonTextColor};
          font-size: 18px;
          font-weight: 800;
          box-shadow: 2px 3px 0 rgba(135, 135, 135, 0.98);
        }
        .veshoj-submit:disabled {
          opacity: .65;
          cursor: not-allowed;
        }
        .veshoj-floating {
          position: fixed;
          right: 18px;
          bottom: 18px;
          z-index: 50;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .veshoj-floating a {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 52px;
          height: 52px;
          border-radius: 999px;
          color: #ffffff;
          box-shadow: 0 10px 24px rgba(0,0,0,.2);
        }
        .veshoj-footer {
          border-top: 1px solid ${footerBorderColor};
          background: ${footerBgColor};
          color: ${footerTextColor};
          text-align: center;
          padding: 24px 12px;
          font-size: 13px;
        }
        @media (max-width: 767px) {
          .veshoj-shell {
            padding-left: 8px;
            padding-right: 8px;
          }
          .veshoj-purple-strip h1,
          .veshoj-purple-strip h2,
          .veshoj-heading-band h2,
          .veshoj-phone-section h2 {
            font-size: 19px;
          }
          .veshoj-strip-copy {
            font-size: 11px;
            line-height: 2.4;
          }
          .veshoj-image-stack {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 7px;
          }
          .veshoj-wide-heading-band {
            margin-bottom: 12px;
            padding: 6px 9px 7px;
          }
          .veshoj-problems-layout {
            grid-template-columns: 1fr;
            gap: 14px;
            margin-top: 12px;
          }
          .veshoj-problems-list {
            gap: 6px;
            margin-top: 0;
          }
          .veshoj-problems-list li {
            gap: 8px;
            font-size: 16px;
            line-height: 1.25;
          }
          .veshoj-problems-dot {
            width: 14px;
            height: 14px;
            margin-top: 3px;
            flex-basis: 14px;
          }
          .veshoj-offer-price-section {
            margin: 10px calc(50% - 50vw) 22px;
            padding: 10px 10px 22px;
          }
          .veshoj-offer-inner {
            width: min(100%, calc(100vw - 20px));
          }
          .veshoj-offer-old-price {
            font-size: 19px;
            line-height: 1.3;
          }
          .veshoj-offer-current-price {
            margin-top: -1px;
            font-size: 34px;
            line-height: 1.22;
          }
          .veshoj-offer-marker-x path {
            stroke-width: 7;
          }
          .veshoj-offer-marker-double-underline path {
            stroke-width: 8;
          }
          .veshoj-offer-band {
            min-height: 104px;
            margin: 14px auto 14px;
            padding: 8px 10px;
          }
          .veshoj-offer-band-text {
            font-size: 15px;
            line-height: 1.4;
          }
          .veshoj-offer-button-wrap .veshoj-cta-button {
            min-height: 46px;
            padding: 7px 20px 8px;
            font-size: 20px;
          }
          .veshoj-review-heading {
            gap: 12px;
            margin: 20px 0 14px;
            padding: 8px 10px 10px;
          }
          .veshoj-review-heading h2 {
            font-size: 24px;
          }
          .veshoj-review-carousel-wrap {
            padding: 0;
          }
          .veshoj-review-nav {
            display: none;
          }
          .veshoj-review-carousel {
            max-width: none;
            padding-left: 14px;
            padding-right: 14px;
            gap: 12px;
            scrollbar-width: none;
          }
          .veshoj-review-carousel::-webkit-scrollbar {
            display: none;
          }
          .veshoj-video-review-card,
          .veshoj-image-review-card {
            flex-basis: 82%;
          }
          .veshoj-video-review-card {
            flex-basis: 88%;
          }
          .veshoj-checkout-grid {
            grid-template-columns: 1fr;
          }
          .veshoj-checkout {
            padding: 10px;
          }
          .veshoj-product-card {
            align-items: flex-start;
          }
          .veshoj-product-card img {
            width: 64px;
            height: 64px;
          }
          .veshoj-submit {
            font-size: 16px;
          }
        }
      `}</style>

      <div className="veshoj-page">
        <main className="veshoj-shell">
          <div className="veshoj-logo">
            <img src={brandLogo} alt={page.title || 'Veshoj'} />
          </div>

          <section className="veshoj-purple-strip">
            <h1 dangerouslySetInnerHTML={{
              __html: page.hero_title || 'মাত্র ৭ দিন<br />সেবনে সাদা স্রা-ব, দুর্গন্ধ ও চুলকানি নিয়ন্ত্রণে আসবে ইনশাল্লাহ!',
            }} />
          </section>

          {page.hero_layout === 'video-first' && heroVideoUrl ? (
            <section className="veshoj-hero-video">
              {page.hero_subtitle && page.hero_subtitle_position !== 'below-image' && (
                <h2 className="veshoj-video-title" dangerouslySetInnerHTML={{ __html: page.hero_subtitle }} />
              )}
              <HeroVideoEmbed
                url={heroVideoUrl}
                title={`${page.title || 'Veshoj'} hero video`}
                accentColor="#f4ff00"
                className="veshoj-hero-video-embed"
                frameClassName="rounded-lg"
              />
              {page.hero_subtitle && page.hero_subtitle_position === 'below-image' && (
                <h2 className="veshoj-video-title" dangerouslySetInnerHTML={{ __html: page.hero_subtitle }} />
              )}
              <div className="veshoj-cta-wrap">
                <button
                  type="button"
                  onClick={scrollToOrderForm}
                  className="veshoj-main-button"
                  style={{
                    borderColor: buttonBorderColor,
                    borderWidth: buttonBorderWidth,
                    borderRadius: buttonRadius,
                  }}
                >
                  {page.hero_button_text || 'à¦…à¦°à§à¦¡à¦¾à¦° à¦•à¦°à§à¦¨'}
                </button>
              </div>
            </section>
          ) : heroVideoSection ? (
            renderHeroVideoBanner(heroVideoSection)
          ) : (
            <>
              <img className="veshoj-cover" src={coverImage} alt={page.title || 'Veshoj cover'} />

              <div
                className="veshoj-subtitle"
                dangerouslySetInnerHTML={{
                  __html: page.hero_subtitle || 'আলহামদুলিল্লাহ! ১ লক্ষ+ মা-বোন ইতোমধ্যে উপকার পেয়েছেন।',
                }}
              />

              <div className="veshoj-cta-wrap">
                <button
                  type="button"
                  onClick={scrollToOrderForm}
                  className="veshoj-main-button"
                  style={{
                    borderColor: buttonBorderColor,
                    borderWidth: buttonBorderWidth,
                    borderRadius: buttonRadius,
                  }}
                >
                  {page.hero_button_text || 'অর্ডার করুন'}
                </button>
              </div>
            </>
          )}

          {contentSections.map(renderSection)}

          {page.show_order_form !== false && (
            <section ref={orderFormRef} className="veshoj-checkout">
              <h2 className="veshoj-order-instruction">
                অর্ডার করতে নিচের ফর্মে আপনার নাম, পূর্ণ ঠিকানা এবং মোবাইল নাম্বার লিখুন। তারপর নিচে সাবমিট অর্ডার বাটনে ক্লিক করে আপনার অর্ডারটি সম্পন্ন করুন।
              </h2>

              {submitted ? (
                <div className="veshoj-card text-center">
                  <h3>ধন্যবাদ!</h3>
                  <p>আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে। শীঘ্রই আমরা আপনার সাথে যোগাযোগ করবো।</p>
                </div>
              ) : (
                <div className="veshoj-checkout-grid">
                  <div>
                    <div className="veshoj-card">
                      <h3>আপনার অর্ডার</h3>
                      {displayProducts.map((product) => {
                        const orderItem = orderItems.find((item) => item.product.id === product.id);
                        const isSelected = !!orderItem;
                        return (
                          <button
                            type="button"
                            key={product.id}
                            onClick={() => toggleProduct(product)}
                            className={`veshoj-product-card ${isSelected ? 'is-selected' : ''}`}
                          >
                            {product.is_featured && (
                              <span className="veshoj-featured">{product.featured_label || 'বেস্ট অফার'}</span>
                            )}
                            {product.image_url && <img src={product.image_url} alt={product.name} />}
                            <div className="flex-1">
                              <div className="veshoj-product-name">{product.name}</div>
                              {product.description && <div className="text-xs text-gray-500 mt-1">{product.description}</div>}
                              <div className="veshoj-product-price">{formatMoney(product.price)} ৳</div>
                              {isSelected && product.allow_quantity_selector !== false && (
                                <div className="veshoj-qty" onClick={(event) => event.stopPropagation()}>
                                  <button type="button" onClick={() => updateQuantity(product.id, -1)}>
                                    <FaMinus />
                                  </button>
                                  <strong>{orderItem!.quantity}</strong>
                                  <button type="button" onClick={() => updateQuantity(product.id, 1)}>
                                    <FaPlus />
                                  </button>
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="veshoj-card">
                      <h3>অর্ডারের তথ্য</h3>
                      <div className="veshoj-form-fields">
                        <div>
                          <label className={formTouched && !orderForm.name ? 'text-red-600' : ''}>আপনার নাম লিখুন *</label>
                          <input
                            type="text"
                            value={orderForm.name}
                            onChange={(e) => setOrderForm((prev) => ({ ...prev, name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className={formTouched && !orderForm.address ? 'text-red-600' : ''}>বিস্তারিত ঠিকানা লিখুন *</label>
                          <textarea
                            value={orderForm.address}
                            rows={2}
                            onChange={(e) => setOrderForm((prev) => ({ ...prev, address: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className={formTouched && !orderForm.district ? 'text-red-600' : ''}>জেলা / District *</label>
                          <div className="veshoj-district-field" ref={districtDropdownRef}>
                            <input
                              type="text"
                              value={districtQuery}
                              onChange={(event) => {
                                const value = event.target.value;
                                touchedRef.current.district = true;
                                setDistrictQuery(value);
                                setOrderForm((prev) => ({ ...prev, district: value }));
                                setDistrictDropdownOpen(true);
                              }}
                              onInput={(event) => {
                                const value = event.currentTarget.value;
                                setDistrictQuery(value);
                                setOrderForm((prev) => ({ ...prev, district: value }));
                                setDistrictDropdownOpen(true);
                              }}
                              onCompositionStart={() => setDistrictDropdownOpen(true)}
                              onCompositionEnd={(event) => {
                                const value = event.currentTarget.value;
                                setDistrictQuery(value);
                                setOrderForm((prev) => ({ ...prev, district: value }));
                                setDistrictDropdownOpen(true);
                              }}
                              onFocus={() => setDistrictDropdownOpen(true)}
                              placeholder="জেলা নির্বাচন করুন বা লিখুন"
                              className={formTouched && !orderForm.district ? 'is-invalid' : ''}
                              autoComplete="off"
                            />
                            {districtDropdownOpen && (
                              <div className="veshoj-district-dropdown">
                                {filteredDistricts.length > 0 ? (
                                  filteredDistricts.map((district) => (
                                    <button
                                      key={district.en}
                                      type="button"
                                      onMouseDown={(event) => {
                                        event.preventDefault();
                                        selectDistrict(district);
                                      }}
                                    >
                                      <span>{district.en}</span>
                                      <small>{district.bn}</small>
                                    </button>
                                  ))
                                ) : (
                                  <div className="veshoj-district-empty">No district found</div>
                                )}
                              </div>
                            )}
                          </div>
                          {formTouched && !orderForm.district && (
                            <p className="veshoj-field-error">
                              <FaExclamationTriangle />
                              জেলা নির্বাচন করা আবশ্যক
                            </p>
                          )}
                        </div>
                        <div>
                          <label className={formTouched && !isBdPhoneValid() ? 'text-red-600' : ''}>১১ ডিজিটের ফোন নম্বর লিখুন *</label>
                          <PhoneInput
                            value={orderForm.phone}
                            onChange={(value) => setOrderForm((prev) => ({ ...prev, phone: value }))}
                            required
                            placeholder="01XXXXXXXXX"
                          />
                        </div>
                        <div>
                          <label>নোট (ঐচ্ছিক)</label>
                          <textarea
                            value={orderForm.note}
                            rows={2}
                            onChange={(e) => setOrderForm((prev) => ({ ...prev, note: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <aside className="veshoj-card">
                    <h3>আপনার অর্ডার</h3>
                    <div className="veshoj-summary-row">
                      <strong>Product</strong>
                      <strong>Subtotal</strong>
                    </div>
                    {orderItems.map((item) => (
                      <div key={item.product.id} className="veshoj-summary-row">
                        <span>{item.product.name} &times; {item.quantity}</span>
                        <span>{formatMoney(item.product.price * item.quantity)} ৳</span>
                      </div>
                    ))}

                    {!page.free_delivery && Number(page.delivery_charge_outside || page.delivery_charge || 0) > 0 && (
                      <div className="veshoj-delivery-zone">
                        <button
                          type="button"
                          onClick={() => setDeliveryZone('inside')}
                          className={deliveryZone === 'inside' ? 'is-selected' : ''}
                        >
                          ঢাকার ভিতরে
                          <br />
                          {formatMoney(Number(page.delivery_charge || 0))} ৳
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeliveryZone('outside')}
                          className={deliveryZone === 'outside' ? 'is-selected' : ''}
                        >
                          ঢাকার বাইরে
                          <br />
                          {formatMoney(Number(page.delivery_charge_outside || page.delivery_charge || 0))} ৳
                        </button>
                      </div>
                    )}

                    <div className="veshoj-summary-row">
                      <span>Shipping</span>
                      <strong>
                        {page.free_delivery || getDeliveryCharge() === 0
                          ? 'ডেলিভারি চার্জ একদম ফ্রি!'
                          : `${formatMoney(getDeliveryCharge())} ৳`}
                      </strong>
                    </div>
                    {page.delivery_note && (
                      <div className="text-xs text-green-700 bg-green-50 border border-green-100 rounded px-3 py-2 mt-3 flex items-center gap-2">
                        <FaTruck /> {page.delivery_note}
                      </div>
                    )}
                    <div className="veshoj-total">
                      <span>Total</span>
                      <span>{formatMoney(getTotal())} ৳</span>
                    </div>
                    {page.cash_on_delivery !== false && (
                      <div className="veshoj-payment">
                        <input type="radio" checked readOnly />
                        <span>Cash on delivery - পণ্য হাতে পেয়ে অর্থ প্রদান করুন।</span>
                      </div>
                    )}
                    <p className="veshoj-privacy">
                      Your personal data will be used to process your order, support your experience throughout this website, and for other purposes described in our privacy policy.
                    </p>
                    {orderGuardNoteHtml && (
                      <div
                        className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                        dangerouslySetInnerHTML={{ __html: orderGuardNoteHtml }}
                      />
                    )}
                    <button type="button" onClick={handleSubmitOrder} disabled={submitting} className="veshoj-submit">
                      <FaShoppingCart />
                      {submitting ? 'Processing...' : `সাবমিট অর্ডার  ${formatMoney(getTotal())}৳`}
                    </button>
                  </aside>
                </div>
              )}
            </section>
          )}
        </main>

        <div className="veshoj-floating">
          {whatsappNumber && (
            <a
              href={`https://wa.me/${plainPhone(whatsappNumber).replace(/^\+/, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ backgroundColor: page.floating_whatsapp_color || '#25D366' }}
              aria-label="WhatsApp"
            >
              <FaWhatsapp />
            </a>
          )}
          {phoneNumber && (
            <a
              href={`tel:${plainPhone(phoneNumber)}`}
              style={{ backgroundColor: page.floating_phone_color || accentColor }}
              aria-label="Call"
            >
              <FaPhone />
            </a>
          )}
        </div>

        <footer className="veshoj-footer">
          <p>© {new Date().getFullYear()} TrustCart. All rights reserved.</p>
        </footer>
      </div>
    </>
  );
}

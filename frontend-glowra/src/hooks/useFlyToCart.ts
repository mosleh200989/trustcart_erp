import { useCallback } from 'react';

export function useFlyToCart() {
  /**
   * @param buttonEl  — the Add-to-Cart button (animation starts here)
   * @param cardEl    — the product card (we grab its image for the flying clone)
   */
  const fly = useCallback((buttonEl: HTMLElement, cardEl?: HTMLElement | null) => {
    const isMobile = window.innerWidth < 1024;
    const targetEl =
      document.getElementById(isMobile ? 'mobile-cart-icon' : 'desktop-cart-icon') ??
      document.getElementById(isMobile ? 'desktop-cart-icon' : 'mobile-cart-icon');

    if (!targetEl) return;

    // Start position = center of the button that was clicked
    const src = buttonEl.getBoundingClientRect();
    const startX = src.left + src.width / 2;
    const startY = src.top + src.height / 2;

    // Try to grab the product image from the card for the flying clone
    const imgEl = cardEl?.querySelector('img') ?? buttonEl.closest('[class*="product"]')?.querySelector('img');

    const bird = document.createElement('div');

    if (imgEl) {
      const clone = document.createElement('img');
      clone.src = (imgEl as HTMLImageElement).src;
      clone.style.cssText = 'width:48px;height:48px;border-radius:50%;object-fit:cover;';
      bird.appendChild(clone);
    } else {
      bird.textContent = '🛒';
      bird.style.fontSize = '28px';
    }

    bird.style.cssText += `
      position:fixed; pointer-events:none; z-index:999999;
      left:${startX - 24}px; top:${startY - 24}px;
      filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));
    `;
    document.body.appendChild(bird);

    // Reveal the navbar so the cart icon target is visible during flight
    if (typeof (window as any).__showNavbar === 'function') {
      (window as any).__showNavbar();
    }
    window.dispatchEvent(new CustomEvent('fly-to-cart-start'));

    const duration = 1800;
    const start = performance.now();

    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      const arc = Math.sin(Math.PI * t) * -60;

      // Re-read target position each frame (navbar may be sliding in)
      const tgt = targetEl.getBoundingClientRect();
      const endX = tgt.left + tgt.width / 2;
      const endY = tgt.top + tgt.height / 2;

      bird.style.left = `${startX + (endX - startX) * ease - 24}px`;
      bird.style.top = `${startY + (endY - startY) * ease + arc - 24}px`;
      bird.style.transform = `scale(${1 - t * 0.6})`;
      bird.style.opacity = `${t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1}`;

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        bird.remove();
        targetEl.classList.add('animate-bounce');
        setTimeout(() => targetEl.classList.remove('animate-bounce'), 800);
      }
    };

    requestAnimationFrame(step);
  }, []);

  return { fly };
}

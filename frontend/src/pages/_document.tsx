import NextDocument, { DocumentContext, DocumentInitialProps, Head, Html, Main, NextScript } from 'next/document';

const MAIN_TRUSTCART_GTM_ID = 'GTM-TSC7TFV6';
const MAIN_TRUSTCART_PIXEL_ID = '1882443545705830';
const HERBOLIN_GTM_ID = 'GTM-PK5G5DWZ';
const ARABIAN_KHALTA_GTM_ID = 'GTM-KVLD23CH';
const ARABIAN_KHALTA_PIXEL_ID = ['227057045377', '2206'].join('');
const VESHOJ_PIXEL_ID = ['339637066199', '40423'].join('');
const NATURAL_GLOWRA_PIXEL_ID = ['161357191048', '7102'].join('');

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
    __landingPagePixelsInitialized?: Record<string, boolean>;
    __arabianKhaltaPixelPageViewTracked?: boolean;
    __veshojPixelPageViewTracked?: boolean;
    __naturalGlowraPixelPageViewTracked?: boolean;
  }
}

interface TrustCartDocumentProps extends DocumentInitialProps {
  isArabianKhaltaSurface: boolean;
  isVeshojSurface: boolean;
  isNaturalGlowraSurface: boolean;
  isDedicatedPixelHost: boolean;
}

function isArabianKhaltaDocumentSurface(ctx: DocumentContext) {
  const host = String(ctx.req?.headers.host || '').split(':')[0].toLowerCase();

  return (
    host === 'arabiankhalta.com' ||
    host === 'www.arabiankhalta.com'
  );
}

function isVeshojDocumentSurface(ctx: DocumentContext) {
  const host = String(ctx.req?.headers.host || '').split(':')[0].toLowerCase();

  return (
    host === 'veshoj.site' ||
    host === 'www.veshoj.site'
  );
}

/**
 * Hosts that run their own dedicated pixel. The main TrustCart pixel snippet is
 * omitted entirely on these, rather than rendered and early-returned at runtime:
 * Meta's Pixel Helper scans source for `fbq('init','<id>')` and reports the pixel
 * as present even when the surrounding block never executes.
 */
const DEDICATED_PIXEL_HOSTS = new Set([
  'arabiankhalta.com', 'www.arabiankhalta.com',
  'veshoj.site', 'www.veshoj.site',
  'naturalglowra.com', 'www.naturalglowra.com',
  'herbolin.com', 'www.herbolin.com',
]);

function isDedicatedPixelDocumentHost(ctx: DocumentContext) {
  const host = String(ctx.req?.headers.host || '').split(':')[0].toLowerCase();
  return DEDICATED_PIXEL_HOSTS.has(host);
}

function isNaturalGlowraDocumentSurface(ctx: DocumentContext) {
  const host = String(ctx.req?.headers.host || '').split(':')[0].toLowerCase();

  return (
    host === 'naturalglowra.com' ||
    host === 'www.naturalglowra.com'
  );
}

export default function Document({
  isArabianKhaltaSurface,
  isVeshojSurface,
  isNaturalGlowraSurface,
  isDedicatedPixelHost,
}: TrustCartDocumentProps) {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta name="description" content="TrustCart — Shop premium organic groceries, pure ghee, honey, spices & healthy food online. Fresh, authentic & delivered to your door in Bangladesh." />
        {/* Facebook Domain Verification */}
        <meta name="facebook-domain-verification" content="k9s0mrkab3u3ir6tgt7i2o97es1pa2" />
        {/* Favicon */}
        <link rel="icon" type="image/jpeg" href="/trustcart-logo-tab.jpg" />
        <link rel="shortcut icon" type="image/jpeg" href="/trustcart-logo-tab.jpg" />
        <link rel="apple-touch-icon" href="/trustcart-logo-tab.jpg" />
        {/* Google Fonts - Supports Bangla */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        {/* Bootstrap CSS (CDN) */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css"
        />
        {/* Keep each Meta pixel initialized once and suppress duplicate PageViews from legacy GTM tags. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w){
              var mainPixelId=${isDedicatedPixelHost ? "''" : "['188244354570','5830'].join('')"};
              var arabianPixelId=['227057045377','2206'].join('');
              var h=w.location.hostname;
              var p=w.location.pathname.replace(/\\\/$/,'')||'/';
              var params=new URLSearchParams(w.location.search);
              var routeSlug=(p.indexOf('/lp/')===0?p.split('/').filter(Boolean).pop():'').toLowerCase();
              var querySlug=(params.get('landing_page')||params.get('landing_page_intl')||params.get('cartflows_step')||'').toLowerCase();
              var isArabian=h==='arabiankhalta.com'||h==='www.arabiankhalta.com'||p==='/arabiankhalta'||routeSlug==='arabiankhalta'||querySlug==='arabiankhalta';
              var isVeshojHost=h==='veshoj.site'||h==='www.veshoj.site';
              var isVeshoj=(isVeshojHost&&(p==='/'||p==='/lp/veshoj'||p==='/veshoj'))||routeSlug==='veshoj'||querySlug==='veshoj';
              var isHerbolin=h==='herbolin.com'||h==='www.herbolin.com'||routeSlug==='harbora-kosthogut'||querySlug==='harbora-kosthogut';
              var isGlowraHost=h==='naturalglowra.com'||h==='www.naturalglowra.com';
              var isGlowra=(isGlowraHost&&(p==='/'||p==='/lp/natural-glowra-coconut-oil'))||routeSlug==='natural-glowra-coconut-oil'||querySlug==='natural-glowra-coconut-oil';
              var isMain=!isArabian&&!isVeshoj&&!isHerbolin&&!isGlowra;
              var initialized={};
              var pageViews={};

              function shouldBlock(args){
                var command=args&&args[0];
                var pixelId=args&&args[1];
                if(!isArabian&&(command==='init'||command==='trackSingle'||command==='trackSingleCustom')&&String(pixelId)===arabianPixelId)return true;
                if(!isMain&&mainPixelId&&(command==='init'||command==='trackSingle'||command==='trackSingleCustom')&&String(pixelId)===mainPixelId)return true;
                if(command==='init'){
                  pixelId=String(pixelId||'');
                  if(initialized[pixelId])return true;
                  initialized[pixelId]=true;
                }
                if(command==='track'&&args&&args[1]==='PageView')return true;
                if(command==='trackSingle'&&args&&args[2]==='PageView'){
                  var pageViewKey=String(pixelId||'')+':'+w.location.pathname+w.location.search+w.location.hash;
                  if(pageViews[pageViewKey])return true;
                  pageViews[pageViewKey]=true;
                }
                if(!isMain)return false;
                return false;
              }

              function wrapFbq(fn){
                if(typeof fn!=='function')return fn;
                if(fn.__trustcartMetaGuarded)return fn;
                var guarded=typeof Proxy==='function'
                  ? new Proxy(fn,{apply:function(target,thisArg,args){if(shouldBlock(args))return;return target.apply(thisArg,args);}})
                  : function(){if(shouldBlock(arguments))return;return fn.apply(this,arguments);};
                try{Object.defineProperty(guarded,'__trustcartMetaGuarded',{value:true});}catch(e){}
                return guarded;
              }

              function guardQueue(name){
                var currentQueue;
                try{
                  Object.defineProperty(w,name,{
                    configurable:true,
                    get:function(){return currentQueue;},
                    set:function(next){currentQueue=wrapFbq(next);}
                  });
                }catch(e){
                  if(w[name])w[name]=wrapFbq(w[name]);
                }
              }

              guardQueue('fbq');
              guardQueue('_fbq');
            })(window);`,
          }}
        />
        {/* Main TrustCart Meta Pixel. The GTM container owns PageView and ecommerce emission. */}
        {!isDedicatedPixelHost && (
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d){
              var h=w.location.hostname.replace(/^www\\./,'').toLowerCase();
              var p=w.location.pathname.replace(/\\/$/,'')||'/';
              var params=new URLSearchParams(w.location.search);
              var routeSlug=(p.indexOf('/lp/')===0?p.split('/').filter(Boolean).pop():'').toLowerCase();
              var querySlug=(params.get('landing_page')||params.get('landing_page_intl')||params.get('cartflows_step')||'').toLowerCase();
              var isDedicated=routeSlug==='veshoj'||routeSlug==='arabiankhalta'||routeSlug==='harbora-kosthogut'||routeSlug==='natural-glowra-coconut-oil'||querySlug==='veshoj'||querySlug==='arabiankhalta'||querySlug==='harbora-kosthogut'||querySlug==='natural-glowra-coconut-oil';
              var isMainHost=h==='trustcart.com.bd'||h==='trustkert.com'||h==='shop.trustcart.com.bd';
              if(!isMainHost||isDedicated)return;
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(w,d,'script','https://connect.facebook.net/en_US/fbevents.js');
              var mainPixelId=['188244354570','5830'].join('');
              w.fbq('init', mainPixelId);
            })(window,document);`,
          }}
        />
        )}
        {/* Google Tag Manager - Arabian Khalta only */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){
              var h=w.location.hostname;
              var p=w.location.pathname.replace(/\\/$/,'')||'/';
              var params=new URLSearchParams(w.location.search);
              var routeSlug=(p.indexOf('/lp/')===0?p.split('/').filter(Boolean).pop():'').toLowerCase();
              var querySlug=(params.get('landing_page')||params.get('landing_page_intl')||params.get('cartflows_step')||'').toLowerCase();
              var isArabianKhaltaSurface=h==='arabiankhalta.com'||h==='www.arabiankhalta.com'||p==='/arabiankhalta'||routeSlug==='arabiankhalta'||querySlug==='arabiankhalta';
              if(!isArabianKhaltaSurface)return;
              w.__arabianKhaltaGtmLoaded=true;
              w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${ARABIAN_KHALTA_GTM_ID}');`,
          }}
        />
        {/* End Google Tag Manager - Arabian Khalta only */}
        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,mainId,herbolinId){var hostname=w.location.hostname;
                  var pathname=w.location.pathname.replace(/\\/$/,'')||'/';
                  var params=new URLSearchParams(w.location.search);
                  var routeSlug=(pathname.indexOf('/lp/')===0?pathname.split('/').filter(Boolean).pop():'').toLowerCase();
                  var querySlug=(params.get('landing_page')||params.get('landing_page_intl')||params.get('cartflows_step')||'').toLowerCase();
                  var isArabianKhaltaSurface=hostname==='arabiankhalta.com'||hostname==='www.arabiankhalta.com'||pathname==='/arabiankhalta'||routeSlug==='arabiankhalta'||querySlug==='arabiankhalta';
                  var isVeshojHost=hostname==='veshoj.site'||hostname==='www.veshoj.site';
                  var isVeshojSurface=(isVeshojHost&&(pathname==='/'||pathname==='/lp/veshoj'||pathname==='/veshoj'))||routeSlug==='veshoj'||querySlug==='veshoj';
                  var isGlowraHost=hostname==='naturalglowra.com'||hostname==='www.naturalglowra.com';
                  var isNaturalGlowraSurface=(isGlowraHost&&(pathname==='/'||pathname==='/lp/natural-glowra-coconut-oil'))||routeSlug==='natural-glowra-coconut-oil'||querySlug==='natural-glowra-coconut-oil';
                  if(isArabianKhaltaSurface||isVeshojSurface||isNaturalGlowraSurface)return;
                  var isHerbolinPixelSurface=hostname==='herbolin.com'||hostname==='www.herbolin.com'||routeSlug==='harbora-kosthogut'||querySlug==='harbora-kosthogut';
                  var containerId=isHerbolinPixelSurface?herbolinId:mainId;
                  if(!containerId)return;
                  w[l]=w[l]||[];w[l].push({'gtm.start':
                  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                  'https://www.googletagmanager.com/gtm.js?id='+containerId+dl;f.parentNode.insertBefore(j,f);
                  })(window,document,'script','dataLayer','${MAIN_TRUSTCART_GTM_ID}','${HERBOLIN_GTM_ID}');`,
          }}
        />
        {/* End Google Tag Manager */}
        {/* Microsoft Clarity - TrustCart/Arabian Khalta = ve56op0b59, Herbolin = wip0d992cu */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              var h=window.location.hostname;
              var p=window.location.pathname.replace(/\\/$/,'')||'/';
              var params=new URLSearchParams(window.location.search);
              var routeSlug=p.indexOf('/lp/')===0?p.split('/').filter(Boolean).pop():null;
              var querySlug=params.get('landing_page')||params.get('landing_page_intl')||params.get('cartflows_step');
              var isArabianKhalta=h==='arabiankhalta.com'||h==='www.arabiankhalta.com';
              var useHerbolin=!isArabianKhalta&&(h==='herbolin.com'||h==='www.herbolin.com'||routeSlug==='Harbora-kosthogut'||querySlug==='Harbora-kosthogut');
              var id=useHerbolin?'wip0d992cu':'ve56op0b59';
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window,document,"clarity","script",id);
            })();`,
          }}
        />
        {/* End Microsoft Clarity */}
        {/* Google Analytics (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-XNK0GEB5NX" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-XNK0GEB5NX');`,
          }}
        />
        {/* End Google Analytics */}
        {/* Meta (Facebook) Pixel */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d){
              var h=w.location.hostname;
              var isArabianKhaltaSurface=h==='arabiankhalta.com'||h==='www.arabiankhalta.com';
              if(!isArabianKhaltaSurface)return;
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(w, d,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              var pixelId=['227057045377','2206'].join('');
              w.fbq('init', pixelId);
              w.fbq('trackSingle', pixelId, 'PageView');
              w.__landingPagePixelsInitialized = w.__landingPagePixelsInitialized || {};
              w.__landingPagePixelsInitialized[pixelId] = true;
              w.__arabianKhaltaPixelPageViewTracked = true;
            })(window, document);`,
          }}
        />
        {/* End Meta Pixel */}
        {/* Meta Pixel - Veshoj only */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d){
              var h=w.location.hostname;
              var p=w.location.pathname.replace(/\\/$/,'')||'/';
              var params=new URLSearchParams(w.location.search);
              var routeSlug=p.indexOf('/lp/')===0?p.split('/').filter(Boolean).pop():null;
              var querySlug=params.get('landing_page')||params.get('landing_page_intl')||params.get('cartflows_step');
              var isVeshojHost=h==='veshoj.site'||h==='www.veshoj.site';
              var isVeshojSurface=(isVeshojHost&&(p==='/'||p==='/lp/veshoj'||p==='/veshoj'))||routeSlug==='veshoj'||querySlug==='veshoj';
              if(!isVeshojSurface)return;
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(w, d,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              var pixelId='${VESHOJ_PIXEL_ID}';
              w.fbq('init', pixelId);
              w.fbq('trackSingle', pixelId, 'PageView');
              w.__landingPagePixelsInitialized = w.__landingPagePixelsInitialized || {};
              w.__landingPagePixelsInitialized[pixelId] = true;
              w.__veshojPixelPageViewTracked = true;
            })(window, document);`,
          }}
        />
        {/* End Meta Pixel - Veshoj only */}
        {/* Meta Pixel - Natural Glowra only */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d){
              var h=w.location.hostname;
              var p=w.location.pathname.replace(/\\/$/,'')||'/';
              var params=new URLSearchParams(w.location.search);
              var routeSlug=p.indexOf('/lp/')===0?p.split('/').filter(Boolean).pop():null;
              var querySlug=params.get('landing_page')||params.get('landing_page_intl')||params.get('cartflows_step');
              var isGlowraHost=h==='naturalglowra.com'||h==='www.naturalglowra.com';
              var isGlowraSurface=(isGlowraHost&&(p==='/'||p==='/lp/natural-glowra-coconut-oil'))||routeSlug==='natural-glowra-coconut-oil'||querySlug==='natural-glowra-coconut-oil';
              if(!isGlowraSurface)return;
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(w, d,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              var pixelId='${NATURAL_GLOWRA_PIXEL_ID}';
              w.fbq('init', pixelId);
              w.fbq('trackSingle', pixelId, 'PageView');
              w.__landingPagePixelsInitialized = w.__landingPagePixelsInitialized || {};
              w.__landingPagePixelsInitialized[pixelId] = true;
              w.__naturalGlowraPixelPageViewTracked = true;
            })(window, document);`,
          }}
        />
        {/* End Meta Pixel - Natural Glowra only */}
        {/* Global AddToCart Tracker for Custom Landing Pages */}
        <script
          dangerouslySetInnerHTML={{
            __html: `function trackCart(){
              var priceElement = document.getElementById('price');
              var price = priceElement ? Number(priceElement.value) : 0;
              var h = window.location.hostname;
              var p = window.location.pathname.replace(/\\/$/,'') || '/';
              var params = new URLSearchParams(window.location.search);
              var routeSlug = (p.indexOf('/lp/') === 0 ? p.split('/').filter(Boolean).pop() : '').toLowerCase();
              var querySlug = (params.get('landing_page') || params.get('landing_page_intl') || params.get('cartflows_step') || '').toLowerCase();
              var pixelId = ['188244354570','5830'].join('');
              if (h === 'arabiankhalta.com' || h === 'www.arabiankhalta.com' || p === '/arabiankhalta' || routeSlug === 'arabiankhalta' || querySlug === 'arabiankhalta') {
                pixelId = '${ARABIAN_KHALTA_PIXEL_ID}';
              } else if (h === 'veshoj.site' || h === 'www.veshoj.site' || routeSlug === 'veshoj' || querySlug === 'veshoj') {
                pixelId = '${VESHOJ_PIXEL_ID}';
              } else if (h === 'herbolin.com' || h === 'www.herbolin.com' || routeSlug === 'harbora-kosthogut' || querySlug === 'harbora-kosthogut') {
                pixelId = ['1433976858485','362'].join('');
              } else if (h === 'naturalglowra.com' || h === 'www.naturalglowra.com' || routeSlug === 'natural-glowra-coconut-oil' || querySlug === 'natural-glowra-coconut-oil') {
                pixelId = '${NATURAL_GLOWRA_PIXEL_ID}';
              }
              if (window.fbq) fbq('trackSingle', pixelId, 'AddToCart', { value: price, currency: 'BDT' });
            }`,
          }}
        />
      </Head>
      <body>
        {isArabianKhaltaSurface && (
          <>
            {/* Google Tag Manager (noscript) - Arabian Khalta only */}
            <noscript>
              <iframe
                src={`https://www.googletagmanager.com/ns.html?id=${ARABIAN_KHALTA_GTM_ID}`}
                height="0"
                width="0"
                style={{ display: 'none', visibility: 'hidden' }}
              />
            </noscript>
            {/* Meta Pixel (noscript) - Arabian Khalta only */}
            <noscript>
              <img
                height="1"
                width="1"
                style={{ display: 'none' }}
                src={`https://www.facebook.com/tr?id=${ARABIAN_KHALTA_PIXEL_ID}&ev=PageView&noscript=1`}
                alt=""
              />
            </noscript>
          </>
        )}
        {isVeshojSurface && (
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              src={`https://www.facebook.com/tr?id=${VESHOJ_PIXEL_ID}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        )}
        {isNaturalGlowraSurface && (
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              src={`https://www.facebook.com/tr?id=${NATURAL_GLOWRA_PIXEL_ID}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        )}
        <Main />
        <NextScript />
        {/* Bootstrap Bundle JS (includes Popper) */}
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
      </body>
    </Html>
  );
}

Document.getInitialProps = async (ctx: DocumentContext): Promise<TrustCartDocumentProps> => {
  const initialProps = await NextDocument.getInitialProps(ctx);

  return {
    ...initialProps,
    isArabianKhaltaSurface: isArabianKhaltaDocumentSurface(ctx),
    isVeshojSurface: isVeshojDocumentSurface(ctx),
    isNaturalGlowraSurface: isNaturalGlowraDocumentSurface(ctx),
    isDedicatedPixelHost: isDedicatedPixelDocumentHost(ctx),
  };
};

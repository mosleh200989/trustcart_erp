import NextDocument, { DocumentContext, DocumentInitialProps, Head, Html, Main, NextScript } from 'next/document';

const MAIN_TRUSTCART_GTM_ID = 'GTM-TSC7TFV6';
const MAIN_TRUSTCART_PIXEL_ID = '1882443545705830';
const HERBOLIN_GTM_ID = 'GTM-PK5G5DWZ';
const ARABIAN_KHALTA_GTM_ID = 'GTM-KVLD23CH';
const ARABIAN_KHALTA_PIXEL_ID = ['227057045377', '2206'].join('');
const VESHOJ_PIXEL_ID = ['339637066199', '40423'].join('');

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
    __landingPagePixelsInitialized?: Record<string, boolean>;
    __arabianKhaltaPixelPageViewTracked?: boolean;
    __veshojPixelPageViewTracked?: boolean;
  }
}

interface TrustCartDocumentProps extends DocumentInitialProps {
  isArabianKhaltaSurface: boolean;
  isVeshojSurface: boolean;
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

export default function Document({ isArabianKhaltaSurface, isVeshojSurface }: TrustCartDocumentProps) {
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
        {/* Keep each Meta pixel initialized once and make main-site PageView emission explicit. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w){
              var mainPixelId='${MAIN_TRUSTCART_PIXEL_ID}';
              var arabianPixelId=['227057045377','2206'].join('');
              var h=w.location.hostname;
              var p=w.location.pathname.replace(/\\\/$/,'')||'/';
              var params=new URLSearchParams(w.location.search);
              var routeSlug=p.indexOf('/lp/')===0?p.split('/').filter(Boolean).pop():null;
              var querySlug=params.get('landing_page')||params.get('landing_page_intl')||params.get('cartflows_step');
              var isArabian=h==='arabiankhalta.com'||h==='www.arabiankhalta.com';
              var isVeshojHost=h==='veshoj.site'||h==='www.veshoj.site';
              var isVeshoj=(isVeshojHost&&(p==='/'||p==='/lp/veshoj'||p==='/veshoj'))||routeSlug==='veshoj'||querySlug==='veshoj';
              var isHerbolin=h==='herbolin.com'||h==='www.herbolin.com'||routeSlug==='Harbora-kosthogut'||querySlug==='Harbora-kosthogut';
              var isMain=!isArabian&&!isVeshoj&&!isHerbolin;
              var initialized={};
              var pageViews={};

              function shouldBlock(args){
                var command=args&&args[0];
                var pixelId=args&&args[1];
                if(!isArabian&&(command==='init'||command==='trackSingle'||command==='trackSingleCustom')&&String(pixelId)===arabianPixelId)return true;
                if(command==='init'){
                  pixelId=String(pixelId||'');
                  if(initialized[pixelId])return true;
                  initialized[pixelId]=true;
                }
                if(!isMain)return false;
                if(command==='track'&&args&&args[1]==='PageView')return true;
                if(command==='trackSingle'&&String(pixelId)===mainPixelId&&args&&args[2]==='PageView'){
                  var options=args[4]||{};
                  var eventId=String(options.eventID||options.eventId||'');
                  if(eventId.indexOf('pv_')!==0||pageViews[eventId])return true;
                  pageViews[eventId]=true;
                }
                return false;
              }

              function wrapFbq(fn){
                if(typeof fn!=='function')return fn;
                var guarded=typeof Proxy==='function'
                  ? new Proxy(fn,{apply:function(target,thisArg,args){if(shouldBlock(args))return;return target.apply(thisArg,args);}})
                  : function(){if(shouldBlock(arguments))return;return fn.apply(this,arguments);};
                return guarded;
              }

              var currentFbq;
              try{
                Object.defineProperty(w,'fbq',{
                  configurable:true,
                  get:function(){return currentFbq;},
                  set:function(next){currentFbq=wrapFbq(next);}
                });
              }catch(e){
                if(w.fbq)w.fbq=wrapFbq(w.fbq);
              }
            })(window);`,
          }}
        />
        {/* Main TrustCart Meta Pixel. PageView is fired by _app with a shared browser/server event ID. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d){
              var h=w.location.hostname.replace(/^www\\./,'').toLowerCase();
              var isMainHost=h==='trustcart.com.bd'||h==='trustkert.com'||h==='shop.trustcart.com.bd';
              if(!isMainHost)return;
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(w,d,'script','https://connect.facebook.net/en_US/fbevents.js');
              w.fbq('init','${MAIN_TRUSTCART_PIXEL_ID}');
            })(window,document);`,
          }}
        />
        {/* Google Tag Manager - Arabian Khalta only */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){
              var h=w.location.hostname;
              var isArabianKhaltaSurface=h==='arabiankhalta.com'||h==='www.arabiankhalta.com';
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
                  var routeSlug=pathname.indexOf('/lp/')===0?pathname.split('/').filter(Boolean).pop():null;
                  var querySlug=params.get('landing_page')||params.get('landing_page_intl')||params.get('cartflows_step');
                  var isArabianKhaltaSurface=hostname==='arabiankhalta.com'||hostname==='www.arabiankhalta.com';
                  var isVeshojHost=hostname==='veshoj.site'||hostname==='www.veshoj.site';
                  var isVeshojSurface=(isVeshojHost&&(pathname==='/'||pathname==='/lp/veshoj'||pathname==='/veshoj'))||routeSlug==='veshoj'||querySlug==='veshoj';
                  if(isArabianKhaltaSurface||isVeshojSurface)return;
                  var isHerbolinPixelSurface=hostname==='herbolin.com'||hostname==='www.herbolin.com'||routeSlug==='Harbora-kosthogut'||querySlug==='Harbora-kosthogut';
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
              w.fbq('track', 'PageView');
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
        {/* Global AddToCart Tracker for Custom Landing Pages */}
        <script
          dangerouslySetInnerHTML={{
            __html: `function trackCart(){
              var priceElement = document.getElementById('price');
              var price = priceElement ? Number(priceElement.value) : 0;
              var h = window.location.hostname;
              var useArabianKhalta = h === 'arabiankhalta.com' || h === 'www.arabiankhalta.com';
              if (useArabianKhalta) {
                var arabianPixelId = ['227057045377','2206'].join('');
                if (window.fbq) fbq('trackSingle', arabianPixelId, 'AddToCart', { value: price, currency: 'BDT' });
              } else {
                if (window.fbq) fbq('track', 'AddToCart', { value: price, currency: 'BDT' });
              }
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
  };
};

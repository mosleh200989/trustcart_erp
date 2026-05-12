import { Html, Head, Main, NextScript } from 'next/document';

const MAIN_TRUSTCART_GTM_ID = 'GTM-TSC7TFV6';
const HERBOLIN_GTM_ID = 'GTM-PK5G5DWZ';
const ARABIAN_KHALTA_GTM_ID = process.env.NEXT_PUBLIC_ARABIAN_KHALTA_GTM_ID || '';
const ARABIAN_KHALTA_PIXEL_ID = process.env.NEXT_PUBLIC_ARABIAN_KHALTA_PIXEL_ID || '2270570453772206';

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

export default function Document() {
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
        {/* Arabian Khalta must never initialize the Herbolin Meta pixel, even from GTM/cached scripts. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w){
              var HERBOLIN_PIXEL_ID='1433976858485362';
              function isArabianKhaltaSurface(){
                var h=w.location.hostname;
                var p=w.location.pathname.replace(/\\/$/,'')||'/';
                var params=new URLSearchParams(w.location.search);
                var routeSlug=p.indexOf('/lp/')===0?p.split('/').filter(Boolean).pop():null;
                var querySlug=params.get('landing_page')||params.get('landing_page_intl')||params.get('cartflows_step');
                return h==='arabiankhalta.com'||h==='www.arabiankhalta.com'||p==='/arabiankhalta'||routeSlug==='arabiankhalta'||querySlug==='arabiankhalta';
              }
              if(!isArabianKhaltaSurface())return;
              w.__blockedMetaPixelIds=w.__blockedMetaPixelIds||{};
              w.__blockedMetaPixelIds[HERBOLIN_PIXEL_ID]=true;
              function shouldBlock(args){
                var a=Array.prototype.slice.call(args||[]);
                return a.indexOf(HERBOLIN_PIXEL_ID)!==-1;
              }
              function wrapFbq(fn){
                if(!fn||fn.__tcArabianPixelGuard)return fn;
                var guarded=function(){
                  if(shouldBlock(arguments))return;
                  return fn.apply(this,arguments);
                };
                guarded.__tcArabianPixelGuard=true;
                for(var key in fn){try{guarded[key]=fn[key];}catch(e){}}
                return guarded;
              }
              var current=w.fbq;
              try{
                Object.defineProperty(w,'fbq',{
                  configurable:true,
                  get:function(){return current;},
                  set:function(next){current=wrapFbq(next);}
                });
                if(current)w.fbq=current;
              }catch(e){
                if(w.fbq)w.fbq=wrapFbq(w.fbq);
              }
            })(window);`,
          }}
        />
        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,mainId,herbolinId,arabianId){var hostname=w.location.hostname;
              var pathname=w.location.pathname.replace(/\\/$/,'')||'/';
              var params=new URLSearchParams(w.location.search);
              var routeSlug=pathname.indexOf('/lp/')===0?pathname.split('/').filter(Boolean).pop():null;
              var querySlug=params.get('landing_page')||params.get('landing_page_intl')||params.get('cartflows_step');
              var isArabianKhaltaSurface=hostname==='arabiankhalta.com'||hostname==='www.arabiankhalta.com'||pathname==='/arabiankhalta'||routeSlug==='arabiankhalta'||querySlug==='arabiankhalta';
              var isHerbolinPixelSurface=!isArabianKhaltaSurface&&(hostname==='herbolin.com'||hostname==='www.herbolin.com'||routeSlug==='Harbora-kosthogut'||querySlug==='Harbora-kosthogut');
              var containerId=isArabianKhaltaSurface?arabianId:(isHerbolinPixelSurface?herbolinId:mainId);
              if(!containerId)return;
              w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+containerId+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${MAIN_TRUSTCART_GTM_ID}','${HERBOLIN_GTM_ID}','${ARABIAN_KHALTA_GTM_ID}');`,
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
              var isArabianKhalta=h==='arabiankhalta.com'||h==='www.arabiankhalta.com'||p==='/arabiankhalta'||routeSlug==='arabiankhalta'||querySlug==='arabiankhalta';
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
        {/* Meta (Facebook) Pixel - Managed by host-specific GTM container */}
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');`,
          }}
        />
        {/* End Meta Pixel - Now managed by host-specific GTM */}
        {/* Global AddToCart Tracker for Custom Landing Pages */}
        <script
          dangerouslySetInnerHTML={{
            __html: `function trackCart(){
              var priceElement = document.getElementById('price');
              var price = priceElement ? Number(priceElement.value) : 0;
              var h = window.location.hostname;
              var p = window.location.pathname.replace(/\\/$/,'') || '/';
              var params = new URLSearchParams(window.location.search);
              var routeSlug = p.indexOf('/lp/') === 0 ? p.split('/').filter(Boolean).pop() : null;
              var querySlug = params.get('landing_page') || params.get('landing_page_intl') || params.get('cartflows_step');
              var useArabianKhalta = h === 'arabiankhalta.com' || h === 'www.arabiankhalta.com' || p === '/arabiankhalta' || routeSlug === 'arabiankhalta' || querySlug === 'arabiankhalta';
              var useHerbolin = !useArabianKhalta && (h === 'herbolin.com' || h === 'www.herbolin.com' || routeSlug === 'Harbora-kosthogut' || querySlug === 'Harbora-kosthogut');
              if (useArabianKhalta && '${ARABIAN_KHALTA_PIXEL_ID}') {
                if (window.fbq) fbq('trackSingle', '${ARABIAN_KHALTA_PIXEL_ID}', 'AddToCart', { value: price, currency: 'BDT' });
              } else if (useHerbolin) {
                if (window.fbq) fbq('trackSingle', '1433976858485362', 'AddToCart', { value: price, currency: 'BDT' });
              } else {
                if (window.fbq) fbq('track', 'AddToCart', { value: price, currency: 'BDT' });
              }
            }`,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
        {/* Bootstrap Bundle JS (includes Popper) */}
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
      </body>
    </Html>
  );
}

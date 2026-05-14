import NextDocument, { DocumentContext, DocumentInitialProps, Head, Html, Main, NextScript } from 'next/document';

const MAIN_TRUSTCART_GTM_ID = 'GTM-TSC7TFV6';
const HERBOLIN_GTM_ID = 'GTM-PK5G5DWZ';
const ARABIAN_KHALTA_GTM_ID = 'GTM-KVLD23CH';
const ARABIAN_KHALTA_PIXEL_ID = '2270570453772206';

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
    __landingPagePixelsInitialized?: Record<string, boolean>;
    __arabianKhaltaPixelPageViewTracked?: boolean;
  }
}

interface TrustCartDocumentProps extends DocumentInitialProps {
  isArabianKhaltaSurface: boolean;
}

function isArabianKhaltaDocumentSurface(ctx: DocumentContext) {
  const host = String(ctx.req?.headers.host || '').split(':')[0].toLowerCase();
  const rawPath = ctx.asPath || ctx.pathname || '';
  const [pathnamePart, queryPart = ''] = rawPath.split('?');
  const pathname = pathnamePart.replace(/\/$/, '') || '/';
  const params = new URLSearchParams(queryPart);
  const routeSlug = pathname.indexOf('/lp/') === 0 ? pathname.split('/').filter(Boolean).pop() : null;
  const querySlug = params.get('landing_page') || params.get('landing_page_intl') || params.get('cartflows_step');

  return (
    host === 'arabiankhalta.com' ||
    host === 'www.arabiankhalta.com' ||
    pathname === '/arabiankhalta' ||
    routeSlug === 'arabiankhalta' ||
    querySlug === 'arabiankhalta'
  );
}

export default function Document({ isArabianKhaltaSurface }: TrustCartDocumentProps) {
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
        {/* Arabian Khalta must only initialize its own Meta pixel, even from GTM/cached scripts. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w){
              var ARABIAN_KHALTA_PIXEL_ID='${ARABIAN_KHALTA_PIXEL_ID}';
              function isArabianKhaltaSurface(){
                var h=w.location.hostname;
                var p=w.location.pathname.replace(/\\/$/,'')||'/';
                var params=new URLSearchParams(w.location.search);
                var routeSlug=p.indexOf('/lp/')===0?p.split('/').filter(Boolean).pop():null;
                var querySlug=params.get('landing_page')||params.get('landing_page_intl')||params.get('cartflows_step');
                return h==='arabiankhalta.com'||h==='www.arabiankhalta.com'||p==='/arabiankhalta'||routeSlug==='arabiankhalta'||querySlug==='arabiankhalta';
              }
              if(!isArabianKhaltaSurface())return;
              w.__allowedMetaPixelId=ARABIAN_KHALTA_PIXEL_ID;
              function shouldBlock(args){
                var a=Array.prototype.slice.call(args||[]);
                var command=a[0];
                var pixelId=null;
                if(command==='init')pixelId=a[1];
                if(command==='trackSingle'||command==='trackSingleCustom')pixelId=a[1];
                if(pixelId&&String(pixelId)!==ARABIAN_KHALTA_PIXEL_ID)return true;
                if(command==='track'&&a[1]==='PageView'&&w.__arabianKhaltaPixelPageViewTracked)return true;
                if((command==='trackSingle'||command==='trackSingleCustom')&&String(pixelId)===ARABIAN_KHALTA_PIXEL_ID&&a[2]==='PageView'&&w.__arabianKhaltaPixelPageViewTracked)return true;
                if(command==='init'&&String(pixelId)===ARABIAN_KHALTA_PIXEL_ID&&w.__landingPagePixelsInitialized&&w.__landingPagePixelsInitialized[ARABIAN_KHALTA_PIXEL_ID])return true;
                return false;
              }
              function markAllowed(args){
                var a=Array.prototype.slice.call(args||[]);
                var command=a[0];
                var pixelId=null;
                if(command==='init')pixelId=a[1];
                if(command==='trackSingle'||command==='trackSingleCustom')pixelId=a[1];
                if(command==='init'&&String(pixelId)===ARABIAN_KHALTA_PIXEL_ID){
                  w.__landingPagePixelsInitialized=w.__landingPagePixelsInitialized||{};
                  w.__landingPagePixelsInitialized[ARABIAN_KHALTA_PIXEL_ID]=true;
                }
                if(command==='track'&&a[1]==='PageView')w.__arabianKhaltaPixelPageViewTracked=true;
                if((command==='trackSingle'||command==='trackSingleCustom')&&String(pixelId)===ARABIAN_KHALTA_PIXEL_ID&&a[2]==='PageView')w.__arabianKhaltaPixelPageViewTracked=true;
              }
              function shouldBlockSrc(src){
                if(!src||src.indexOf('facebook.com/tr')===-1)return false;
                var match=src.match(/[?&]id=([^&]+)/);
                if(!match)return false;
                var pixelId=decodeURIComponent(match[1]);
                if(pixelId!==ARABIAN_KHALTA_PIXEL_ID)return true;
                return false;
              }
              function shouldBlockNode(node){
                var src='';
                try{src=node&&(node.src||(node.getAttribute&&node.getAttribute('src')))||'';}catch(e){}
                return shouldBlockSrc(src);
              }
              function wrapFbq(fn){
                if(!fn||fn.__tcArabianPixelGuard)return fn;
                var guarded=function(){
                  if(shouldBlock(arguments))return;
                  var result=fn.apply(this,arguments);
                  markAllowed(arguments);
                  return result;
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
              try{
                var appendChild=Node.prototype.appendChild;
                var insertBefore=Node.prototype.insertBefore;
                Node.prototype.appendChild=function(node){
                  if(shouldBlockNode(node))return node;
                  return appendChild.apply(this,arguments);
                };
                Node.prototype.insertBefore=function(node,ref){
                  if(shouldBlockNode(node))return node;
                  return insertBefore.apply(this,arguments);
                };
              }catch(e){}
              try{
                var setAttribute=Element.prototype.setAttribute;
                Element.prototype.setAttribute=function(name,value){
                  if(String(name).toLowerCase()==='src'&&shouldBlockSrc(String(value||'')))return;
                  return setAttribute.apply(this,arguments);
                };
              }catch(e){}
              try{
                var srcDescriptor=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
                if(srcDescriptor&&srcDescriptor.set&&srcDescriptor.get){
                  Object.defineProperty(HTMLImageElement.prototype,'src',{
                    configurable:true,
                    get:function(){return srcDescriptor.get.call(this);},
                    set:function(value){
                      if(shouldBlockSrc(String(value||'')))return;
                      return srcDescriptor.set.call(this,value);
                    }
                  });
                }
              }catch(e){}
              try{
                var sendBeacon=navigator.sendBeacon&&navigator.sendBeacon.bind(navigator);
                if(sendBeacon){
                  navigator.sendBeacon=function(url,data){
                    if(shouldBlockSrc(String(url||'')))return true;
                    return sendBeacon(url,data);
                  };
                }
              }catch(e){}
              try{
                var fetchFn=w.fetch&&w.fetch.bind(w);
                if(fetchFn){
                  w.fetch=function(input,init){
                    var url=typeof input==='string'?input:(input&&input.url)||'';
                    if(shouldBlockSrc(String(url||'')))return Promise.resolve(new Response(null,{status:204,statusText:'Blocked'}));
                    return fetchFn(input,init);
                  };
                }
              }catch(e){}
              try{
                var open=XMLHttpRequest.prototype.open;
                XMLHttpRequest.prototype.open=function(method,url){
                  var args=Array.prototype.slice.call(arguments);
                  this.__tcBlockedFacebookPixel=shouldBlockSrc(String(url||''));
                  if(this.__tcBlockedFacebookPixel)args[1]='about:blank';
                  return open.apply(this,args);
                };
                var send=XMLHttpRequest.prototype.send;
                XMLHttpRequest.prototype.send=function(){
                  if(this.__tcBlockedFacebookPixel)return;
                  return send.apply(this,arguments);
                };
              }catch(e){}
            })(window);`,
          }}
        />
        {/* Google Tag Manager - Arabian Khalta only */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){
              var h=w.location.hostname;
              var p=w.location.pathname.replace(/\\/$/,'')||'/';
              var params=new URLSearchParams(w.location.search);
              var routeSlug=p.indexOf('/lp/')===0?p.split('/').filter(Boolean).pop():null;
              var querySlug=params.get('landing_page')||params.get('landing_page_intl')||params.get('cartflows_step');
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
                  var routeSlug=pathname.indexOf('/lp/')===0?pathname.split('/').filter(Boolean).pop():null;
                  var querySlug=params.get('landing_page')||params.get('landing_page_intl')||params.get('cartflows_step');
                  var isArabianKhaltaSurface=hostname==='arabiankhalta.com'||hostname==='www.arabiankhalta.com'||pathname==='/arabiankhalta'||routeSlug==='arabiankhalta'||querySlug==='arabiankhalta';
                  if(isArabianKhaltaSurface)return;
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
        {/* Meta (Facebook) Pixel */}
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              (function(w){
                var h=w.location.hostname;
                var p=w.location.pathname.replace(/\\/$/,'')||'/';
                var params=new URLSearchParams(w.location.search);
                var routeSlug=p.indexOf('/lp/')===0?p.split('/').filter(Boolean).pop():null;
                var querySlug=params.get('landing_page')||params.get('landing_page_intl')||params.get('cartflows_step');
                var isArabianKhaltaSurface=h==='arabiankhalta.com'||h==='www.arabiankhalta.com'||p==='/arabiankhalta'||routeSlug==='arabiankhalta'||querySlug==='arabiankhalta';
                if(!isArabianKhaltaSurface)return;
                fbq('init', '${ARABIAN_KHALTA_PIXEL_ID}');
                fbq('track', 'PageView');
                w.__landingPagePixelsInitialized = w.__landingPagePixelsInitialized || {};
                w.__landingPagePixelsInitialized['${ARABIAN_KHALTA_PIXEL_ID}'] = true;
                w.__arabianKhaltaPixelPageViewTracked = true;
              })(window);`,
          }}
        />
        {/* End Meta Pixel */}
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
              if (useArabianKhalta) {
                if (window.fbq) fbq('trackSingle', '${ARABIAN_KHALTA_PIXEL_ID}', 'AddToCart', { value: price, currency: 'BDT' });
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
  };
};

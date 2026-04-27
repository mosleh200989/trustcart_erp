import { Html, Head, Main, NextScript } from 'next/document';

const MAIN_TRUSTCART_GTM_ID = 'GTM-TSC7TFV6';
const HERBOLIN_GTM_ID = 'GTM-PK5G5DWZ';

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
        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,mainId,herbolinId){var hostname=w.location.hostname;
              var containerId=(hostname==='herbolin.com'||hostname==='www.herbolin.com')?herbolinId:mainId;
              w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+containerId+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${MAIN_TRUSTCART_GTM_ID}','${HERBOLIN_GTM_ID}');`,
          }}
        />
        {/* End Google Tag Manager */}
        {/* Microsoft Clarity */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "ve56op0b59");`,
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

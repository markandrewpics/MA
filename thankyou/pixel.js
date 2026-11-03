/* Existing Meta dataset: page visits only. Form submissions and bookings are separate events. */
(function () {
  'use strict';
  if (!['www.markandrewboudoir.com', 'markandrewboudoir.com'].includes(window.location.hostname)) return;
  if (navigator.globalPrivacyControl === true || navigator.doNotTrack === '1') return;
  if (window.__maThankyouPixelLoaded) return;
  window.__maThankyouPixelLoaded = true;

  !function(f,b,e,v,n,t,s) {
    if(f.fbq) return;
    n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq) f._fbq=n;
    n.push=n;n.loaded=true;n.version='2.0';n.queue=[];
    t=b.createElement(e);t.async=true;t.src=v;
    s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s);
  }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');

  window.fbq.disablePushState = true;
  window.fbq('set', 'autoConfig', false, '393023827821170');
  window.fbq('init', '393023827821170');
  window.fbq('trackSingle', '393023827821170', 'PageView');
})();

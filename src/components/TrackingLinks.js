'use client';

export function PhoneLink({ href, children, style }) {
  function handleClick() {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'click_to_call', {
        event_category: 'conversion',
        event_label: href,
      });
    }
  }
  return (
    <a href={href} onClick={handleClick} style={style}>
      {children}
    </a>
  );
}

export function OutboundLink({ href, children, style, ...props }) {
  function handleClick() {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'outbound_click', {
        event_category: 'engagement',
        event_label: href,
      });
    }
  }
  return (
    <a href={href} onClick={handleClick} style={style} {...props}>
      {children}
    </a>
  );
}

"use client";
import { useEffect, useRef } from "react";

/**
 * Google AdSense manual ad unit.
 * Renders nothing if client or slot is empty — safe no-op until live.
 */
export default function AdUnit({ client, slot, style }) {
  const pushed = useRef(false);

  useEffect(() => {
    if (!client || !slot || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch (e) {}
  }, [client, slot]);

  if (!client || !slot) return null;

  return (
    <div style={{ textAlign: "center", overflow: "hidden", ...style }}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}

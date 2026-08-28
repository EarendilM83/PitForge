import React from 'react';

/* Clean line-icon set (Atlassian-flavoured, 24px grid, currentColor stroke).
   No emojis anywhere on the marketing/docs surfaces. */

const P: Record<string, React.ReactNode> = {
  target: (<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" /></>),
  rocket: (<><path d="M5 15c-1.5 1-2 4-2 4s3-.5 4-2" /><path d="M13.5 6.5C16 4 20 4 20 4s0 4-2.5 6.5L14 14l-4-4 3.5-3.5Z" /><path d="M10 10l-4 1 3 3 1-4" /><circle cx="15" cy="9" r="1" /></>),
  megaphone: (<><path d="M4 10v4a1 1 0 0 0 1 1h2l3 4V5L7 9H5a1 1 0 0 0-1 1Z" /><path d="M14 7c2 1 3 3 3 5s-1 4-3 5" /><path d="M18 4c3 2 4 5 4 8s-1 6-4 8" /></>),
  search: (<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>),
  pen: (<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></>),
  spark: (<><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="M19 15l.7 2 .3.7-2-.7 2 .7" /></>),
  shield: (<><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" /><path d="m9 12 2 2 4-4" /></>),
  cursor: (<><path d="M5 4l5 15 2.2-6.2L18 10.5 5 4Z" /></>),
  box: (<><path d="M21 8 12 3 3 8l9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></>),
  globe: (<><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>),
  devices: (<><rect x="2.5" y="5" width="13" height="10" rx="1.5" /><path d="M2.5 18h11" /><rect x="17" y="9" width="5" height="10" rx="1.2" /></>),
  bolt: (<><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" /></>),
  layers: (<><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></>),
  check: (<><path d="m5 12 5 5L20 6" /></>),
  arrow: (<><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>),
  gauge: (<><path d="M4 18a8 8 0 1 1 16 0" /><path d="M12 18l4-5" /><circle cx="12" cy="18" r="1.3" /></>),
  info: (<><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></>),
  warn: (<><path d="M12 4 2.5 20h19L12 4Z" /><path d="M12 10v4" /><path d="M12 17h.01" /></>),
  book: (<><path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4Z" /><path d="M18 20a2 2 0 0 1 2-2V4" /><path d="M5 16h13" /></>),
  terminal: (<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m7 9 3 3-3 3" /><path d="M13 15h4" /></>),
  folder: (<><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></>),
  compass: (<><circle cx="12" cy="12" r="9" /><path d="m15 9-2 4-4 2 2-4 4-2Z" /></>),
  wrench: (<><path d="M15 4a5 5 0 0 0-5.9 6.3L4 15.4 8.6 20l5.1-5.1A5 5 0 0 0 20 9l-2.8 2.8-2-2L18 7a5 5 0 0 0-3-3Z" /></>),
  tag: (<><path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9Z" /><circle cx="8" cy="8" r="1.4" /></>),
};

export default function Icon({ name, size = 22, stroke = 1.8, className }: { name: keyof typeof P | string; size?: number; stroke?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {P[name] ?? P.spark}
    </svg>
  );
}

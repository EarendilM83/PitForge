import React from 'react';
import './coach.css';

/** Zippy — a little anime hummingbird guide. Pure SVG with sprite-style
    flapping wings (a 3-frame flip-book), a hover bob, blinks and sparkles. */
export default function Hummingbird({ size = 96, mood = 'happy' }: { size?: number; mood?: 'happy' | 'wave' | 'point' }) {
  return (
    <svg className={`hb hb--${mood}`} width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <linearGradient id="hbBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3ff0d0" />
          <stop offset="0.5" stopColor="#2aa9e6" />
          <stop offset="1" stopColor="#6b5cff" />
        </linearGradient>
        <linearGradient id="hbThroat" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff4d9d" />
          <stop offset="1" stopColor="#ff9ec6" />
        </linearGradient>
        <radialGradient id="hbWing" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0" stopColor="#dffbff" />
          <stop offset="1" stopColor="#8fe6ff" />
        </radialGradient>
      </defs>

      {/* sparkles */}
      <g className="hb-sparks" fill="#ffe27a">
        <path className="hb-spark s1" d="M22 30 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6-4 -4-1.6 4-1.6 Z" />
        <path className="hb-spark s2" d="M98 58 l1.2 3 3 1.2 -3 1.2 -1.2 3 -1.2-3 -3-1.2 3-1.2 Z" />
        <path className="hb-spark s3" d="M30 80 l1 2.6 2.6 1 -2.6 1 -1 2.6 -1-2.6 -2.6-1 2.6-1 Z" />
      </g>

      <g className="hb-body">
        {/* tail */}
        <path className="hb-tail" d="M58 86 L48 116 L60 106 L72 116 Z" fill="#2a86c8" />

        {/* wings — behind body, 3-frame sprite flap each side */}
        <g className="hb-wing hb-wing-l" fill="url(#hbWing)">
          <ellipse className="wf wf1" cx="30" cy="42" rx="22" ry="9" transform="rotate(-58 50 54)" />
          <ellipse className="wf wf2" cx="28" cy="46" rx="22" ry="9" transform="rotate(-24 50 54)" />
          <ellipse className="wf wf3" cx="30" cy="52" rx="21" ry="8" transform="rotate(10 50 54)" />
        </g>
        <g className="hb-wing hb-wing-r" fill="url(#hbWing)">
          <ellipse className="wf wf1" cx="90" cy="42" rx="22" ry="9" transform="rotate(58 70 54)" />
          <ellipse className="wf wf2" cx="92" cy="46" rx="22" ry="9" transform="rotate(24 70 54)" />
          <ellipse className="wf wf3" cx="90" cy="52" rx="21" ry="8" transform="rotate(-10 70 54)" />
        </g>

        {/* body + belly */}
        <ellipse cx="60" cy="70" rx="17" ry="23" fill="url(#hbBody)" />
        <ellipse cx="55" cy="74" rx="10" ry="16" fill="#eafff9" opacity="0.92" />

        {/* head */}
        <circle cx="63" cy="45" r="16" fill="url(#hbBody)" />
        {/* iridescent throat / gorget */}
        <ellipse cx="63" cy="54" rx="9" ry="7" fill="url(#hbThroat)" />

        {/* beak */}
        <path d="M77 46 L110 44 L77 50 Z" fill="#241d33" />

        {/* eye */}
        <ellipse className="hb-eye" cx="66" cy="43" rx="5.4" ry="6.4" fill="#141020" />
        <circle cx="67.6" cy="40.6" r="1.9" fill="#fff" />
        <circle cx="64.6" cy="44.4" r="1.1" fill="#fff" opacity="0.85" />
        {/* blush */}
        <ellipse cx="58" cy="50" rx="3.2" ry="1.8" fill="#ff9ecf" opacity="0.7" />
        {/* little head tuft */}
        <path d="M58 31 q4 -8 8 -1" stroke="#2aa9e6" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}

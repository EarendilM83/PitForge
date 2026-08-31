import React from 'react';
import { PFText, PFImage, PFRepeat, PFButton } from '../../../src/runtime/components';
import './FeatureLive.css';

// FeatureLive — Figma node 7372:4445 (desktop) / 7240:2947 (mobile).
// Image-left 3D product render, text-right accordion-style feature list.
// Two-tone <h2> (white line + gold line). Mobile stacks: text then image.
export default function FeatureLive() {
  return (
    <section className="fl">
      <div className="fl-inner">
        <div className="fl-media">
          <PFImage field="live.image" className="fl-image" sizes="(max-width: 768px) 90vw, 45vw" />
        </div>
        <div className="fl-body">
          <div className="fl-head">
            <span className="fl-eyebrow">
              <PFText field="live.eyebrow" />
            </span>
            <h2 className="fl-title">
              <PFText field="live.titleTop" className="fl-title-top" />{' '}
              <PFText field="live.titleAccent" className="fl-title-accent" />
            </h2>
          </div>
          <div className="fl-list">
            <PFRepeat field="live.items" className="fl-items">
              {(item, index) => (
                <div className={index === 0 ? 'fl-item fl-item--open' : 'fl-item'}>
                  <div className="fl-item-head">
                    <h3 className="fl-item-title"><PFText field={`${item}.title`} /></h3>
                  </div>
                  <PFText field={`${item}.body`} className="fl-item-body" />
                </div>
              )}
            </PFRepeat>
          </div>
          <PFButton field="live.cta" className="fl-cta" variant="primary" />
        </div>
      </div>
    </section>
  );
}

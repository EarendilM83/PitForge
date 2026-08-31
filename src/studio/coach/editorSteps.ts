import type { Step } from './CoachTour';

/* Zippy's tour of the EDITOR, written for a marketing teammate — no code words.
   Uses the live Dogecoin Casino page on screen as the running example. Targets are
   stable class hooks in the builder shell (top bar, layers, canvas, inspector). */
export const EDITOR_STEPS: Step[] = [
  {
    title: 'You’re inside your site',
    text: 'This is your Dogecoin Casino page — the real thing visitors see. I’ll show you around. Nothing you touch here can break it, so relax and explore.',
  },
  {
    target: '.pro-rail',
    title: 'Every section, listed',
    text: 'Layers. Your whole page — the top menu, the hero, the game tiles, the FAQ, the footer — is right here. Click one to jump straight to it.',
  },
  {
    target: '.studio-el-main',
    title: 'Your live page',
    text: 'This is the page itself. To change anything — a headline, a button, a picture — just click it right here on the page. What you see is what visitors get.',
  },
  {
    target: '.pro-insp',
    title: 'The edit panel',
    text: 'When you pick something, its controls open here in three tabs: Content (the words & images), Style (safe look tweaks), and Settings (what it means for Google).',
  },
  {
    target: '.pro-lang',
    title: 'Speak every language',
    text: 'English is your original. Add a language, then type the translation for each piece — the site keeps the layout and just swaps the words.',
  },
  {
    target: '.pro-tb-center .pro-seg',
    title: 'Phone, tablet, desktop',
    text: 'Flip between screen sizes to check your page looks perfect everywhere. This is the true published layout — not a squished guess.',
  },
  {
    target: '.pro-mode',
    title: 'Safe by default',
    text: 'Marketer mode keeps every edit on-brand and unbreakable. If a designer ever needs full control, Builder mode unlocks the raw settings.',
  },
  {
    target: "[title^='Test & QA']",
    title: 'I’ll check it for you',
    text: 'Test & QA. One click and I inspect every section at every screen size — like a QA teammate — and flag anything that looks off before it goes live.',
  },
  {
    target: '.pro-tb-right .pro-btn.primary',
    title: 'Ship it',
    text: 'When it’s ready: Preview to see it live, Export to download it, or Publish to put it online. That’s the whole loop — now go make it shine!',
  },
];

import React from 'react';
import MarketingNav from './MarketingNav';
import Icon from './Icon';
import './marketing.css';

/* Beginner-friendly setup — written for marketers who have never used a terminal.
   A clean, readable walkthrough: each step explains what it does, what you'll see,
   and how to do it. */

interface Step {
  id: string;
  title: string;
  body?: React.ReactNode;
  cmd?: string;
  does?: React.ReactNode;
  see?: React.ReactNode;
  tip?: React.ReactNode;
  link?: { href: string; label: string };
}
interface Part {
  name: string;
  sub: string;
  intro?: React.ReactNode;
  steps: Step[];
}

const PARTS: Part[] = [
  {
    name: 'Part 1 — Install the tools',
    sub: 'Three quick installs. You do this once.',
    steps: [
      {
        id: 'node',
        title: 'Install Node.js',
        body: <>Node.js is the engine PitForge runs on. You install it once and never think about it again.</>,
        link: { href: 'https://nodejs.org', label: 'nodejs.org' },
        does: <>Download the button labelled <b>LTS</b>, open the file, and click <b>Continue / Next</b> until it finishes.</>,
        see: <>Nothing dramatic — it installs quietly. That’s normal.</>,
      },
      {
        id: 'figma-app',
        title: 'Install the Figma desktop app',
        body: <>Claude reads your designs straight from Figma, so it needs the <b>desktop app</b> — not just the website.</>,
        link: { href: 'https://www.figma.com/downloads/', label: 'figma.com/downloads' },
        does: <>Download, install, and sign in with your Figma account.</>,
      },
      {
        id: 'figma-mcp',
        title: 'Turn on Figma’s design connector',
        body: (
          <>
            This is the bridge that lets Claude <b>see your Figma files</b>. In the Figma desktop app, open the
            menu (top-left) → <b>Preferences</b> → tick <b>“Enable Dev Mode MCP Server.”</b>
          </>
        ),
        tip: <><b>What’s MCP?</b> It’s just a secure connection between Claude and another app. You don’t need to understand it — flip it on, and keep Figma open while you build.</>,
        see: <>Figma shows a small confirmation that the server is running.</>,
      },
    ],
  },
  {
    name: 'Part 2 — Get Claude ready',
    sub: 'This is where you meet the Terminal. Don’t worry — you’ll only paste a few lines.',
    intro: (
      <>
        <b>Meet the Terminal.</b> It’s a plain window where you type one line and press <b>Enter</b>. You’ll only ever
        paste commands we give you. To open it:
        <ul>
          <li><b>Mac:</b> press <kbd>⌘</kbd> <kbd>Space</kbd>, type <b>Terminal</b>, press Enter.</li>
          <li><b>Windows:</b> click <b>Start</b>, type <b>PowerShell</b>, press Enter.</li>
        </ul>
        To paste a command: <b>⌘V</b> (Mac) or <b>right-click</b> (Windows), then press <b>Enter</b>.
      </>
    ),
    steps: [
      {
        id: 'open-terminal',
        title: 'Open the Terminal',
        body: <>Open it using the instructions just above. Leave the window open — you’ll use it for the next few steps.</>,
      },
      {
        id: 'install-claude',
        title: 'Install Claude Code',
        body: <>Paste this line into the Terminal and press Enter.</>,
        cmd: 'npm install -g @anthropic-ai/claude-code',
        does: <>Downloads Claude Code — the assistant that builds your sites.</>,
        see: <>Lots of text scrolls by, then stops. That means it worked.</>,
      },
      {
        id: 'signin',
        title: 'Sign in to Claude',
        body: <>Type this and press Enter, then follow the sign-in page that opens.</>,
        cmd: 'claude',
        does: <>Signs you in with your normal Claude subscription — no credit card, no API keys.</>,
        see: <>A web page opens to log in. Approve it, then come back to the Terminal.</>,
      },
    ],
  },
  {
    name: 'Part 3 — Open your PitForge folder',
    sub: 'Point the Terminal at PitForge, then install its parts.',
    steps: [
      {
        id: 'folder',
        title: 'Put the PitForge folder somewhere easy',
        body: <>You were given a <b>PitForge</b> folder. Move it to your <b>Desktop</b> so it’s easy to find.</>,
      },
      {
        id: 'cd',
        title: 'Point the Terminal at that folder',
        body: (
          <>
            Type <b>cd</b> and a space, then <b>drag the PitForge folder onto the Terminal window</b> — it fills in the
            location for you. Press Enter.
          </>
        ),
        cmd: 'cd ',
        tip: <><b>cd</b> just means “change to this folder.” Dragging the folder saves you from typing the whole path.</>,
      },
      {
        id: 'npm-install',
        title: 'Install PitForge’s parts',
        body: <>Paste this and press Enter. You only do this once.</>,
        cmd: 'npm install',
        does: <>Downloads the pieces PitForge needs to run.</>,
        see: <>Text scrolls, then stops.</>,
      },
    ],
  },
  {
    name: 'Part 4 — Build your first page',
    sub: 'Start PitForge and let Claude build.',
    steps: [
      {
        id: 'start',
        title: 'Start PitForge',
        body: <>Paste this and press Enter. Then open your web browser to the address below.</>,
        cmd: 'npm run dev',
        does: <>Starts PitForge and keeps it running. <b>Leave this Terminal window open.</b></>,
        see: <>Open your browser to <b>localhost:4321</b> — that’s your Studio.</>,
      },
      {
        id: 'figma-connect',
        title: 'Let Claude connect to Figma',
        body: (
          <>
            The PitForge folder already knows where Figma is. The first time you build, Claude may ask permission to
            connect to Figma — say <b>yes</b>. To double-check, type <b>/mcp</b> in Claude and look for <b>“figma”</b>.
          </>
        ),
        tip: <>Keep the Figma desktop app open while you build, so Claude can read the design.</>,
      },
      {
        id: 'first-site',
        title: 'Create your first site',
        body: (
          <>
            In the Studio, click <b>New site</b>, paste your Figma link, and copy the instruction it gives you into
            Claude. Claude builds the page — watch it appear in your Sites list.
          </>
        ),
      },
    ],
  },
];

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = React.useState(false);
  return (
    <button
      className={`pf-setup-copy ${ok ? 'ok' : ''}`}
      onClick={() => { navigator.clipboard?.writeText(text.trim()); setOk(true); setTimeout(() => setOk(false), 1400); }}
    >
      <Icon name={ok ? 'check' : 'box'} size={13} stroke={2.2} /> {ok ? 'Copied' : 'Copy'}
    </button>
  );
}

export default function Setup({
  onCreateSite,
  onHome,
  onGuide,
  onStudio,
}: {
  onCreateSite: () => void;
  onHome: () => void;
  onGuide: () => void;
  onStudio: () => void;
}) {
  let n = 0;
  return (
    <div className="pf-mkt">
      <MarketingNav active="setup" onHome={onHome} onGuide={onGuide} onSetup={() => {}} onStudio={onStudio} />

      <header className="pf-setup-head">
        <div className="pf-lp-mesh" />
        <div className="pf-lp-dots" />
        <div className="pf-mkt-inner">
          <span className="pf-lp-eyebrow"><span className="dot" /> Guided setup · no coding needed</span>
          <h1>Set up PitForge, step by step</h1>
          <p>Written for people who have never touched a terminal. Follow along — about 20 minutes, and you only do it once.</p>
        </div>
      </header>

      <div className="pf-setup-body">
        {PARTS.map((part) => (
          <section className="pf-setup-part" key={part.name}>
            <div className="pf-setup-part-h">
              <h2>{part.name}</h2>
              <p>{part.sub}</p>
            </div>
            {part.intro && (
              <div className="pf-setup-partintro">
                <span className="pf-setup-partintro-i"><Icon name="terminal" size={18} /></span>
                <div>{part.intro}</div>
              </div>
            )}
            {part.steps.map((s) => {
              n += 1;
              return (
                <div className="pf-setup-step" style={{ ['--i']: n } as React.CSSProperties} key={s.id}>
                  <span className="pf-setup-num">{n}</span>
                  <div className="pf-setup-step-main">
                    <h3>{s.title}</h3>
                    {s.body && <p>{s.body}</p>}
                    {s.link && (
                      <a className="pf-setup-linkbtn" href={s.link.href} target="_blank" rel="noopener noreferrer">
                        <Icon name="globe" size={15} /> {s.link.label} <Icon name="arrow" size={14} />
                      </a>
                    )}
                    {s.cmd && (
                      <div className="pf-setup-cmdrow">
                        <code className="pf-setup-cmd2">{s.cmd}</code>
                        <CopyBtn text={s.cmd} />
                      </div>
                    )}
                    {(s.does || s.see) && (
                      <div className="pf-setup-meta">
                        {s.does && <div className="pf-setup-metarow"><span className="lab">Does this</span><span>{s.does}</span></div>}
                        {s.see && <div className="pf-setup-metarow"><span className="lab see">You’ll see</span><span>{s.see}</span></div>}
                      </div>
                    )}
                    {s.tip && <div className="pf-setup-tip"><Icon name="info" size={15} /> <span>{s.tip}</span></div>}
                  </div>
                </div>
              );
            })}
          </section>
        ))}

        <div className="pf-setup-done-card">
          <h3>That’s it — you’re ready</h3>
          <p>Everything’s installed and connected. Create your first site and let Claude build it from your Figma design.</p>
          <button onClick={onCreateSite}>Create your first site</button>
        </div>
      </div>
    </div>
  );
}

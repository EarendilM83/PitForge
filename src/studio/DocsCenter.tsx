import React from 'react';
import { DOC_GROUPS } from './docsContent';
import Icon from './marketing/Icon';

/** The User Guide: a premium 3-column docs reader — searchable, collapsible grouped
    sidebar, a readable content column, and a live "On this page" outline. */
export default function DocsCenter() {
  const flat = React.useMemo(
    () => DOC_GROUPS.flatMap((g) => g.pages.map((p) => ({ page: p, group: g.group }))),
    []
  );
  const groupOf = React.useCallback((id: string) => flat.find((f) => f.page.id === id)?.group ?? DOC_GROUPS[0].group, [flat]);

  const [active, setActive] = React.useState(flat[0].page.id);
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState<Set<string>>(() => new Set([DOC_GROUPS[0].group]));
  const [toc, setToc] = React.useState<{ id: string; text: string }[]>([]);
  const [activeH, setActiveH] = React.useState('');
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);

  const idx = flat.findIndex((f) => f.page.id === active);
  const current = flat[idx] ?? flat[0];
  const prev = idx > 0 ? flat[idx - 1] : null;
  const next = idx < flat.length - 1 ? flat[idx + 1] : null;

  // Build the "On this page" outline from the rendered headings + scrollspy.
  React.useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const hs = Array.from(el.querySelectorAll('h2'));
    hs.forEach((h, i) => { if (!h.id) h.id = `sec-${i}`; });
    setToc(hs.map((h) => ({ id: h.id, text: h.textContent || '' })));
    setActiveH(hs[0]?.id || '');
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) setActiveH((e.target as HTMLElement).id); }),
      { root: scrollRef.current, rootMargin: '0px 0px -72% 0px', threshold: 0 }
    );
    hs.forEach((h) => io.observe(h));
    return () => io.disconnect();
  }, [active]);

  // Press "/" to focus search; Esc to clear.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'Escape' && document.activeElement === searchRef.current) {
        setQuery('');
        searchRef.current?.blur();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const go = (id: string) => {
    setActive(id);
    setOpen((o) => new Set(o).add(groupOf(id)));
    scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  };
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const toggleGroup = (name: string) =>
    setOpen((o) => { const n = new Set(o); n.has(name) ? n.delete(name) : n.add(name); return n; });

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;
  const groups = searching
    ? DOC_GROUPS.map((g) => ({ ...g, pages: g.pages.filter((p) => (p.title + ' ' + p.blurb).toLowerCase().includes(q)) })).filter((g) => g.pages.length)
    : DOC_GROUPS;

  return (
    <div className="pf-doc">
      <aside className="pf-doc-nav" aria-label="User guide">
        <div className="pf-doc-search">
          <Icon name="search" size={15} />
          <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the guide" spellCheck={false} />
          {query ? <button className="pf-doc-search-x" onClick={() => setQuery('')} aria-label="Clear">×</button> : <kbd className="pf-doc-search-k">/</kbd>}
        </div>
        <div className="pf-doc-nav-scroll">
          {groups.map((g) => {
            const isOpen = searching || open.has(g.group);
            return (
              <div className="pf-doc-navgroup" key={g.group}>
                <button className={`pf-doc-navgroup-t ${isOpen ? 'open' : ''}`} onClick={() => toggleGroup(g.group)}>
                  <Icon name={g.icon} size={15} />
                  <span>{g.group}</span>
                  <Icon name="arrow" size={13} className="chev" />
                </button>
                {isOpen && g.pages.map((p) => (
                  <button key={p.id} className={`pf-doc-navitem ${p.id === active ? 'active' : ''}`} onClick={() => go(p.id)}>
                    {p.title}
                  </button>
                ))}
              </div>
            );
          })}
          {groups.length === 0 && <div className="pf-doc-empty">No pages match “{query}”.</div>}
        </div>
      </aside>

      <div className="pf-doc-scroll" ref={scrollRef}>
        <div className="pf-doc-main" key={current.page.id}>
          <div className="pf-doc-crumb"><Icon name="book" size={13} /> User Guide <span>/</span> {current.group}</div>
          <h1 className="pf-doc-title">{current.page.title}</h1>
          <p className="pf-doc-blurb">{current.page.blurb}</p>
          <article className="pf-doc-article" ref={contentRef}>{current.page.body}</article>

          <nav className="pf-doc-pager">
            {prev ? (
              <button className="pf-doc-pglink prev" onClick={() => go(prev.page.id)}>
                <span className="dir"><Icon name="arrow" size={15} className="flip" /> Previous</span>
                <span className="t">{prev.page.title}</span>
              </button>
            ) : <span />}
            {next ? (
              <button className="pf-doc-pglink next" onClick={() => go(next.page.id)}>
                <span className="dir">Next <Icon name="arrow" size={15} /></span>
                <span className="t">{next.page.title}</span>
              </button>
            ) : <span />}
          </nav>
        </div>
      </div>

      <aside className="pf-doc-toc">
        {toc.length > 0 && (
          <div className="pf-doc-toc-in">
            <div className="pf-doc-toc-t">On this page</div>
            {toc.map((h) => (
              <button key={h.id} className={activeH === h.id ? 'active' : ''} onClick={() => jump(h.id)}>{h.text}</button>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}

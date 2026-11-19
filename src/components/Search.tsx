import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IoSearch } from 'react-icons/io5';
import '../styles/search.css';

/**
 * Header search: trigger buttons (pill from 1024px, icon below) and a glass command palette.
 * Instant filtering over title, description, category and tags; ↑↓ to move, Enter to open,
 * Esc to close; Cmd/Ctrl+K opens it from anywhere. Styles: styles/search.css.
 */
interface SearchPost {
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  pubDate: string;
  /** YYYY.MM.DD in the site time zone. */
  date: string;
}

interface SearchProps {
  posts: SearchPost[];
}

const RECENT = 5;
const CLOSE_MS = 150;

const urlOf = (post: SearchPost) => `/post/${post.slug}/`;

/** Wraps case-insensitive matches of `query` in <mark>. */
function highlight(text: string, query: string): ReactNode {
  const q = query.trim();
  if (!q) return text;
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const parts: ReactNode[] = [];
  let from = 0;
  let at = lower.indexOf(needle);
  while (at !== -1) {
    if (at > from) parts.push(text.slice(from, at));
    parts.push(<mark key={at}>{text.slice(at, at + q.length)}</mark>);
    from = at + q.length;
    at = lower.indexOf(needle, from);
  }
  if (from < text.length) parts.push(text.slice(from));
  return parts;
}

/** Title matches first, then tags and category, then description. */
function rank(posts: SearchPost[], query: string): SearchPost[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const score = (p: SearchPost) => {
    if (p.title.toLowerCase().includes(q)) return 3;
    if (p.tags.some((t) => t.toLowerCase().includes(q)) || p.category.toLowerCase().includes(q)) return 2;
    if (p.description?.toLowerCase().includes(q)) return 1;
    return 0;
  };
  return posts
    .map((p) => ({ p, s: score(p) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((r) => r.p);
}

export default function Search({ posts }: SearchProps) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [shortcut, setShortcut] = useState('⌘K');
  const lastTrigger = useRef<HTMLElement | null>(null);
  const closeTimer = useRef(0);
  const isOpen = useRef(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    if (!/Mac|iPhone|iPad/.test(navigator.userAgent)) setShortcut('Ctrl K');
  }, []);

  const results = useMemo(() => rank(posts, query), [posts, query]);
  const items = query.trim() ? results : posts.slice(0, RECENT);

  const openSearch = useCallback(() => {
    // A close still finishing must not shut the palette that is opening now.
    window.clearTimeout(closeTimer.current);
    if (isOpen.current) {
      // Already open (e.g. Cmd/Ctrl+K again): keep where focus should return, refocus the field.
      setClosing(false);
      document.querySelector<HTMLInputElement>('.search-field input')?.focus();
      return;
    }
    isOpen.current = true;
    lastTrigger.current = document.activeElement as HTMLElement | null;
    setClosing(false);
    setOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    isOpen.current = false;
    setClosing(true);
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
      setQuery('');
      setActive(0);
      lastTrigger.current?.focus();
    }, CLOSE_MS);
  }, []);

  const go = useCallback(
    (post: SearchPost | undefined) => {
      if (!post) return;
      const url = urlOf(post);
      const swup = (window as unknown as { swup?: { navigate: (u: string) => void } }).swup;
      closeSearch();
      if (swup) swup.navigate(url);
      else window.location.href = url;
    },
    [closeSearch],
  );

  // Cmd/Ctrl + K opens search from anywhere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openSearch();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openSearch]);

  // Lock page scroll while open
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Keep the active option in range and in view
  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeSearch();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (items.length ? (i + 1) % items.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (items.length ? (i - 1 + items.length) % items.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(items[active]);
    }
  };

  const optionId = (i: number) => `search-option-${i}`;
  const hasQuery = query.trim().length > 0;

  const dialog =
    open && mounted
      ? createPortal(
          <div
            className={`search-scrim${closing ? ' closing' : ''}`}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeSearch();
            }}
          >
            <div className="search-panel" role="dialog" aria-modal="true" aria-label="搜尋文章" onKeyDown={onKeyDown}>
              <div className="search-field">
                <IoSearch className="h-5 w-5 shrink-0 text-fg-muted" aria-hidden="true" />
                <input
                  type="search"
                  placeholder="搜尋文章、分類或標籤…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  role="combobox"
                  aria-expanded={items.length > 0}
                  aria-controls="search-listbox"
                  aria-activedescendant={items.length ? optionId(active) : undefined}
                  aria-autocomplete="list"
                  autoComplete="off"
                  spellCheck={false}
                  autoFocus
                />
                <span className="search-kbd" aria-hidden="true">
                  esc
                </span>
                <button type="button" className="search-close" onClick={closeSearch}>
                  取消
                </button>
              </div>

              <div className="search-body" ref={listRef}>
                {hasQuery && items.length === 0 ? (
                  <p className="search-empty">
                    找不到和「{query.trim()}」相關的文章，試試其他關鍵字。
                  </p>
                ) : (
                  <>
                    <p className="search-section" id="search-listbox-label">
                      {hasQuery ? `${items.length} 篇相關文章` : '最近文章'}
                    </p>
                    <div id="search-listbox" role="listbox" aria-labelledby="search-listbox-label">
                      {items.map((post, i) => (
                        <a
                          key={post.slug}
                          id={optionId(i)}
                          href={urlOf(post)}
                          role="option"
                          aria-selected={i === active}
                          className="search-option"
                          style={{ '--i': Math.min(i, 8) } as CSSProperties}
                          onMouseMove={() => i !== active && setActive(i)}
                          onClick={(e) => {
                            e.preventDefault();
                            go(post);
                          }}
                        >
                          <div className="search-option-title">{highlight(post.title, query)}</div>
                          <div className="search-option-meta">
                            {highlight(post.category, query)} · {post.date}
                            {post.tags.length > 0 && (
                              <> · {highlight(post.tags.slice(0, 3).map((t) => `#${t}`).join(' '), query)}</>
                            )}
                          </div>
                          {post.description && <div className="search-option-desc">{highlight(post.description, query)}</div>}
                        </a>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="search-foot" aria-hidden="true">
                <span>
                  <kbd className="search-kbd">↑</kbd>
                  <kbd className="search-kbd">↓</kbd>
                  選擇
                </span>
                <span>
                  <kbd className="search-kbd">↵</kbd>
                  開啟
                </span>
                <span>
                  <kbd className="search-kbd">esc</kbd>
                  關閉
                </span>
                <span className="count">共 {posts.length} 篇</span>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={openSearch}
        aria-label="搜尋文章"
        aria-haspopup="dialog"
        className="hidden lg:flex h-[34px] min-w-[200px] items-center gap-2 rounded-full bg-bg-muted px-3 text-sm text-fg-muted transition-colors duration-fast hover:text-fg"
      >
        <IoSearch className="h-3.5 w-3.5" aria-hidden="true" />
        <span>搜尋文章</span>
        <span className="ml-auto text-xs" aria-hidden="true">
          {shortcut}
        </span>
      </button>
      <button
        type="button"
        onClick={openSearch}
        aria-label="搜尋文章"
        aria-haspopup="dialog"
        className="flex lg:hidden h-11 w-11 items-center justify-center rounded-full text-fg transition-colors duration-fast hover:bg-bg-muted"
      >
        <IoSearch className="h-[18px] w-[18px]" aria-hidden="true" />
      </button>
      {dialog}
    </>
  );
}

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { IoSearch, IoClose } from 'react-icons/io5';

interface SearchPost {
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  pubDate: string;
  content?: string;
}

interface SearchProps {
  posts: SearchPost[];
  /** v2 header: pill button from 1024px, icon button below (docs/redesign/02-layout.md §4). */
  trigger?: 'legacy' | 'responsive';
}

export default function Search({ posts, trigger = 'legacy' }: SearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const lastTrigger = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const searchPosts = useCallback((searchQuery: string): SearchPost[] => {
    if (!searchQuery.trim()) return [];
    
    const lowerQuery = searchQuery.toLowerCase();
    
    return posts.filter(post => {
      const titleMatch = post.title.toLowerCase().includes(lowerQuery);
      const descriptionMatch = post.description?.toLowerCase().includes(lowerQuery);
      const categoryMatch = post.category.toLowerCase().includes(lowerQuery);
      const tagsMatch = post.tags.some(tag => tag.toLowerCase().includes(lowerQuery));
      
      return titleMatch || descriptionMatch || categoryMatch || tagsMatch;
    });
  }, [posts]);

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query) {
        setIsLoading(true);
        const searchResults = searchPosts(query);
        setResults(searchResults);
        setIsLoading(false);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, searchPosts]);

  // Handle ESC key to close search
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeSearch();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const openSearch = () => {
    lastTrigger.current = document.activeElement as HTMLElement | null;
    setIsOpen(true);
  };

  const closeSearch = () => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    lastTrigger.current?.focus();
  };

  // Cmd/Ctrl + K opens search
  useEffect(() => {
    if (trigger !== 'responsive') return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openSearch();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [trigger]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const searchModal = isOpen && mounted ? createPortal(
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm">
          <div className="flex items-start justify-center min-h-screen pt-8 pb-8 px-4">
            <div className="w-full max-w-3xl h-[80vh] bg-white dark:bg-gray-900 rounded-lg shadow-xl border dark:border-gray-700 flex flex-col">
              {/* Search input */}
              <div className="flex items-center px-4 py-3 border-b dark:border-gray-700">
                <IoSearch className="w-5 h-5 text-gray-400 mr-3" />
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 border-none outline-none text-lg"
                  autoFocus
                />
                <button
                  onClick={closeSearch}
                  className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <IoClose className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Search results */}
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600 dark:text-gray-400">Searching...</span>
                  </div>
                ) : query && results.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No related articles found
                  </div>
                ) : query && results.length > 0 ? (
                  <div className="py-2">
                    <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                      Found {results.length} related articles
                    </div>
                    {results.map((post) => (
                      <a
                        key={post.slug}
                        href={`/post/${post.slug}/`}
                        className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b last:border-b-0 dark:border-gray-700"
                        onClick={closeSearch}
                      >
                        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                          {post.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                          {post.description}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
                          <span>{formatDate(post.pubDate)}</span>
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                            {post.category}
                          </span>
                          {post.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </a>
                    ))}
                  </div>
                ) : !query ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    Enter keywords to start searching
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>,
    document.body
  ) : null;

  if (trigger === 'responsive') {
    return (
      <>
        <button
          type="button"
          onClick={openSearch}
          aria-label="搜尋文章"
          className="hidden lg:flex h-[34px] min-w-[200px] items-center gap-2 rounded-full bg-bg-muted px-3 text-sm text-fg-muted transition-colors duration-fast hover:text-fg"
        >
          <IoSearch className="h-3.5 w-3.5" aria-hidden="true" />
          <span>搜尋文章</span>
          <span className="ml-auto text-[11px]" aria-hidden="true">⌘K</span>
        </button>
        <button
          type="button"
          onClick={openSearch}
          aria-label="搜尋文章"
          className="flex lg:hidden h-11 w-11 items-center justify-center rounded-full text-fg transition-colors duration-fast hover:bg-bg-muted"
        >
          <IoSearch className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
        {searchModal}
      </>
    );
  }

  return (
    <>
      {/* Search button */}
      <button
        onClick={openSearch}
        aria-label="Search"
        className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100/60 dark:hover:bg-gray-800/60 transition-all duration-200 active:scale-95"
      >
        <IoSearch className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      </button>

      {/* Search modal rendered through Portal */}
      {searchModal}
    </>
  );
}
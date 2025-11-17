'use client';

import { useState, useEffect, useRef } from 'react';

interface SearchInputProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

const placeholderExamples = [
  'Bitcoin hits $100k by end of year',
  'Trump wins 2024 election',
  'Lakers win NBA championship',
  'AI achieves AGI by 2025',
  'Tesla stock reaches $500',
];

export default function SearchInput({
  onSearch,
  isLoading = false,
}: SearchInputProps) {
  const [query, setQuery] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [displayPlaceholder, setDisplayPlaceholder] = useState(
    placeholderExamples[0]
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Smooth fade transition for placeholder
    const fadeInTimeout = setTimeout(() => {
      const currentPlaceholder = placeholderExamples[placeholderIndex];
      setDisplayPlaceholder(currentPlaceholder);
    }, 0);

    return () => clearTimeout(fadeInTimeout);
  }, [placeholderIndex]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholderExamples.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    onSearch(query);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full flex flex-col items-center gap-6"
    >
      <div className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={displayPlaceholder}
          disabled={isLoading}
          className="w-full h-16 md:h-20 px-4 text-lg md:text-xl rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder:text-slate-400 placeholder:text-center focus:outline-none focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 transition-all duration-300 font-semibold text-center"
        />
      </div>
      <button
        type="submit"
        disabled={isLoading || !query.trim()}
        className="w-full max-w-md mx-auto h-14 text-lg font-semibold bg-gradient-to-r from-green-500 to-red-500 hover:from-green-600 hover:to-red-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-green-500/50 flex items-center justify-center gap-2 animate-pulse disabled:animate-none"
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Analyzing...
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Search Markets
          </>
        )}
      </button>
      {isLoading && (
        <div className="flex items-center justify-center gap-2 text-green-400 text-sm">
          <div className="flex gap-1">
            <div
              className="w-2 h-2 bg-green-400 rounded-full animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <div
              className="w-2 h-2 bg-green-400 rounded-full animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <div
              className="w-2 h-2 bg-red-400 rounded-full animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
          </div>
          <span className="font-semibold">AI analyzing your prediction...</span>
        </div>
      )}
    </form>
  );
}

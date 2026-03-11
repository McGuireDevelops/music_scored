import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTeacherSearch, type SearchResult, type SearchResultType } from "../hooks/useTeacherSearch";

const TYPE_LABELS: Record<SearchResultType, string> = {
  course: "Course",
  lesson: "Lesson",
  document: "Document",
  quiz: "Quiz",
  student: "Student",
};

export function TeacherSearch({ teacherId }: { teacherId: string | undefined }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { results } = useTeacherSearch(teacherId, query);
  const showDropdown = open && query.trim().length > 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (href: string) => {
    navigate(href);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  };

  const grouped = results.reduce<Record<SearchResultType, SearchResult[]>>(
    (acc, r) => {
      if (!acc[r.type]) acc[r.type] = [];
      acc[r.type].push(r);
      return acc;
    },
    {} as Record<SearchResultType, SearchResult[]>
  );

  const order: SearchResultType[] = ["course", "lesson", "document", "quiz", "student"];

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm">
        <svg
          className="h-4 w-4 shrink-0 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={inputRef}
          type="search"
          placeholder="Search courses, lessons, documents, quizzes, students…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (query.trim()) setOpen(true);
          }}
          className="min-w-[200px] flex-1 border-0 bg-transparent text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-0 sm:min-w-[280px]"
          aria-label="Search courses, lessons, documents, quizzes, students"
        />
      </div>

      {showDropdown && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[70vh] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
          role="listbox"
        >
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              No results for &quot;{query}&quot;
            </div>
          ) : (
            <div className="py-2">
              {order.map((type) => {
                const items = grouped[type];
                if (!items || items.length === 0) return null;
                return (
                  <div key={type} className="mb-2 last:mb-0">
                    <div className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">
                      {TYPE_LABELS[type]}
                    </div>
                    {items.map((r) => (
                      <Link
                        key={`${r.type}-${r.id}`}
                        to={r.href}
                        onClick={(e) => {
                          e.preventDefault();
                          handleSelect(r.href);
                        }}
                        className="flex flex-col gap-0.5 px-4 py-2.5 text-left transition-colors hover:bg-gray-50"
                        role="option"
                      >
                        <span className="font-medium text-gray-900">{r.title}</span>
                        {r.subtitle && (
                          <span className="text-xs text-gray-500">{r.subtitle}</span>
                        )}
                      </Link>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

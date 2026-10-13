"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import styles from "@/app/superadmin/layout.module.css";

interface ResultItem {
  id: string;
  label: string;
  meta?: string;
  href: string;
}

interface SearchResults {
  employees: ResultItem[];
  departments: ResultItem[];
  announcements: ResultItem[];
  projects: ResultItem[];
  tasks: ResultItem[];
  pages: ResultItem[];
}

const EMPTY_RESULTS: SearchResults = { employees: [], departments: [], announcements: [], projects: [], tasks: [], pages: [] };

const GROUPS: { key: keyof SearchResults; label: string }[] = [
  { key: "pages", label: "Pages" },
  { key: "employees", label: "Employees" },
  { key: "departments", label: "Departments" },
  { key: "announcements", label: "Announcements" },
  { key: "projects", label: "Projects" },
  { key: "tasks", label: "Tasks" },
];

// Live-searches employees, departments, announcements, projects, tasks, and
// site pages via `/api/superadmin/search` - debounced, with a dropdown of
// grouped, clickable results. Site-wide in the sense that every major
// record type and nav destination is included, not just one page's data.
export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(EMPTY_RESULTS);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(() => {
      fetch(`/api/superadmin/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data: SearchResults) => setResults(data))
        .catch(() => setResults(EMPTY_RESULTS))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  const totalResults = GROUPS.reduce((sum, g) => sum + results[g.key].length, 0);
  const showDropdown = open && query.trim().length >= 2;

  return (
    <div className={styles.search} ref={wrapRef} style={{ position: "relative" }}>
      <Search size={15} />
      <input
        type="text"
        placeholder="Search employees, departments, announcements, projects..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />

      {showDropdown && (
        <div className={styles.searchDropdown}>
          {loading && <div className={styles.searchEmpty}>Searching...</div>}
          {!loading && totalResults === 0 && (
            <div className={styles.searchEmpty}>No results for &quot;{query.trim()}&quot;.</div>
          )}
          {!loading &&
            GROUPS.map((g) => {
              const items = results[g.key];
              if (items.length === 0) return null;
              return (
                <div key={g.key} className={styles.searchGroup}>
                  <p className={styles.searchGroupTitle}>{g.label}</p>
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={styles.searchItem}
                      onClick={() => go(item.href)}
                    >
                      <span>{item.label}</span>
                      {item.meta && <span className={styles.searchItemMeta}>{item.meta}</span>}
                    </button>
                  ))}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useEffect, useState, useRef } from "react";

/**
 * SearchBar Component
 * 
 * URL-driven search that updates searchParams
 * Follows Next.js App Router pattern for search functionality
 * Resets pagination to page 1 on search change
 */
export function SearchBar({ placeholder = "Search products..." }: { placeholder?: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search')?.toString() || '');
  const isInitialMount = useRef(true);

  // Debounced URL update - only trigger when user types, not when URL changes
  useEffect(() => {
    // Skip on initial mount to avoid unnecessary update
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const currentSearch = searchParams.get('search') || '';
      
      // Only update URL if the search term actually changed
      if (searchTerm !== currentSearch) {
        const params = new URLSearchParams(searchParams.toString());
        
        // Reset to page 1 when search changes
        params.set('page', '1');
        
        if (searchTerm) {
          params.set('search', searchTerm);
        } else {
          params.delete('search');
        }
        
        router.replace(`${pathname}?${params.toString()}`);
      }
    }, 300);

    return () => clearTimeout(timer);
    // DO NOT include searchParams in dependencies - it causes infinite loop
  }, [searchTerm, pathname, router]);

  // Sync input with URL when user navigates (e.g., back button)
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    if (urlSearch !== searchTerm) {
      setSearchTerm(urlSearch);
    }
  }, [searchParams]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
      />
    </div>
  );
}

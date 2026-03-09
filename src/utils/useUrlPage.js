import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Syncs the current page with the ?page= URL query param.
 * This preserves the page across browser back/forward navigation:
 * navigate to page 3, click a row, press Back → you're back on page 3.
 *
 * @param {string} [paramName='page'] - URL query param name (change if a page needs two separate paginators)
 * @returns {[number, (n: number) => void]}
 */
export default function useUrlPage(paramName = 'page') {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Math.max(1, parseInt(searchParams.get(paramName) || '1', 10));

  const setPage = useCallback(
    (newPage) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (newPage <= 1) {
            params.delete(paramName);
          } else {
            params.set(paramName, String(newPage));
          }
          return params;
        },
        { replace: true } // don't pile up history entries for each page flip
      );
    },
    [setSearchParams, paramName]
  );

  return [page, setPage];
}

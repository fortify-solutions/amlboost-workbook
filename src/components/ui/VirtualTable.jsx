import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

export function VirtualTable({ 
  data = [], 
  columns = [], 
  totalRows = 0,
  onLoadMore,
  itemHeight = 40,
  headerHeight = 40,
  overscan = 10,
  loading = false,
  className = ''
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);
  const scrollElementRef = useRef(null);
  const [loadedPages, setLoadedPages] = useState(new Set());

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = start + visibleCount;
    
    return {
      start: Math.max(0, start - overscan),
      end: Math.min(totalRows, end + overscan)
    };
  }, [scrollTop, containerHeight, itemHeight, overscan, totalRows]);

  // Handle scroll
  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  // Load more data when needed
  useEffect(() => {
    const { start, end } = visibleRange;
    const pageSize = 1000; // Match API page size
    
    // Check which pages we need to load
    const startPage = Math.floor(start / pageSize) + 1;
    const endPage = Math.floor(end / pageSize) + 1;
    
    for (let page = startPage; page <= endPage; page++) {
      if (!loadedPages.has(page) && onLoadMore) {
        setLoadedPages(prev => new Set(prev).add(page));
        onLoadMore(page);
      }
    }
  }, [visibleRange, loadedPages, onLoadMore]);

  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (scrollElementRef.current) {
        setContainerHeight(scrollElementRef.current.clientHeight);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Get visible items
  const visibleItems = useMemo(() => {
    const items = [];
    for (let i = visibleRange.start; i < visibleRange.end; i++) {
      const rowData = data[i];
      if (rowData) {
        items.push({
          index: i,
          data: rowData,
          top: i * itemHeight
        });
      } else {
        // Placeholder for loading data
        items.push({
          index: i,
          data: null,
          top: i * itemHeight
        });
      }
    }
    return items;
  }, [visibleRange, data, itemHeight]);

  // Total height of all items
  const totalHeight = totalRows * itemHeight;

  return (
    <div className={`virtual-table ${className}`}>
      {/* Header */}
      <div 
        className="virtual-table-header sticky top-0 z-10 bg-white border-b border-gray-200"
        style={{ height: headerHeight }}
      >
        <div className="flex">
          {columns.map((column, index) => (
            <div
              key={column.name || index}
              className="flex-1 px-4 py-2 text-left text-sm font-medium text-gray-700 bg-gray-50"
              style={{ minWidth: column.width || 120 }}
            >
              {column.label || column.name || `Column ${index + 1}`}
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable body */}
      <div
        ref={scrollElementRef}
        className="virtual-table-body overflow-auto"
        style={{ 
          height: `calc(100% - ${headerHeight}px)`,
          maxHeight: '600px' 
        }}
        onScroll={handleScroll}
      >
        {/* Virtual container */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          {/* Visible rows */}
          {visibleItems.map((item) => (
            <div
              key={item.index}
              className="virtual-table-row absolute w-full border-b border-gray-100 hover:bg-gray-50"
              style={{
                height: itemHeight,
                top: item.top,
                left: 0
              }}
            >
              {item.data ? (
                <div className="flex h-full items-center">
                  {columns.map((column, colIndex) => (
                    <div
                      key={`${item.index}-${column.name || colIndex}`}
                      className="flex-1 px-4 py-2 text-sm text-gray-900 truncate"
                      style={{ minWidth: column.width || 120 }}
                      title={String(item.data[column.name] || '')}
                    >
                      {column.render 
                        ? column.render(item.data[column.name], item.data, item.index)
                        : (item.data[column.name] ?? '')
                      }
                    </div>
                  ))}
                </div>
              ) : (
                // Loading placeholder
                <div className="flex h-full items-center">
                  {columns.map((column, colIndex) => (
                    <div
                      key={`loading-${item.index}-${colIndex}`}
                      className="flex-1 px-4 py-2"
                      style={{ minWidth: column.width || 120 }}
                    >
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-sm">
          Loading more data...
        </div>
      )}

      {/* Row count info */}
      <div className="virtual-table-footer p-2 border-t border-gray-200 bg-gray-50 text-sm text-gray-600">
        Showing {data.length} of {totalRows.toLocaleString()} rows
      </div>
    </div>
  );
}

// Enhanced DataTable component with virtual scrolling
export function DataTable({ 
  queryResults = [], 
  columns = [], 
  totalRows = 0,
  onLoadPage,
  loading = false,
  className = '' 
}) {
  const [allData, setAllData] = useState([]);
  const [loadingPages, setLoadingPages] = useState(new Set());

  // Initialize data
  useEffect(() => {
    if (queryResults.length > 0) {
      setAllData(queryResults);
    }
  }, [queryResults]);

  // Handle loading more pages
  const handleLoadMore = useCallback(async (page) => {
    if (loadingPages.has(page) || !onLoadPage) return;
    
    setLoadingPages(prev => new Set(prev).add(page));
    
    try {
      const newData = await onLoadPage(page);
      
      if (newData && newData.length > 0) {
        setAllData(prev => {
          const updated = [...prev];
          const startIndex = (page - 1) * 1000; // Assuming 1000 items per page
          
          // Insert new data at the correct position
          newData.forEach((item, index) => {
            updated[startIndex + index] = item;
          });
          
          return updated;
        });
      }
    } catch (error) {
      console.error(`Failed to load page ${page}:`, error);
    } finally {
      setLoadingPages(prev => {
        const updated = new Set(prev);
        updated.delete(page);
        return updated;
      });
    }
  }, [onLoadPage, loadingPages]);

  // Convert column data for virtual table
  const virtualColumns = useMemo(() => {
    return columns.map(col => ({
      name: col,
      label: col.charAt(0).toUpperCase() + col.slice(1).replace(/_/g, ' '),
      width: col.length < 10 ? 120 : Math.min(col.length * 8 + 40, 200),
      render: (value) => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      }
    }));
  }, [columns]);

  return (
    <VirtualTable
      data={allData}
      columns={virtualColumns}
      totalRows={totalRows}
      onLoadMore={handleLoadMore}
      loading={loadingPages.size > 0 || loading}
      className={className}
    />
  );
}
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { RiCheckLine, RiCloseLine, RiDeleteBinLine } from "@remixicon/react";
import { GridSkeleton } from "./skeletons";

import DeleteDialog from "./DeleteDialog";

interface SelectableGridProps<T> {
  storeKey: string;
  itemTypeName: string;
  items: T[];
  getKey: (item: T) => string;
  getDate: (item: T) => Date;
  renderItem: (
    item: T,
    selected: boolean,
    selectionMode: boolean,
    onToggleSelect: () => void
  ) => React.ReactNode;
  renderHeader?: (args: {
    selectionMode: boolean;
    setManualSelectionMode: (val: boolean) => void;
  }) => React.ReactNode;
  onDelete: (selectedItems: T[]) => Promise<void> | void;
  emptyState?: React.ReactNode;
  loading?: boolean;
  skeletonCount?: number;
}

export function SelectableGrid<T>({
  storeKey,
  itemTypeName,
  items,
  getKey,
  getDate,
  renderItem,
  renderHeader,
  onDelete,
  emptyState,
  loading = false,
  skeletonCount = 6,
}: SelectableGridProps<T>) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => {
    if (typeof sessionStorage !== "undefined" && storeKey) {
      const saved = sessionStorage.getItem(`selection-${storeKey}`);
      if (saved) return new Set(JSON.parse(saved));
    }
    return new Set();
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const [manualSelectionMode, setManualSelectionMode] = useState(() => {
    if (typeof sessionStorage !== "undefined" && storeKey) {
      return sessionStorage.getItem(`selection-mode-${storeKey}`) === "true";
    }
    return false;
  });

  const selectionMode = manualSelectionMode || selectedKeys.size > 0;

  // Persist state
  useEffect(() => {
    if (typeof sessionStorage !== "undefined" && storeKey) {
      sessionStorage.setItem(`selection-${storeKey}`, JSON.stringify(Array.from(selectedKeys)));
      sessionStorage.setItem(`selection-mode-${storeKey}`, manualSelectionMode.toString());
    }
  }, [selectedKeys, manualSelectionMode, storeKey]);

  // Clear selection if items change and selected items no longer exist
  useEffect(() => {
    const validKeys = new Set(items.map(getKey));
    setSelectedKeys((prev) => {
      const next = new Set<string>();
      for (const k of prev) {
        if (validKeys.has(k)) next.add(k);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [items, getKey]);

  const groups = useMemo(() => {
    const today: T[] = [];
    const yesterday: T[] = [];
    const older: Record<string, T[]> = {};
    const order: string[] = [];

    const sortedItems = [...items].sort((a, b) => getDate(b).getTime() - getDate(a).getTime());

    sortedItems.forEach((m) => {
      const d = getDate(m);
      if (isToday(d)) {
        today.push(m);
      } else if (isYesterday(d)) {
        yesterday.push(m);
      } else {
        const dateStr = format(d, "MMMM d, yyyy");
        if (!older[dateStr]) {
          older[dateStr] = [];
          order.push(dateStr);
        }
        older[dateStr].push(m);
      }
    });

    const result = [];
    if (today.length) result.push({ title: "Today", items: today });
    if (yesterday.length) result.push({ title: "Yesterday", items: yesterday });
    order.forEach((dateStr) => {
      result.push({ title: dateStr, items: older[dateStr] });
    });

    return result;
  }, [items, getDate]);

  const toggleItem = (key: string) => {
    const next = new Set(selectedKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedKeys(next);
  };

  const toggleGroup = (groupItems: T[]) => {
    const keys = groupItems.map(getKey);
    const allSelected = keys.every((k) => selectedKeys.has(k));
    const next = new Set(selectedKeys);
    if (allSelected) {
      keys.forEach((k) => next.delete(k));
    } else {
      keys.forEach((k) => next.add(k));
    }
    setSelectedKeys(next);
  };

  const toggleAll = () => {
    if (selectedKeys.size === items.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(items.map(getKey)));
    }
  };

  const clearSelection = () => {
    setSelectedKeys(new Set());
    setManualSelectionMode(false);
  };

  const handleDeleteConfirm = async () => {
    if (selectedKeys.size === 0) return;
    setIsDeleting(true);
    try {
      const selectedItems = items.filter((item) => selectedKeys.has(getKey(item)));
      await onDelete(selectedItems);
      clearSelection();
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!loading && items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  let globalIdx = 0;

  return (
    <div className="relative pb-24">
      
      {/* Sticky Header with Overlay Action Bar */}
      <div className="sticky top-16 z-40 bg-bg/95 backdrop-blur-md pt-2 pb-4 -mx-2 px-2">
        <div className="relative min-h-[48px]">
          {/* Default Header */}
          <div className={`transition-all duration-300 ${selectionMode ? 'opacity-0 scale-95 pointer-events-none absolute inset-0' : 'opacity-100 scale-100'}`}>
             {renderHeader?.({ selectionMode, setManualSelectionMode })}
          </div>
          
          {/* Contextual Action Bar */}
          <div className={`absolute inset-0 flex items-center justify-between transition-all duration-300 bg-surface-highest/95 backdrop-blur-xl border border-border rounded-full shadow-md px-2 py-1 ${selectionMode ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95 pointer-events-none'}`}>
            <div className="flex items-center gap-3">
              <button 
                onClick={clearSelection}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-dim text-text transition-colors active:scale-95"
                title="Cancel Selection"
              >
                <RiCloseLine className="w-5 h-5" />
              </button>
              <span className="text-[15px] font-bold text-text whitespace-nowrap min-w-[80px]">
                {selectedKeys.size} selected
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={toggleAll}
                className="px-4 h-10 flex items-center justify-center rounded-full hover:bg-surface-dim text-[13px] font-bold text-text transition-colors active:scale-95 whitespace-nowrap"
              >
                {selectedKeys.size === items.length && items.length > 0 ? "Deselect All" : "Select All"}
              </button>
              <button
                onClick={() => setShowDeleteDialog(true)}
                disabled={selectedKeys.size === 0}
                className="px-4 h-10 flex items-center justify-center gap-2 rounded-full bg-risk text-bg text-[13px] font-bold transition-colors hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              >
                <RiDeleteBinLine className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {loading ? (
          <GridSkeleton count={skeletonCount} />
        ) : (
          groups.map((group) => {
            const groupKeys = group.items.map(getKey);
            const allSelected = groupKeys.every((k) => selectedKeys.has(k));
            const someSelected = groupKeys.some((k) => selectedKeys.has(k));

            return (
              <div key={group.title} className="flex flex-col gap-4">
                <div className="flex items-center gap-3 group/header cursor-pointer w-fit" onClick={() => toggleGroup(group.items)}>
                  <div 
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                      allSelected 
                        ? "bg-primary border-primary text-bg" 
                        : someSelected 
                          ? "bg-primary/50 border-primary text-bg" 
                          : "border-border/50 text-transparent opacity-0 group-hover/header:opacity-100 group-hover/header:border-primary/50"
                    } ${selectionMode && !allSelected && !someSelected ? "opacity-100" : ""}`}
                  >
                    <RiCheckLine className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-[13px] font-bold text-text-muted tracking-wider select-none">{group.title}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.items.map((item) => {
                    const key = getKey(item);
                    const isSelected = selectedKeys.has(key);
                    const currentIdx = globalIdx++;
                    
                    return (
                      <div 
                        key={key} 
                        className="relative"
                      >
                        {renderItem(item, isSelected, selectionMode, () => toggleItem(key))}
                        
                        {/* Checkbox overlay for MD3 Google Photos style */}
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleItem(key);
                          }}
                          className={`absolute top-3 left-3 w-6 h-6 rounded-full border-[1.5px] flex items-center justify-center cursor-pointer transition-all duration-300 z-10 ${
                            isSelected
                              ? "bg-primary border-primary text-bg scale-110 shadow-lg shadow-primary/20 opacity-100"
                              : selectionMode
                                ? "bg-surface/50 border-white/70 text-transparent hover:border-white hover:bg-surface/80 opacity-100 shadow-sm"
                                : "bg-black/20 border-white/60 text-transparent opacity-0 hover:opacity-100 hover:border-white hover:bg-black/40 hover:shadow-md"
                          }`}
                        >
                          <RiCheckLine className="w-4 h-4" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {showDeleteDialog && (
        <DeleteDialog
          title={`${selectedKeys.size} ${itemTypeName}${selectedKeys.size > 1 ? 's' : ''}`}
          itemName="Items"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteDialog(false)}
          busy={isDeleting}
        />
      )}
    </div>
  );
}

"use client";

import React from "react";
import { RiCheckLine, RiCloseLine, RiDeleteBinLine } from "@remixicon/react";
import { GridSkeleton } from "@/components/organisms/skeletons/GridSkeleton";
import DeleteDialog from "./DeleteDialog";
import { useSelectableGrid } from "./_hooks/useSelectableGrid";

export interface SelectableGridProps<T> {
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
    activeGroup?: string;
  }) => React.ReactNode;
  onDelete: (selectedItems: T[]) => Promise<void> | void;
  emptyState?: React.ReactNode;
  loading?: boolean;
  skeletonCount?: number;
  groupBy?: (item: T) => string;
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
  groupBy,
}: SelectableGridProps<T>) {
  
  const {
    selectedKeys,
    isDeleting,
    showDeleteDialog,
    setShowDeleteDialog,
    activeGroup,
    setManualSelectionMode,
    selectionMode,
    groups,
    toggleItem,
    toggleGroup,
    toggleAll,
    clearSelection,
    handleDeleteConfirm
  } = useSelectableGrid({
    storeKey,
    items,
    getKey,
    getDate,
    onDelete,
    groupBy,
  });

  return (
    <div className="relative pb-24">
      {/* Sticky Header with Floating Pill Controls */}
      <div className="sticky top-16 md:top-[76px] z-30 pt-1 pb-3">
        <div className="relative min-h-[44px] grid items-center">
          {/* Default Header */}
          <div className={`col-start-1 row-start-1 transition-all duration-200 ${selectionMode ? 'opacity-0 pointer-events-none scale-[0.99]' : 'opacity-100 scale-100'}`}>
            {renderHeader?.({ selectionMode, setManualSelectionMode, activeGroup })}
          </div>
          
          {/* Contextual Action Bar (Floating Pill) */}
          <div className={`col-start-1 row-start-1 flex items-center justify-between gap-1 sm:gap-3 transition-all duration-200 bg-surface-container-high/95 backdrop-blur-xl border border-border/80 rounded-full shadow-md px-2.5 sm:px-4 py-1.5 ${selectionMode ? 'opacity-100 scale-100' : 'opacity-0 pointer-events-none scale-[0.99]'}`}>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                onClick={clearSelection}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full hover:bg-surface-container-highest text-text-muted hover:text-text transition-all active:scale-[0.95] shrink-0"
                aria-label="Cancel selection"
                title="Cancel Selection"
              >
                <RiCloseLine className="w-5 h-5" aria-hidden="true"/>
              </button>
              <span className="text-[13px] sm:text-[14px] font-bold text-text whitespace-nowrap truncate">
                {selectedKeys.size} selected
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={toggleAll}
                className="px-3 sm:px-4 h-8 sm:h-9 flex items-center justify-center rounded-full hover:bg-surface-container-highest text-[12px] sm:text-[13px] font-semibold text-text transition-all active:scale-[0.95] whitespace-nowrap"
              >
                {selectedKeys.size === items.length && items.length > 0 ? "Deselect" : "Select All"}
              </button>
              <button
                onClick={() => setShowDeleteDialog(true)}
                disabled={selectedKeys.size === 0}
                className="px-3 sm:px-4 h-8 sm:h-9 flex items-center justify-center gap-1.5 rounded-full bg-risk text-on-risk text-[12px] sm:text-[13px] font-bold transition-all hover:brightness-110 active:scale-[0.95] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RiDeleteBinLine className="w-3.5 h-3.5 sm:w-4 sm:h-4"/>
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {loading ? (
          <GridSkeleton count={skeletonCount} />
        ) : items.length === 0 && emptyState ? (
          emptyState
        ) : (
          groups.map((group) => {
            const groupKeys = group.items.map(getKey);
            const allSelected = groupKeys.every((k) => selectedKeys.has(k));
            const someSelected = groupKeys.some((k) => selectedKeys.has(k));

            return (
              <div key={group.title || "all"} className="flex flex-col gap-4 group-section" data-group={group.title}>
                {group.title && (
              <div
                className="flex items-center gap-3 group/header cursor-pointer w-fit"
                role="checkbox"
                aria-checked={allSelected ? true : someSelected ? "mixed" : false}
                tabIndex={0}
                aria-label={`Select all ${group.title || "items"}`}
                onClick={() => toggleGroup(group.items)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleGroup(group.items);
                  }
                }}
              >
                <div
                  aria-hidden="true"
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                    allSelected
                      ? "bg-primary border-primary text-bg"
                      : someSelected
                      ? "bg-primary/50 border-primary text-bg"
                      : "border-border/50 text-primary opacity-0 group-hover/header:opacity-100 group-hover/header:border-primary/50"
                  } ${selectionMode && !allSelected && !someSelected ? "opacity-100" : ""}`}
                >
                  <RiCheckLine className="w-3.5 h-3.5" aria-hidden="true"/>
                </div>
                <h3 className="text-[13px] font-bold text-text-muted tracking-wider select-none">{group.title}</h3>
              </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.items.map((item) => {
                    const key = getKey(item);
                    const isSelected = selectedKeys.has(key);
                    
                    return (
                      <div key={key} className="relative">
                        {renderItem(item, isSelected, selectionMode, () => toggleItem(key))}
                        
                        {/* Checkbox overlay for MD3 Google Photos style */}
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleItem(key);
                          }}
                          className={`absolute top-3 left-3 w-6 h-6 rounded-full border-[1.5px] flex items-center justify-center cursor-pointer transition-all duration-300 z-10 ${
                            isSelected
                              ? "bg-primary border-primary text-bg shadow-sm border border-border shadow-primary/20 opacity-100"
                              : selectionMode
                              ? "bg-surface/50 border-white/70 text-primary hover:border-white hover:bg-surface/80 opacity-100 shadow-sm"
                              : "bg-surface-container-high border-white/60 text-primary opacity-0 hover:opacity-100 hover:border-white hover:bg-surface-container-high hover:shadow-sm border border-border"
                          }`}
                        >
                          <RiCheckLine className="w-4 h-4"/>
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

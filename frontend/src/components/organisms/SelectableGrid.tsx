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
      {/* Sticky Header with Overlay Action Bar */}
      <div className="sticky top-16 md:top-[76px] z-30 pt-2 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="absolute inset-x-0 bottom-4 top-0 sm:top-1 bg-surface2/85 backdrop-blur-xl sm:rounded-[20px] border-b sm:border border-border/40 shadow-sm z-[-1]" />
        <div className="relative min-h-[48px] px-2 sm:px-4 py-2 grid items-center">
          {/* Default Header */}
          <div className={`col-start-1 row-start-1 transition-all duration-300 ${selectionMode ? 'opacity-0 pointer-events-none' : 'opacity-100 '}`}>
            {renderHeader?.({ selectionMode, setManualSelectionMode, activeGroup })}
          </div>
          
          {/* Contextual Action Bar */}
          <div className={`col-start-1 row-start-1 flex items-center justify-between gap-1 sm:gap-3 transition-all duration-300 bg-surface-highest/95 border border-border rounded-full shadow-sm px-2 sm:px-3 py-1 ${selectionMode ? 'opacity-100 ' : 'opacity-0 pointer-events-none'}`}>
            <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
              <button
                onClick={clearSelection}
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-surface-dim text-text transition-all active:scale-[0.97] shrink-0"
                aria-label="Cancel selection"
                title="Cancel Selection"
              >
                <RiCloseLine className="w-5 h-5" aria-hidden="true"/>
              </button>
              <span className="text-[13px] sm:text-[15px] font-bold text-text whitespace-nowrap truncate">
                {selectedKeys.size} selected
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={toggleAll}
                className="px-2.5 sm:px-4 h-9 sm:h-10 flex items-center justify-center rounded-full hover:bg-surface-dim text-[12px] sm:text-[13px] font-bold text-text transition-all active:scale-[0.97] whitespace-nowrap"
              >
                {selectedKeys.size === items.length && items.length > 0 ? "Deselect" : "Select All"}
              </button>
              <button
                onClick={() => setShowDeleteDialog(true)}
                disabled={selectedKeys.size === 0}
                className="px-3 sm:px-4 h-9 sm:h-10 flex items-center justify-center gap-1.5 sm:gap-2 rounded-full bg-risk text-bg text-[12px] sm:text-[13px] font-bold transition-all hover:brightness-110 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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

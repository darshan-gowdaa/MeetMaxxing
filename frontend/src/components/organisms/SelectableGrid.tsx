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
    onDelete
  });

  if (!loading && items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className="relative pb-24">
      {/* Sticky Header with Overlay Action Bar */}
      <div className="sticky top-[76px] z-40 pt-1 pb-4">
        <div className="absolute inset-x-0 bottom-4 top-1 bg-surface2/70 rounded-[20px] border border-border/40 shadow-sm z-[-1]" />
        <div className="relative min-h-[48px] px-4 py-2 grid items-center">
          {/* Default Header */}
          <div className={`col-start-1 row-start-1 transition-all duration-300 ${selectionMode ? 'opacity-0 pointer-events-none' : 'opacity-100 '}`}>
            {renderHeader?.({ selectionMode, setManualSelectionMode, activeGroup })}
          </div>
          
          {/* Contextual Action Bar */}
          <div className={`col-start-1 row-start-1 flex items-center justify-between transition-all duration-300 bg-surface-highest/95 border border-border rounded-full shadow-sm border border-border px-2 py-1 ${selectionMode ? 'opacity-100 ' : 'opacity-0 pointer-events-none'}`}>
            <div className="flex items-center gap-3">
              <button 
                onClick={clearSelection}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-dim text-text transition-colors active:opacity-80"
                title="Cancel Selection"
              >
                <RiCloseLine className="w-5 h-5"/>
              </button>
              <span className="text-[15px] font-bold text-text whitespace-nowrap min-w-[80px]">
                {selectedKeys.size} selected
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={toggleAll}
                className="px-4 h-10 flex items-center justify-center rounded-full hover:bg-surface-dim text-[13px] font-bold text-text transition-colors active:opacity-80 whitespace-nowrap"
              >
                {selectedKeys.size === items.length && items.length > 0 ? "Deselect All" : "Select All"}
              </button>
              <button
                onClick={() => setShowDeleteDialog(true)}
                disabled={selectedKeys.size === 0}
                className="px-4 h-10 flex items-center justify-center gap-2 rounded-full bg-risk text-bg text-[13px] font-bold transition-colors hover:brightness-110 active:opacity-80 disabled:opacity-50 disabled:pointer-events-none"
              >
                <RiDeleteBinLine className="w-4 h-4"/>
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
              <div key={group.title} className="flex flex-col gap-4 group-section" data-group={group.title}>
                <div className="flex items-center gap-3 group/header cursor-pointer w-fit" onClick={() => toggleGroup(group.items)}>
                  <div 
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                      allSelected 
                        ? "bg-primary border-primary text-bg"
                        : someSelected 
                        ? "bg-primary/50 border-primary text-bg"
                        : "border-border/50 text-primary opacity-0 group-hover/header:opacity-100 group-hover/header:border-primary/50"
                    } ${selectionMode && !allSelected && !someSelected ? "opacity-100" : ""}`}
                  >
                    <RiCheckLine className="w-3.5 h-3.5"/>
                  </div>
                  <h3 className="text-[13px] font-bold text-text-muted tracking-wider select-none">{group.title}</h3>
                </div>
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

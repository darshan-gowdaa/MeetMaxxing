import { useState, useEffect, useMemo } from 'react';
import { format, isToday, isYesterday } from 'date-fns';

interface UseSelectableGridProps<T> {
  storeKey: string;
  items: T[];
  getKey: (item: T) => string;
  getDate: (item: T) => Date;
  onDelete: (selectedItems: T[]) => Promise<void> | void;
}

export function useSelectableGrid<T>({
  storeKey,
  items,
  getKey,
  getDate,
  onDelete
}: UseSelectableGridProps<T>) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => {
    if (typeof sessionStorage !== "undefined" && storeKey) {
      const saved = sessionStorage.getItem(`selection-${storeKey}`);
      if (saved) return new Set(JSON.parse(saved));
    }
    return new Set();
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string>("");
  
  const [manualSelectionMode, setManualSelectionMode] = useState(() => {
    if (typeof sessionStorage !== "undefined" && storeKey) {
      return sessionStorage.getItem(`selection-mode-${storeKey}`) === "true";
    }
    return false;
  });

  const selectionMode = manualSelectionMode || selectedKeys.size > 0;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        let maxVisible = null;
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            maxVisible = entry.target.getAttribute("data-group");
          }
        });
        if (maxVisible) setActiveGroup(maxVisible);
      },
      { rootMargin: "-124px 0px -60% 0px" }
    );
    const elements = document.querySelectorAll(".group-section");
    elements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  useEffect(() => {
    if (typeof sessionStorage !== "undefined" && storeKey) {
      sessionStorage.setItem(`selection-${storeKey}`, JSON.stringify(Array.from(selectedKeys)));
      sessionStorage.setItem(`selection-mode-${storeKey}`, manualSelectionMode.toString());
    }
  }, [selectedKeys, manualSelectionMode, storeKey]);

  useEffect(() => {
    const validKeys = new Set(items.map(getKey));
    setTimeout(() => {
      setSelectedKeys((prev) => {
        const next = new Set<string>();
        for (const k of prev) {
          if (validKeys.has(k)) next.add(k);
        }
        return next.size === prev.size ? prev : next;
      });
    }, 0);
  }, [items, getKey]);

  const groups = useMemo(() => {
    const map = new Map<string, T[]>();
    [...items].sort((a, b) => getDate(b).getTime() - getDate(a).getTime()).forEach((item) => {
      const d = getDate(item);
      const k = isToday(d) ? "Today" : isYesterday(d) ? "Yesterday" : format(d, "MMMM d, yyyy");
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(item);
    });
    return Array.from(map.entries()).map(([title, items]) => ({ title, items }));
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

  return {
    selectedKeys,
    isDeleting,
    showDeleteDialog,
    setShowDeleteDialog,
    activeGroup,
    manualSelectionMode,
    setManualSelectionMode,
    selectionMode,
    groups,
    toggleItem,
    toggleGroup,
    toggleAll,
    clearSelection,
    handleDeleteConfirm
  };
}

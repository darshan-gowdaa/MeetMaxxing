"use client";

import { useState, useRef, useEffect } from "react";
import {
  RiFilePdfLine,
  RiFileWordLine,
  RiFileTextLine,
  RiMoreLine,
  RiEditLine,
  RiDeleteBinLine,
  RiEyeLine,
  RiCheckLine,
  RiArrowRightLine,
} from "@remixicon/react";

export type ContextFile = {
  meeting_id: string;
  filename: string;
  chunks: number;
  date: string;
};

export default function ContextCard({
  file,
  index,
  onView,
  onEdit,
  onDelete,
  onSelect,
}: {
  file: ContextFile;
  index: number;
  onView: (f: ContextFile) => void;
  onEdit: (f: ContextFile) => void;
  onDelete: (f: ContextFile) => void;
  onSelect?: (f: ContextFile) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const colorVariants = [
    "bg-primary-container/10 border-primary/20 hover:border-primary/50 md3-glow-primary",
    "bg-secondary-container/10 border-secondary/20 hover:border-secondary/50 md3-glow-secondary",
    "bg-tertiary-container/10 border-tertiary/20 hover:border-tertiary/50 md3-glow-tertiary",
    "bg-[#2c2d34] hover:border-primary/40 md3-glow-primary",
  ];
  const variant = colorVariants[index % colorVariants.length];

  const getFileIcon = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return <RiFilePdfLine className="w-3.5 h-3.5 text-red-400" />;
    if (ext === "docx") return <RiFileWordLine className="w-3.5 h-3.5 text-blue-400" />;
    return <RiFileTextLine className="w-3.5 h-3.5 text-primary" />;
  };

  return (
    <div className={`group relative rounded-[24px] border spring flex flex-col h-[220px] overflow-visible ${variant}`}>
      {/* Top glow accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent rounded-t-[24px]" />

      {/* 3-Dots Menu (Top Right) */}
      <div className="absolute top-4 right-4 z-20" ref={menuRef}>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuOpen((o) => !o);
          }}
          className="w-8 h-8 rounded-full bg-surface2 hover:bg-surface3 flex items-center justify-center spring-colors border border-border shadow-sm"
          aria-label="File options"
        >
          <RiMoreLine className="w-4 h-4 text-text-muted" />
        </button>

        {menuOpen && (
          <div className="absolute top-full right-0 mt-2 w-44 bg-surface-highest rounded-[16px] border border-border shadow-2xl animate-fade-scale overflow-hidden z-30">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenuOpen(false);
                onView(file);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-[13px] font-medium text-text hover:bg-surface3 spring-colors"
            >
              <RiEyeLine className="w-4 h-4 text-primary" />
              View
            </button>
            {onSelect && (
              <>
                <div className="h-px bg-border mx-3" />
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen(false);
                    onSelect(file);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-[13px] font-medium text-text hover:bg-surface3 spring-colors"
                >
                  <RiCheckLine className="w-4 h-4 text-primary" />
                  Select
                </button>
              </>
            )}
            <div className="h-px bg-border mx-3" />
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenuOpen(false);
                setTimeout(() => onEdit(file), 10);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-[13px] font-medium text-text hover:bg-surface3 spring-colors"
            >
              <RiEditLine className="w-4 h-4 text-primary" />
              Rename
            </button>
            <div className="h-px bg-border mx-3" />
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenuOpen(false);
                setTimeout(() => onDelete(file), 10);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-[13px] font-medium text-risk hover:bg-risk-container/30 spring-colors"
            >
              <RiDeleteBinLine className="w-4 h-4" />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div
        onClick={() => onView(file)}
        className="flex flex-col gap-3 p-5 flex-1 relative z-10 h-full cursor-pointer"
      >
        {/* Date / Type chip */}
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary bg-primary-dim border border-primary/20 rounded-full px-3 py-1 w-fit mt-1">
          {getFileIcon(file.filename)}
          <span>{file.date || "Uploaded"}</span>
        </div>

        {/* Title */}
        <h4 className="text-[15px] font-bold text-text leading-snug line-clamp-2 group-hover:text-primary spring-colors pr-10 mt-1" title={file.filename}>
          {file.filename}
        </h4>

        {/* Info */}
        <div className="text-[12.5px] text-text-muted leading-relaxed line-clamp-2 flex-1 mt-1">
          <span className="font-medium">Size: </span>
          {((file.chunks * 1.2) / 1024).toFixed(2)} MB ({file.chunks} chunks)
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-border flex items-center justify-between mt-auto">
          <span className="text-[11.5px] text-text-muted font-medium uppercase tracking-wider">
            {file.meeting_id === "global" ? "Global Context" : `Meeting: ${file.meeting_id.slice(0, 8)}...`}
          </span>
          <div className="w-7 h-7 rounded-full bg-surface2 group-hover:bg-primary-container flex items-center justify-center spring-colors">
            <RiArrowRightLine className="w-3.5 h-3.5 text-text-muted group-hover:text-primary spring-colors" />
          </div>
        </div>
      </div>
    </div>
  );
}

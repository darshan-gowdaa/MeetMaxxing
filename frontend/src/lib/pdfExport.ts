import jsPDF from "jspdf";
import { format } from "date-fns";
import type { Meeting } from "@/types";

/**
 * Cleanly export meeting details (summary, key decisions, action items)
 * to a beautifully styled PDF document using jsPDF.
 */
export function exportMeetingPdf(meeting: Meeting) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  // Header Brand Accent
  doc.setFillColor(11, 87, 208); // MD3 Primary Blue
  doc.rect(margin, y, contentWidth, 3, "F");
  y += 10;

  // App & Document Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(31, 31, 31);
  const title = meeting.title || "Meeting Notes";
  const titleLines = doc.splitTextToSize(title, contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 8 + 2;

  // Metadata Subtitle: Date, Participants, Status
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(116, 119, 127); // MD3 Text Muted

  let dateStr = "Recent Meeting";
  if (meeting.start_at && !isNaN(new Date(meeting.start_at).getTime())) {
    const startD = new Date(meeting.start_at);
    dateStr = format(startD, "EEEE, MMMM d, yyyy • h:mm a");
    if (meeting.end_at && !isNaN(new Date(meeting.end_at).getTime())) {
      dateStr += ` – ${format(new Date(meeting.end_at), "h:mm a")}`;
    }
  }

  const attendeesCount =
    meeting.attendees?.length ||
    (Array.isArray(meeting.transcript_data)
      ? new Set(meeting.transcript_data.map((t) => t.speaker).filter(Boolean)).size
      : 1);

  doc.text(`${dateStr} | ${attendeesCount} Participant${attendeesCount > 1 ? "s" : ""}`, margin, y);
  y += 10;

  // Thin separator
  doc.setDrawColor(224, 224, 224);
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + contentWidth, y);
  y += 8;

  // Section 1: Executive Summary
  if (meeting.summary && meeting.summary.trim()) {
    checkPageBreak(25);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(11, 87, 208);
    doc.text("EXECUTIVE SUMMARY", margin, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(31, 31, 31);
    const summaryLines = doc.splitTextToSize(meeting.summary.trim(), contentWidth);
    
    for (const line of summaryLines) {
      checkPageBreak(6);
      doc.text(line, margin, y);
      y += 5.5;
    }
    y += 6;
  }

  // Section 2: Key Decisions
  if (meeting.decisions && meeting.decisions.length > 0) {
    checkPageBreak(25);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(20, 108, 46); // MD3 Success Green
    doc.text(`KEY DECISIONS (${meeting.decisions.length})`, margin, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(31, 31, 31);

    meeting.decisions.forEach((dec) => {
      const d = typeof dec === "string" ? { text: dec, decided_by: "" } : dec;
      const text = d.text || JSON.stringify(d);
      const decBy = d.decided_by ? ` (Decided by: ${d.decided_by})` : "";
      const fullText = `• ${text}${decBy}`;
      const decLines = doc.splitTextToSize(fullText, contentWidth - 4);

      checkPageBreak(decLines.length * 6 + 2);
      doc.text(decLines, margin + 2, y);
      y += decLines.length * 5.5 + 2;
    });
    y += 6;
  }

  // Section 3: Action Items
  if (meeting.action_items && meeting.action_items.length > 0) {
    checkPageBreak(25);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(11, 87, 208); // MD3 Primary
    doc.text(`ACTION ITEMS (${meeting.action_items.length})`, margin, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(31, 31, 31);

    meeting.action_items.forEach((item) => {
      const checkbox = item.status === "done" ? "[X]" : "[  ]";
      const desc = item.description || "Task";
      const owner = item.owner_name ? `Owner: ${item.owner_name}` : "Unassigned";
      const priority = item.priority ? `Priority: ${item.priority}` : "";
      const due = item.due_date ? `Due: ${item.due_date}` : "";
      const meta = [owner, priority, due].filter(Boolean).join(" • ");

      const itemText = `${checkbox} ${desc} (${meta})`;
      const itemLines = doc.splitTextToSize(itemText, contentWidth - 4);

      checkPageBreak(itemLines.length * 6 + 2);
      if (item.status === "done") {
        doc.setTextColor(116, 119, 127);
      } else {
        doc.setTextColor(31, 31, 31);
      }
      doc.text(itemLines, margin + 2, y);
      y += itemLines.length * 5.5 + 2;
    });
    y += 6;
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(150, 150, 150);
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, margin + contentWidth, pageHeight - 12);
    doc.text(
      "Generated by MeetMaxxing AI Meeting Copilot",
      margin,
      pageHeight - 7
    );
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 7,
      { align: "right" }
    );
  }

  const safeFilename = (meeting.title || "meeting")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .toLowerCase();
  doc.save(`${safeFilename}-notes.pdf`);
}

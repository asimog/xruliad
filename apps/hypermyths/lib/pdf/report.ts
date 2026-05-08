import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import type { ReportDocument } from "@/lib/types/domain";

function lineWrap(input: string, maxLength = 92): string[] {
  const words = input.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

export async function generateReportPdf(report: ReportDocument): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([612, 792]);
  let y = 742;

  const drawLine = (text: string, size = 10, isBold = false) => {
    if (y < 64) {
      page = pdf.addPage([612, 792]);
      y = 742;
    }
    page.drawText(text, {
      x: 54,
      y,
      size,
      font: isBold ? bold : font,
      color: rgb(0.08, 0.08, 0.1),
    });
    y -= size + 8;
  };

  drawLine(report.subjectName ?? report.subjectSymbol ?? "HyperMyths Report", 18, true);
  drawLine(`Job: ${report.jobId}`, 10);
  drawLine(`Wallet: ${report.wallet}`, 10);
  drawLine(`Range: ${report.rangeDays} day(s)`, 10);
  y -= 8;

  for (const line of lineWrap(report.summary || report.narrativeSummary || "No report summary available.")) {
    drawLine(line, 10);
  }

  if (report.behaviorPatterns?.length) {
    y -= 8;
    drawLine("Signals", 12, true);
    for (const signal of report.behaviorPatterns.slice(0, 12)) {
      for (const line of lineWrap(`- ${signal}`, 88)) {
        drawLine(line, 10);
      }
    }
  }

  if (report.storyBeats?.length) {
    y -= 8;
    drawLine("Story Beats", 12, true);
    for (const beat of report.storyBeats.slice(0, 12)) {
      for (const line of lineWrap(`- ${beat}`, 88)) {
        drawLine(line, 10);
      }
    }
  }

  return pdf.save();
}

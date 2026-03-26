"use client";

import { useState, useEffect, useCallback } from "react";
import { simplifyMedicalText, SIMPLE_REPORT_STYLES } from "@/lib/medical-simplify";

interface BookReport {
  bookTitle: string;
  pageRange: string;
  pageCount: number;
  diagnosis: string;
  categories: {
    summary: string[];
    prevention: string[];
    diagnosis: string[];
    treatment: string[];
    additionalTherapy: string[];
  };
}

interface BookResult {
  totalCount: number;
  bookReport: BookReport | null;
}

interface BookEntry {
  filename: string;
  label: string;
}

// ---------------------------------------------------------------------------
// Report generation
// ---------------------------------------------------------------------------

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, "").replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}

/** Detect if a sentence looks like a bullet point */
function isBullet(s: string): boolean {
  return /^[\u2022\u2023\u25E6\u25AA\u25CF•\-–—*]\s*/.test(s);
}

/** Build flowing paragraphs from sentences, adding [1] at the end of each paragraph.
 *  Bullet-point items are rendered as a list; regular sentences are grouped
 *  into 5-sentence paragraphs for readability. */
function buildParagraphs(sentences: string[], refNum: number): string {
  if (sentences.length === 0) return "";

  const html: string[] = [];
  let i = 0;

  while (i < sentences.length) {
    // Collect consecutive bullets into a <ul>
    if (isBullet(sentences[i])) {
      const items: string[] = [];
      while (i < sentences.length && isBullet(sentences[i])) {
        // Strip the leading bullet character
        const text = stripHtml(sentences[i]).replace(/^[\u2022\u2023\u25E6\u25AA\u25CF•\-–—*]\s*/, "");
        items.push(text);
        i++;
      }
      // Attach the superscript reference inline on the last item
      const listHtml = items.map((text, idx) =>
        idx === items.length - 1
          ? `<li>${text}<sup>[${refNum}]</sup></li>`
          : `<li>${text}</li>`
      ).join("\n");
      html.push(`<ul>${listHtml}</ul>`);
    } else {
      // Group up to 5 non-bullet sentences into a paragraph
      const group: string[] = [];
      const end = Math.min(i + 5, sentences.length);
      while (i < end && !isBullet(sentences[i])) {
        group.push(stripHtml(sentences[i]));
        i++;
      }
      html.push(`<p>${group.join(" ")}<sup>[${refNum}]</sup></p>`);
    }
  }

  return html.join("\n");
}

/** Build simplified paragraphs for the general public.
 *  - Replaces medical jargon with plain language
 *  - Uses shorter paragraph groups (3 sentences) for easier reading
 *  - Larger font and more spacing via CSS class "simple" */
function buildSimpleParagraphs(sentences: string[], refNum: number): string {
  if (sentences.length === 0) return "";

  const html: string[] = [];
  let i = 0;

  while (i < sentences.length) {
    if (isBullet(sentences[i])) {
      const items: string[] = [];
      while (i < sentences.length && isBullet(sentences[i])) {
        const raw = stripHtml(sentences[i]).replace(/^[\u2022\u2023\u25E6\u25AA\u25CF•\-–—*]\s*/, "");
        items.push(simplifyMedicalText(raw));
        i++;
      }
      const listHtml = items.map((text, idx) =>
        idx === items.length - 1
          ? `<li>${text}<sup>[${refNum}]</sup></li>`
          : `<li>${text}</li>`
      ).join("\n");
      html.push(`<ul>${listHtml}</ul>`);
    } else {
      // Shorter groups of 3 sentences for readability
      const group: string[] = [];
      const end = Math.min(i + 3, sentences.length);
      while (i < end && !isBullet(sentences[i])) {
        group.push(simplifyMedicalText(stripHtml(sentences[i])));
        i++;
      }
      html.push(`<p>${group.join(" ")}<sup>[${refNum}]</sup></p>`);
    }
  }

  return html.join("\n");
}

const MEDICAL_REPORT_STYLES = `
    @media print { @page { margin: 0.8in; } body { font-size: 12px; } }
    body { font-family: 'Segoe UI', -apple-system, Arial, sans-serif; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.8; }
    h1 { font-size: 22px; border-bottom: 3px solid #0ea5e9; padding-bottom: 10px; margin-bottom: 4px; color: #0c4a6e; }
    .subtitle { font-size: 12px; color: #666; margin-bottom: 20px; }
    h2 { font-size: 16px; color: #0369a1; margin-top: 32px; margin-bottom: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    .section { margin-bottom: 28px; }
    .section p { font-size: 13px; color: #334155; margin: 0 0 16px 0; text-align: justify; line-height: 1.8; }
    .section p:last-child { margin-bottom: 0; }
    .section ul { margin: 0 0 16px 20px; padding: 0; list-style: disc; }
    .section ul li { font-size: 13px; color: #334155; margin-bottom: 6px; line-height: 1.7; }
    sup { font-size: 9px; color: #0369a1; font-weight: 600; }
    .disease-banner { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 12px 16px; margin-bottom: 18px; }
    .disease-banner h3 { margin: 0; font-size: 15px; color: #0c4a6e; }
    .intro { font-size: 13px; color: #475569; margin-bottom: 24px; line-height: 1.8; }
    .references { margin-top: 36px; padding-top: 20px; border-top: 2px solid #e2e8f0; }
    .references h2 { font-size: 15px; color: #334155; border-bottom: none; margin-bottom: 12px; }
    .references ol { padding-left: 0; list-style: none; }
    .references li { font-size: 11px; color: #475569; margin-bottom: 8px; line-height: 1.6; }
    .references li strong { color: #0369a1; }
    .ref-detail { color: #94a3b8; }
    .disclaimer { font-size: 11px; color: #94a3b8; margin-top: 32px; padding-top: 14px; border-top: 1px solid #e2e8f0; }
    .section-note { font-size: 13px; color: #64748b; font-style: italic; margin-bottom: 16px; line-height: 1.7; }
`;

function generateReportHtml(report: BookReport, simple: boolean): string {
  const cleanName = stripHtml(report.diagnosis);
  const bookTitle = stripHtml(report.bookTitle);
  const refNum = 1;

  const paragraphBuilder = simple ? buildSimpleParagraphs : buildParagraphs;

  const sectionDefs = simple
    ? [
        { key: "prevention" as const, title: "Prevention — How to Reduce Your Risk", note: "This section explains what you can do to lower your chances of getting this condition, or how to keep it from getting worse. Think of it as steps you and your doctor can take early on." },
        { key: "diagnosis" as const, title: "Diagnosis — How Doctors Find This Condition", note: "This section covers how doctors figure out if someone has this condition. It includes the types of tests, scans, and exams they may use." },
        { key: "treatment" as const, title: "Treatment — What Can Be Done About It", note: "This section describes the main ways this condition is treated, including medicines, procedures, and lifestyle changes your doctor may recommend." },
        { key: "additionalTherapy" as const, title: "Other Options — Additional Therapies to Know About", note: "This section covers other treatments that may help, including newer approaches, supportive care, and options beyond standard treatment." },
      ]
    : [
        { key: "prevention" as const, title: "General Prevention", note: "" },
        { key: "diagnosis" as const, title: "Diagnosis", note: "" },
        { key: "treatment" as const, title: "Treatment", note: "" },
        { key: "additionalTherapy" as const, title: "Additional Therapy", note: "" },
      ];

  const sectionHtml = sectionDefs
    .filter((s) => report.categories[s.key].length > 0)
    .map((s) => {
      const paragraphs = paragraphBuilder(report.categories[s.key], refNum);
      const noteHtml = s.note ? `<p class="section-note">${s.note}</p>` : "";
      return `
      <div class="section">
        <h2>${s.title}</h2>
        ${noteHtml}
        ${paragraphs}
      </div>`;
    })
    .join("");

  // Overview from the summary sentences
  const overviewParagraphs = report.categories.summary.length > 0
    ? paragraphBuilder(report.categories.summary, refNum)
    : "";

  const overviewHtml = overviewParagraphs
    ? `
      <div class="section">
        <h2>${simple ? "What Is This Condition?" : "Summary"}</h2>
        ${simple ? '<p class="section-note">Here is a general overview of this condition based on what the medical textbook says. This will help you understand the basics before reading the more detailed sections below.</p>' : ""}
        ${overviewParagraphs}
      </div>`
    : "";

  const title = simple
    ? "Understanding Your Condition — A Plain-Language Guide"
    : "Medical Book Research Report";
  const introText = simple
    ? `This guide was created to help you understand <strong>${cleanName}</strong> using information from the medical textbook <strong>${bookTitle}</strong> (${report.pageCount} relevant pages, ${report.pageRange}). Medical terms have been replaced with everyday language wherever possible. Each section is designed to answer a common question you might have. The small number <sup>[1]</sup> at the end of paragraphs shows where the information came from.`
    : `This report synthesizes findings about <strong>${cleanName}</strong> from <strong>${bookTitle}</strong>, based on ${report.pageCount} relevant pages (${report.pageRange}). Citations refer to the source listed in References.`;

  const keyTermsHtml = simple
    ? `
      <div class="key-terms">
        <h3>A note about this guide</h3>
        <p>Medical textbooks use technical language. We have tried to replace complex terms with simpler words, but some medical names for drugs, tests, or body parts may still appear. If you see a word you don't understand, ask your doctor or nurse to explain it — that is always okay to do.</p>
      </div>`
    : "";

  const styles = simple ? SIMPLE_REPORT_STYLES : MEDICAL_REPORT_STYLES;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title} - ${cleanName}</title>
  <style>${styles}</style>
</head>
<body>
  <h1>${title}</h1>
  <div class="subtitle">Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} via MaryForward</div>
  <div class="disease-banner"><h3>Condition: ${cleanName}</h3></div>
  <p class="intro">${introText}</p>
  ${keyTermsHtml}
  ${overviewHtml}
  ${sectionHtml}
  <div class="references">
    <h2>References</h2>
    <ol>
      <li><strong>[1]</strong> ${bookTitle} <span class="ref-detail">(${report.pageRange}, ${report.pageCount} pages referenced)</span></li>
    </ol>
  </div>
  <p class="disclaimer">${simple
    ? "This guide was created from a medical textbook to help you learn about your condition. It is not a substitute for talking to your doctor. Always discuss any questions or concerns with your healthcare provider before making decisions about your health."
    : "This report is a summary of content from a medical reference book and is intended for informational purposes only. It does not replace professional medical advice. Always consult with your healthcare provider about any medical decisions."
  }</p>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// UI Components
// ---------------------------------------------------------------------------

function SectionBlock({ title, items, color }: { title: string; items: string[]; color: string }) {
  if (items.length === 0) return null;

  const bulletItems = items.filter((s) => isBullet(s));
  const regularItems = items.filter((s) => !isBullet(s));

  return (
    <div className="glass p-5">
      <h3 className={`text-base font-semibold ${color}`}>{title}</h3>
      {regularItems.length > 0 && (
        <p className="mt-3 text-sm text-slate-300 leading-relaxed">
          {regularItems.map((s) => s.replace(/<[^>]+>/g, "")).join(" ")}
        </p>
      )}
      {bulletItems.length > 0 && (
        <ul className="mt-3 list-disc pl-5 space-y-1">
          {bulletItems.map((s, i) => (
            <li key={i} className="text-sm text-slate-300 leading-relaxed">
              {s.replace(/<[^>]+>/g, "").replace(/^[\u2022\u2023\u25E6\u25AA\u25CF•\-–—*]\s*/, "")}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SpinnerIcon() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function MedicalBooksButton({ caseId }: { caseId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [books, setBooks] = useState<BookEntry[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [selectedBook, setSelectedBook] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<BookResult | null>(null);

  const fetchBooks = useCallback(async () => {
    setBooksLoading(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/research-books`);
      if (res.ok) {
        const data = await res.json();
        setBooks(data.books || []);
      }
    } catch {
      // Silently fail
    } finally {
      setBooksLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    if (isOpen && books.length === 0) {
      fetchBooks();
    }
  }, [isOpen, books.length, fetchBooks]);

  const openPrintWindow = (html: string) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  };

  const handleExportPdf = () => {
    if (!result?.bookReport) return;
    openPrintWindow(generateReportHtml(result.bookReport, false));
  };

  const handleSimpleReport = () => {
    if (!result?.bookReport) return;
    openPrintWindow(generateReportHtml(result.bookReport, true));
  };

  // Clear old result when switching books
  const handleBookChange = (value: string) => {
    setSelectedBook(value);
    setResult(null);
    setError("");
  };

  const handleSearch = async () => {
    if (!selectedBook) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(`/api/cases/${caseId}/research-books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ book: selectedBook }),
        cache: "no-store",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to analyze book");
      }

      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const report = result?.bookReport;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="btn btnSecondary flex items-center gap-2"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
        Medical Books
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-12">
          <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-50">
                Medical Books
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-slate-200"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search Filter */}
            <div className="border-b border-white/10 px-6 py-4">
              <p className="mb-3 text-sm text-slate-400">
                Select a medical book to search for content related to the case&apos;s primary diagnosis:
              </p>
              <div className="grid gap-4 sm:grid-cols-1">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Book
                  </label>
                  {booksLoading ? (
                    <div className="flex items-center gap-2 py-2 text-sm text-slate-400">
                      <SpinnerIcon />
                      Loading books...
                    </div>
                  ) : books.length === 0 ? (
                    <p className="py-2 text-sm text-slate-500">
                      No books available. Add PDF books to the resources/books/ directory.
                    </p>
                  ) : (
                    <select
                      value={selectedBook}
                      onChange={(e) => handleBookChange(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    >
                      <option value="" className="bg-slate-800 text-slate-200">
                        Select a book...
                      </option>
                      {books.map((book) => (
                        <option key={book.filename} value={book.filename} className="bg-slate-800 text-slate-200">
                          {book.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              {books.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={handleSearch}
                    disabled={loading || !selectedBook}
                    className="btn btnPrimary flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <SpinnerIcon />
                        Analyzing Book...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Search
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>
              )}
              {result && !report && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
                  No relevant content found in this book for the case&apos;s primary diagnosis.
                </div>
              )}
              {report && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-400">
                    Found {report.pageCount} relevant pages ({report.pageRange}) in <em>{report.bookTitle}</em>.
                  </p>
                  <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-5">
                    <h3 className="text-base font-semibold text-sky-300">Diagnosis: {report.diagnosis}</h3>
                  </div>
                  <SectionBlock title="Summary" items={report.categories.summary} color="text-slate-100" />
                  <SectionBlock title="General Prevention" items={report.categories.prevention} color="text-emerald-300" />
                  <SectionBlock title="Diagnosis" items={report.categories.diagnosis} color="text-violet-300" />
                  <SectionBlock title="Treatment" items={report.categories.treatment} color="text-amber-300" />
                  <SectionBlock title="Additional Therapy" items={report.categories.additionalTherapy} color="text-teal-300" />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between border-t border-white/10 px-6 py-3">
              <div>
                {report && (
                  <div className="flex gap-2">
                    <button onClick={handleExportPdf} className="btn btnSecondary flex items-center gap-2 text-sm">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export to PDF
                    </button>
                    <button onClick={handleSimpleReport} className="btn btnSecondary flex items-center gap-2 text-sm">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Simple Report
                    </button>
                  </div>
                )}
              </div>
              <button onClick={() => setIsOpen(false)} className="btn btnSecondary text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

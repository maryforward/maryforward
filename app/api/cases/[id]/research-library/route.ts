import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readdir, readFile, stat } from "fs/promises";
import { join, resolve } from "path";

const PAPERS_DIR = resolve(process.cwd(), "resources", "papers");

// Same keyword regexes used by the PubMed research route
const preventionKeywords = /\bprevention\b|\bpreventive\b|\bprophyla\w+\b|\bvaccinat\w+\b|\bscreening\b|\brisk\s*reduc\w+\b/i;
const diagnosisKeywords = /\bdiagnos\w+\b|\bdetect\w+\b|\bbiomarker\b|\bimaging\b|\bpatholog\w+\b|\bbiopsy\b|\bstaging\b|\bprognos\w+\b/i;
const treatmentKeywords = /\btreat\w+\b|\btherap\w+\b|\bchemotherap\w+\b|\bsurger\w+\b|\bsurgical\b|\bradiat\w+\b|\bdrug\b|\bdosage\b|\bregimen\b|\bfirst.line\b|\bsecond.line\b/i;
const additionalTherapyKeywords = /\balternativ\w+\b|\bcomplement\w+\b|\bsupport\w+\s*care\b|\bpalliativ\w+\b|\brehabilitat\w+\b|\bimmunotherap\w+\b|\btargeted\s*therap\w+\b|\bgene\s*therap\w+\b|\bclinical\s*trial\b|\bnovel\b|\bemerging\b/i;

function folderNameToLabel(name: string): string {
  return name
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface ParsedPaper {
  filename: string;
  title: string;
  text: string;
}

async function parsePdf(filePath: string): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default;
  const buffer = await readFile(filePath);
  const result = await pdfParse(buffer);
  return result.text;
}

function extractTitle(filename: string, text: string): string {
  // Try to use the first meaningful line of the PDF as the title
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 10);
  if (lines.length > 0 && lines[0].length < 200) {
    return lines[0];
  }
  // Fallback: use the filename
  return filename.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");
}

/**
 * Extract the meaningful body text from a research paper PDF, skipping
 * front-matter (editors, dates, author affiliations, copyright notices).
 *
 * Strategy:
 * 1. Look for a labelled abstract section and start there.
 * 2. If no explicit label, skip lines that look like metadata and take
 *    the remaining text.
 */
function extractBodyText(fullText: string): string {
  // 1. Try to find an explicit "Abstract" section
  const abstractMatch = fullText.match(
    /\b(Abstract|ABSTRACT|Summary|SUMMARY)\s*[:\-—]?\s*/
  );
  if (abstractMatch && abstractMatch.index !== undefined) {
    return fullText.substring(abstractMatch.index).trim();
  }

  // 2. Try to find "Introduction" or "Background" section
  const introMatch = fullText.match(
    /\b(1\.\s*Introduction|INTRODUCTION|Background|BACKGROUND)\b/
  );
  if (introMatch && introMatch.index !== undefined) {
    return fullText.substring(introMatch.index).trim();
  }

  // 3. Fallback: skip metadata-heavy lines at the top.
  //    Metadata lines are typically short, contain emails, affiliations, dates.
  const lines = fullText.split("\n");
  const metadataRe = /^(Academic Editor|Received:|Revised:|Accepted:|Published:|Citation:|Copyright:|Licensee|Correspondence:|Tel\.:|https?:\/\/|@|MDPI|doi\.org)/i;
  const affiliationRe = /^(Department of|Division of|University of|College of|Hospital|Centre|Center|School of)/i;

  let startIdx = 0;
  for (let i = 0; i < Math.min(lines.length, 80); i++) {
    const line = lines[i].trim();
    if (!line) continue;
    // Keep skipping while lines are short metadata or match metadata patterns
    if (
      line.length < 15 ||
      metadataRe.test(line) ||
      (line.length < 120 && affiliationRe.test(line)) ||
      /^\d+$/.test(line) ||        // page numbers
      /^[*\d,]+$/.test(line)        // footnote markers
    ) {
      startIdx = i + 1;
      continue;
    }
    // Once we hit a long substantive line, stop skipping
    if (line.length > 150) break;
  }

  return lines.slice(startIdx).join("\n").trim();
}

/**
 * Extract clean sentences from paper body text, filtering out junk
 * (short fragments, emails, references, page numbers).
 */
function extractSentences(text: string): string[] {
  return text
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    // Remove common section headings used as inline labels
    .replace(
      /\b(BACKGROUND|OBJECTIVE|METHODS|RESULTS|CONCLUSIONS?|PURPOSE|AIMS?|INTRODUCTION|DESIGN|SETTING|PARTICIPANTS|MEASUREMENTS|MAIN OUTCOME MEASURES?|SIGNIFICANCE|CONTEXT|IMPORTANCE|OBSERVATIONS?)\s*:\s*/gi,
      ""
    )
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40 && s.length < 600);
}

/**
 * Pick the most relevant sentences for a given keyword regex.
 */
function pickRelevantSentences(sentences: string[], keyword: RegExp, max: number): string[] {
  const matching = sentences.filter((s) => keyword.test(s));
  return matching.length > 0 ? matching.slice(0, max) : sentences.slice(0, 1);
}

function categorizePapers(papers: ParsedPaper[], diseaseName: string) {
  const sections = {
    diseaseName,
    summary: [] as string[],
    generalPrevention: [] as string[],
    diagnosis: [] as string[],
    treatment: [] as string[],
    additionalTherapy: [] as string[],
  };

  const articles: {
    pmid: string;
    title: string;
    authors: string;
    journal: string;
    pubDate: string;
    abstract: string;
    categories: string[];
  }[] = [];

  for (const paper of papers) {
    // Extract the meaningful body text, skipping front-matter
    const bodyText = extractBodyText(paper.text);
    if (!bodyText) continue;

    // Use a generous portion for the article abstract sent to the client
    const abstract = bodyText.substring(0, 8000).trim();
    const sentences = extractSentences(abstract);

    if (sentences.length === 0) continue;

    // Summary: first 3 meaningful sentences from the paper
    const summarySnippet = sentences.slice(0, 3).join(" ");
    sections.summary.push(`**${paper.title}** — ${summarySnippet}`);

    // Categorize using the full body text for keyword matching,
    // but pull actual relevant sentences for each category
    const fullText = paper.text;
    let categorized = false;

    if (preventionKeywords.test(fullText)) {
      const picked = pickRelevantSentences(sentences, preventionKeywords, 3);
      sections.generalPrevention.push(`**${paper.title}** — ${picked.join(" ")}`);
      categorized = true;
    }
    if (diagnosisKeywords.test(fullText)) {
      const picked = pickRelevantSentences(sentences, diagnosisKeywords, 3);
      sections.diagnosis.push(`**${paper.title}** — ${picked.join(" ")}`);
      categorized = true;
    }
    if (treatmentKeywords.test(fullText)) {
      const picked = pickRelevantSentences(sentences, treatmentKeywords, 3);
      sections.treatment.push(`**${paper.title}** — ${picked.join(" ")}`);
      categorized = true;
    }
    if (additionalTherapyKeywords.test(fullText)) {
      const picked = pickRelevantSentences(sentences, additionalTherapyKeywords, 3);
      sections.additionalTherapy.push(`**${paper.title}** — ${picked.join(" ")}`);
      categorized = true;
    }
    if (!categorized) {
      sections.treatment.push(`**${paper.title}** — ${sentences.slice(0, 3).join(" ")}`);
    }

    // Build article object for report generation on the client side
    const categories: string[] = [];
    if (preventionKeywords.test(fullText)) categories.push("prevention");
    if (diagnosisKeywords.test(fullText)) categories.push("diagnosis");
    if (treatmentKeywords.test(fullText)) categories.push("treatment");
    if (additionalTherapyKeywords.test(fullText)) categories.push("additionalTherapy");
    if (categories.length === 0) categories.push("treatment");

    articles.push({
      pmid: "",
      title: paper.title,
      authors: "",
      journal: paper.filename,
      pubDate: "",
      abstract,
      categories,
    });
  }

  return { sections, articles };
}

// GET: List available disease folders
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, isApproved: true },
    });

    if (!user || user.role !== "CLINICIAN" || !user.isApproved) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify case is assigned
    const caseData = await prisma.case.findFirst({
      where: { id, assignedClinicianId: session.user.id },
      select: { id: true },
    });

    if (!caseData) {
      return NextResponse.json(
        { error: "Case not found or not assigned to you" },
        { status: 404 }
      );
    }

    // Read folder names from resources/papers/
    let entries: string[] = [];
    try {
      const dirEntries = await readdir(PAPERS_DIR, { withFileTypes: true });
      entries = dirEntries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
    } catch {
      // Directory may not exist yet
      entries = [];
    }

    const folders = await Promise.all(
      entries.map(async (name) => {
        const folderPath = join(PAPERS_DIR, name);
        const files = await readdir(folderPath);
        const pdfCount = files.filter((f) => f.toLowerCase().endsWith(".pdf")).length;
        return {
          name,
          label: folderNameToLabel(name),
          fileCount: pdfCount,
        };
      })
    );

    // Only return folders that have at least one PDF
    return NextResponse.json({
      folders: folders.filter((f) => f.fileCount > 0),
    });
  } catch (error) {
    console.error("Research library folders error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Parse PDFs from selected folder and generate categorized report
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, isApproved: true },
    });

    if (!user || user.role !== "CLINICIAN" || !user.isApproved) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const caseData = await prisma.case.findFirst({
      where: { id, assignedClinicianId: session.user.id },
      select: { primaryDiagnosis: true },
    });

    if (!caseData) {
      return NextResponse.json(
        { error: "Case not found or not assigned to you" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { folder } = body;

    if (!folder || typeof folder !== "string") {
      return NextResponse.json(
        { error: "Folder name is required" },
        { status: 400 }
      );
    }

    // Security: prevent directory traversal
    const folderPath = resolve(PAPERS_DIR, folder);
    if (!folderPath.startsWith(PAPERS_DIR)) {
      return NextResponse.json(
        { error: "Invalid folder" },
        { status: 400 }
      );
    }

    // Check folder exists
    try {
      const folderStat = await stat(folderPath);
      if (!folderStat.isDirectory()) {
        return NextResponse.json(
          { error: "Folder not found" },
          { status: 404 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Folder not found" },
        { status: 404 }
      );
    }

    // List PDF files in the folder
    const files = await readdir(folderPath);
    const pdfFiles = files.filter((f) => f.toLowerCase().endsWith(".pdf"));

    if (pdfFiles.length === 0) {
      return NextResponse.json({
        totalCount: 0,
        articles: [],
        sections: {
          diseaseName: folderNameToLabel(folder),
          summary: [],
          generalPrevention: [],
          diagnosis: [],
          treatment: [],
          additionalTherapy: [],
        },
      });
    }

    // Parse each PDF
    const papers: ParsedPaper[] = [];
    const errors: string[] = [];
    for (const file of pdfFiles) {
      try {
        const filePath = join(folderPath, file);
        const text = await parsePdf(filePath);
        const title = extractTitle(file, text);
        papers.push({ filename: file, title, text });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Failed to parse PDF ${file}:`, msg);
        errors.push(`${file}: ${msg}`);
      }
    }

    console.log(`Research library: parsed ${papers.length}/${pdfFiles.length} PDFs from "${folder}". Errors: ${errors.length}`);
    if (errors.length > 0) {
      console.error("Parse errors:", errors.slice(0, 5).join("; "));
    }

    if (papers.length === 0) {
      return NextResponse.json({
        totalCount: 0,
        articles: [],
        sections: {
          diseaseName: folderNameToLabel(folder),
          summary: [],
          generalPrevention: [],
          diagnosis: [],
          treatment: [],
          additionalTherapy: [],
        },
      });
    }

    const diseaseName = folderNameToLabel(folder);
    const { sections, articles } = categorizePapers(papers, diseaseName);

    return NextResponse.json({
      totalCount: papers.length,
      articles,
      sections,
    });
  } catch (error) {
    console.error("Research library error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

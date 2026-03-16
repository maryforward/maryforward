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
    const text = paper.text;
    // Use a meaningful portion of the document for summary and display
    const abstract = text.substring(0, 5000).trim();
    if (!abstract) continue;

    const displaySnippet = abstract.substring(0, 500) + (abstract.length > 500 ? "..." : "");
    const categorySnippet = abstract.substring(0, 300) + (abstract.length > 300 ? "..." : "");

    // Add to summary with full snippet
    sections.summary.push(`**${paper.title}** - ${displaySnippet}`);

    // Categorize — include a summary snippet in each category, not just the title
    let categorized = false;
    if (preventionKeywords.test(text)) {
      sections.generalPrevention.push(`**${paper.title}** - ${categorySnippet}`);
      categorized = true;
    }
    if (diagnosisKeywords.test(text)) {
      sections.diagnosis.push(`**${paper.title}** - ${categorySnippet}`);
      categorized = true;
    }
    if (treatmentKeywords.test(text)) {
      sections.treatment.push(`**${paper.title}** - ${categorySnippet}`);
      categorized = true;
    }
    if (additionalTherapyKeywords.test(text)) {
      sections.additionalTherapy.push(`**${paper.title}** - ${categorySnippet}`);
      categorized = true;
    }
    if (!categorized) {
      sections.treatment.push(`**${paper.title}** - ${categorySnippet}`);
    }

    // Build article object for Simple Report
    // Include categories so the client doesn't need to re-categorize with limited text
    const categories: string[] = [];
    if (preventionKeywords.test(text)) categories.push("prevention");
    if (diagnosisKeywords.test(text)) categories.push("diagnosis");
    if (treatmentKeywords.test(text)) categories.push("treatment");
    if (additionalTherapyKeywords.test(text)) categories.push("additionalTherapy");
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

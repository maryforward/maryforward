import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Allow up to 2 minutes for large PubMed batch fetches
export const maxDuration = 120;

const EUTILS_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

interface PubMedArticle {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  pubDate: string;
  abstract: string;
}

function buildSearchTerm(
  diagnosis: string,
  textAvailability: string,
  articleType: string
): string {
  const parts: string[] = [diagnosis];

  if (textAvailability === "hasabstract") {
    parts.push("hasabstract");
  } else if (textAvailability === "free full text") {
    parts.push("free full text[sb]");
  } else if (textAvailability === "full text") {
    parts.push("full text[sb]");
  }

  if (articleType) {
    parts.push(`${articleType}[pt]`);
  }

  return parts.join(" AND ");
}

function buildDateParams(publicationDate: string): string {
  if (!publicationDate) return "";

  const now = new Date();
  let mindate = "";
  const maxdate = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;

  switch (publicationDate) {
    case "1year":
      mindate = `${now.getFullYear() - 1}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;
      break;
    case "5years":
      mindate = `${now.getFullYear() - 5}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;
      break;
    case "10years":
      mindate = `${now.getFullYear() - 10}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;
      break;
    default:
      return "";
  }

  return `&datetype=pdat&mindate=${mindate}&maxdate=${maxdate}`;
}

function parseXmlValue(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : "";
}

function parseArticlesFromXml(xml: string): PubMedArticle[] {
  const articles: PubMedArticle[] = [];
  const articleBlocks = xml.split("<PubmedArticle>");

  for (let i = 1; i < articleBlocks.length; i++) {
    const block = articleBlocks[i];

    const pmid = parseXmlValue(block, "PMID");
    const title = parseXmlValue(block, "ArticleTitle").replace(/<[^>]+>/g, "");

    // Parse authors
    const authorMatches = block.match(/<LastName>([^<]+)<\/LastName>\s*<ForeName>([^<]+)<\/ForeName>/g) || [];
    const authors = authorMatches
      .slice(0, 5)
      .map((m) => {
        const last = m.match(/<LastName>([^<]+)<\/LastName>/)?.[1] || "";
        const fore = m.match(/<ForeName>([^<]+)<\/ForeName>/)?.[1] || "";
        return `${last} ${fore}`;
      })
      .join(", ");

    const journal = parseXmlValue(block, "Title");
    const year = parseXmlValue(block, "Year");
    const month = parseXmlValue(block, "Month");
    const pubDate = [year, month].filter(Boolean).join(" ");

    // Parse abstract
    const abstractMatch = block.match(/<Abstract>([\s\S]*?)<\/Abstract>/i);
    let abstract = "";
    if (abstractMatch) {
      const abstractTexts = abstractMatch[1].match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/gi) || [];
      abstract = abstractTexts
        .map((t) => {
          const labelMatch = t.match(/Label="([^"]+)"/i);
          const text = t.replace(/<[^>]+>/g, "").trim();
          return labelMatch ? `${labelMatch[1]}: ${text}` : text;
        })
        .join("\n");
    }

    if (pmid) {
      articles.push({ pmid, title, authors, journal, pubDate, abstract });
    }
  }

  return articles;
}

/**
 * Extract clean sentences from abstract text, filtering out junk.
 */
function extractSentences(text: string): string[] {
  return text
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .replace(
      /\b(BACKGROUND|OBJECTIVE|METHODS|RESULTS|CONCLUSIONS?|PURPOSE|AIMS?|INTRODUCTION|DESIGN|SETTING|PARTICIPANTS|MEASUREMENTS|MAIN OUTCOME MEASURES?|SIGNIFICANCE|CONTEXT|IMPORTANCE|OBSERVATIONS?)\s*:\s*/gi,
      ""
    )
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40 && s.length < 600);
}

/**
 * Pick the most relevant sentences for a keyword regex.
 */
function pickRelevantSentences(sentences: string[], keyword: RegExp, max: number): string[] {
  const matching = sentences.filter((s) => keyword.test(s));
  return matching.length > 0 ? matching.slice(0, max) : sentences.slice(0, 1);
}

function categorizeArticles(articles: PubMedArticle[], diagnosis: string) {
  const sections = {
    diseaseName: diagnosis,
    summary: [] as string[],
    generalPrevention: [] as string[],
    diagnosis: [] as string[],
    treatment: [] as string[],
    additionalTherapy: [] as string[],
  };

  const preventionKeywords = /\bprevention\b|\bpreventive\b|\bprophyla\w+\b|\bvaccinat\w+\b|\bscreening\b|\brisk\s*reduc\w+\b/i;
  const diagnosisKeywords = /\bdiagnos\w+\b|\bdetect\w+\b|\bbiomarker\b|\bimaging\b|\bpatholog\w+\b|\bbiopsy\b|\bstaging\b|\bprognos\w+\b/i;
  const treatmentKeywords = /\btreat\w+\b|\btherap\w+\b|\bchemotherap\w+\b|\bsurger\w+\b|\bsurgical\b|\bradiat\w+\b|\bdrug\b|\bdosage\b|\bregimen\b|\bfirst.line\b|\bsecond.line\b/i;
  const additionalTherapyKeywords = /\balternativ\w+\b|\bcomplement\w+\b|\bsupport\w+\s*care\b|\bpalliativ\w+\b|\brehabilitat\w+\b|\bimmunotherap\w+\b|\btargeted\s*therap\w+\b|\bgene\s*therap\w+\b|\bclinical\s*trial\b|\bnovel\b|\bemerging\b/i;

  for (const article of articles) {
    const text = `${article.title} ${article.abstract}`;
    const sentences = article.abstract ? extractSentences(article.abstract) : [];

    if (sentences.length === 0) continue;

    let categorized = false;

    if (preventionKeywords.test(text)) {
      const picked = pickRelevantSentences(sentences, preventionKeywords, 3);
      sections.generalPrevention.push(`**${article.title}** — ${picked.join(" ")} [PMID: ${article.pmid}]`);
      categorized = true;
    }
    if (diagnosisKeywords.test(text)) {
      const picked = pickRelevantSentences(sentences, diagnosisKeywords, 3);
      sections.diagnosis.push(`**${article.title}** — ${picked.join(" ")} [PMID: ${article.pmid}]`);
      categorized = true;
    }
    if (treatmentKeywords.test(text)) {
      const picked = pickRelevantSentences(sentences, treatmentKeywords, 3);
      sections.treatment.push(`**${article.title}** — ${picked.join(" ")} [PMID: ${article.pmid}]`);
      categorized = true;
    }
    if (additionalTherapyKeywords.test(text)) {
      const picked = pickRelevantSentences(sentences, additionalTherapyKeywords, 3);
      sections.additionalTherapy.push(`**${article.title}** — ${picked.join(" ")} [PMID: ${article.pmid}]`);
      categorized = true;
    }

    // Summary: first 3 meaningful sentences from the abstract
    const summarySnippet = sentences.slice(0, 3).join(" ");
    sections.summary.push(`**${article.title}** — ${summarySnippet} [PMID: ${article.pmid}]`);

    if (!categorized) {
      sections.treatment.push(`**${article.title}** — ${sentences.slice(0, 3).join(" ")} [PMID: ${article.pmid}]`);
    }
  }

  return sections;
}

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

    // Verify user is an approved clinician
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, isApproved: true },
    });

    if (!user || user.role !== "CLINICIAN" || !user.isApproved) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get case data
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
    const { publicationDate, textAvailability, articleType } = body;

    const diagnosis = caseData.primaryDiagnosis || "";
    if (!diagnosis) {
      return NextResponse.json(
        { error: "Case has no primary diagnosis to search for" },
        { status: 400 }
      );
    }

    // Step 1: Search PubMed (use history server for batched fetching)
    const searchTerm = buildSearchTerm(diagnosis, textAvailability, articleType);
    const dateParams = buildDateParams(publicationDate);
    const searchUrl = `${EUTILS_BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(searchTerm)}&retmax=0&retmode=json&usehistory=y&tool=maryforward&email=team@maryforward.com${dateParams}`;

    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      return NextResponse.json(
        { error: "Failed to search PubMed" },
        { status: 502 }
      );
    }

    const searchData = await searchRes.json();
    const totalCount = parseInt(searchData.esearchresult?.count || "0", 10);
    const webEnv = searchData.esearchresult?.webenv || "";
    const queryKey = searchData.esearchresult?.querykey || "";

    if (totalCount === 0 || !webEnv) {
      return NextResponse.json({
        totalCount: 0,
        articles: [],
        sections: {
          diseaseName: diagnosis,
          summary: [],
          generalPrevention: [],
          diagnosis: [],
          treatment: [],
          additionalTherapy: [],
        },
      });
    }

    // Step 2: Fetch article details in batches via WebEnv history server.
    // PubMed returns results sorted by relevance. We fetch up to MAX_ARTICLES
    // in batches of BATCH_SIZE to stay within rate limits.
    const MAX_ARTICLES = 500;
    const BATCH_SIZE = 200;
    const toFetch = Math.min(totalCount, MAX_ARTICLES);
    const articles: PubMedArticle[] = [];

    for (let retstart = 0; retstart < toFetch; retstart += BATCH_SIZE) {
      const batchMax = Math.min(BATCH_SIZE, toFetch - retstart);
      const fetchUrl = `${EUTILS_BASE}/efetch.fcgi?db=pubmed&query_key=${queryKey}&WebEnv=${encodeURIComponent(webEnv)}&retstart=${retstart}&retmax=${batchMax}&retmode=xml&tool=maryforward&email=team@maryforward.com`;

      const fetchRes = await fetch(fetchUrl);
      if (!fetchRes.ok) {
        console.error(`PubMed efetch batch failed at retstart=${retstart}: ${fetchRes.status}`);
        break; // Use whatever we have so far
      }

      const xmlData = await fetchRes.text();
      const batchArticles = parseArticlesFromXml(xmlData);
      articles.push(...batchArticles);

      console.log(`PubMed: fetched batch ${retstart}-${retstart + batchMax}, got ${batchArticles.length} articles (total so far: ${articles.length})`);

      // Respect PubMed rate limit (3 requests/sec without API key)
      if (retstart + BATCH_SIZE < toFetch) {
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
    }

    // Filter out articles with no abstract — they add nothing to the report
    const articlesWithContent = articles.filter((a) => a.abstract && a.abstract.trim().length > 50);
    console.log(`PubMed: ${articles.length} total fetched, ${articlesWithContent.length} have abstracts`);

    // Step 3: Categorize into sections
    const sections = categorizeArticles(articlesWithContent, diagnosis);

    return NextResponse.json({
      totalCount,
      articles: articlesWithContent,
      sections,
    });
  } catch (error) {
    console.error("Research papers error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

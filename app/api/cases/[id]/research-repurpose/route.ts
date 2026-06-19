import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import {
  fetchTrials,
  fetchPubMed,
  fetchBookExcerpt,
  type TrialDigest,
  type PubMedDigest,
  type BookDigest,
} from "@/lib/research-sources";

// Two diseases × three sources + a cross-over search + OpenAI synthesis is slow.
export const maxDuration = 300;

// ---------------------------------------------------------------------------
// Flat, globally-numbered source list. Every gathered item gets a single
// [n] reference so the model only ever has to cite one tag family.
// ---------------------------------------------------------------------------
type SourceKind = "trial" | "pubmed" | "book";
type SourceOrigin = "A" | "B" | "cross";

export interface RepurposeSource {
  ref: number; // 1-based global index
  kind: SourceKind;
  origin: SourceOrigin;
  title: string;
  detail: string; // status/phase/sponsor, or authors/journal/year, or pages
  url: string; // external link ("" for book)
  pmid?: string;
  nctId?: string;
  pages?: number[];
}

export interface RepurposeReport {
  diseaseA: string;
  diseaseB: string;
  conclusion: {
    verdict: string; // bottom-line assessment paragraph
    confidence: string; // "Low" | "Moderate" | "High"
    key_points: string[]; // 3-5 takeaways
    what_would_increase_confidence: string[]; // concrete evidence that would raise confidence
  };
  reasoning: string[]; // ordered chain-of-reasoning steps
  medical: {
    disease_a_treatments: string;
    disease_b_landscape: string;
    repurposing_rationale: string;
    existing_evidence: string;
    recommendations_cautions: string;
  };
  plain: {
    overview: string;
    treatments_for_first: string;
    why_might_help_second: string;
    research_so_far: string;
    cautions: string;
  };
  candidates: { name: string; rationale: string; evidence: string }[];
  sources: RepurposeSource[];
}

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are a clinical pharmacology and translational-medicine expert evaluating DRUG/TREATMENT REPURPOSING.

You are given source material about two diseases:
- Disease A (the SOURCE): the disease whose established and investigational treatments we want to evaluate.
- Disease B (the TARGET): the disease we want to know whether Disease A's treatments could benefit.

Your job: analyze, on the basis of the supplied sources and sound mechanistic reasoning, whether treatments used for Disease A might plausibly be beneficial for Disease B — i.e. a repurposing hypothesis. Focus on shared biological mechanisms, molecular targets, and pathways; existing cross-over evidence; and safety.

CRITICAL FRAMING — this is HYPOTHESIS-GENERATING decision support, NOT a treatment recommendation. Be rigorous and conservative. Never assert efficacy that the sources do not support. Where evidence is absent, say so explicitly and label the idea as theoretical. Flag safety concerns, contraindications, and the need for formal study.

LENGTH: the report should fill roughly 4-5 printed pages. Each medical section MINIMUM 220 words (target 300-380). Each plain-language section MINIMUM 200 words.

Produce a single JSON object with five parts:

1. "conclusion" — the bottom line, written first but reflecting your full analysis. An object:
   - verdict: ONE substantive paragraph (120-200 words) stating the overall assessment of whether Disease A's treatments could benefit Disease B — how promising the hypothesis is, what it rests on, and the single most important caveat. Be direct and honest; "the evidence does not support this" is a valid and valuable conclusion.
   - confidence: exactly one of "Low", "Moderate", or "High", assigned STRICTLY by this evidence rubric (judge by the evidence actually present in the SOURCES, not by a generic prior):
       • "High": direct clinical evidence — one or more controlled trials, or strong consistent observational data — that a Disease A treatment benefits Disease B.
       • "Moderate": a coherent, specific mechanistic rationale linking a Disease A treatment to a Disease B driver, AND at least some direct evidence in Disease B (preclinical studies, case reports/series, or an active/registered trial in Disease B).
       • "Low": a plausible mechanism but little or no direct evidence in Disease B, OR conflicting evidence, OR a safety signal arguing against it.
     Do NOT default to "Low" out of caution when the sources genuinely support "Moderate" or "High". Conversely, if a Disease A treatment is known to WORSEN Disease B, assign "Low" and state this explicitly.
   - key_points: an array of 3-5 short, concrete takeaway sentences a busy clinician could skim.
   - what_would_increase_confidence: an array of 3-5 concrete, specific things that — if found or carried out — would raise the confidence level (e.g., a named type of trial, a biomarker or mechanistic study, observational data in Disease B). This makes clear WHY the score is where it is and what is missing. Provide it whenever confidence is "Low" or "Moderate"; return an empty array only if confidence is "High".

2. "reasoning" — an array of 4-8 ordered strings that lay out the explicit chain of logic connecting Disease A's treatments to the conclusion about Disease B. Each step should be one clear sentence (you may cite sources with [n]). Walk from "what treats Disease A and how it works" → "what drives Disease B" → "where the mechanisms overlap or diverge" → "what evidence exists" → "what this implies". This is the explanation of HOW you reached the conclusion — make the logic transparent and easy to follow.

3. "medical" — for the treating clinician, professional terminology. Five sections:
   - disease_a_treatments: the principal established and emerging treatments for Disease A, with mechanisms of action / molecular targets.
   - disease_b_landscape: Disease B pathophysiology, current standard of care, and unmet needs that a repurposed therapy might address.
   - repurposing_rationale: the mechanistic bridge — which Disease A treatments act on targets/pathways relevant to Disease B, and why that could (or could not) translate. Be specific about mechanism.
   - existing_evidence: any trials, case reports, or literature (especially cross-over sources) that already examine Disease A treatments in Disease B or related contexts; grade the strength (preclinical / case report / observational / RCT / none found).
   - recommendations_cautions: which candidates, if any, merit further investigation; safety considerations, contraindications, drug interactions, and explicit evidence gaps. End by stating this requires formal clinical evaluation.

4. "plain" — for the patient/family, everyday language, short sentences. Five sections:
   - overview: what the two diseases are and what "repurposing a treatment" means, in plain words.
   - treatments_for_first: the main treatments used for Disease A.
   - why_might_help_second: why some of those treatments might (or might not) help Disease B — the idea behind it.
   - research_so_far: what studies, if any, have looked at this, in friendly terms.
   - cautions: honest, reassuring caveats — that this is an idea to discuss with their care team, not proven, and why caution matters.

5. "candidates" — an array (may be empty) of the most plausible repurposing candidates, each: { "name": "treatment name", "rationale": "one-sentence mechanistic reason", "evidence": "one of: Theoretical | Preclinical | Case reports | Observational | Clinical trials" }. List at most 6, strongest first.

Citation rules: cite sources inline using [1], [2], [1, 3] referencing the numbered SOURCES list. Cite naturally and frequently where a claim rests on a source. Do not invent sources or citation numbers beyond those provided.

Keep "conclusion.verdict", "reasoning", and "key_points" consistent with the detailed sections — the conclusion must follow from the reasoning, which must follow from the evidence.

Separate paragraphs with blank lines. Return ONLY valid JSON of this exact shape:
{
  "conclusion": { "verdict": "...", "confidence": "Low | Moderate | High", "key_points": ["...", "..."], "what_would_increase_confidence": ["...", "..."] },
  "reasoning": ["...", "..."],
  "medical": { "disease_a_treatments": "...", "disease_b_landscape": "...", "repurposing_rationale": "...", "existing_evidence": "...", "recommendations_cautions": "..." },
  "plain": { "overview": "...", "treatments_for_first": "...", "why_might_help_second": "...", "research_so_far": "...", "cautions": "..." },
  "candidates": [ { "name": "...", "rationale": "...", "evidence": "..." } ]
}`;

function originLabel(origin: SourceOrigin, diseaseA: string, diseaseB: string): string {
  if (origin === "A") return `Disease A: ${diseaseA}`;
  if (origin === "B") return `Disease B: ${diseaseB}`;
  return "Cross-over (both diseases)";
}

function buildUserPrompt(
  diseaseA: string,
  diseaseB: string,
  sources: RepurposeSource[],
  trialById: Map<number, TrialDigest>,
  pubmedById: Map<number, PubMedDigest>,
  bookById: Map<number, BookDigest>,
): string {
  const parts: string[] = [
    `Disease A (SOURCE of treatments): ${diseaseA}`,
    `Disease B (TARGET to evaluate): ${diseaseB}`,
    "",
    "=== SOURCES ===",
  ];

  for (const s of sources) {
    const tag = `[${s.ref}] (${originLabel(s.origin, diseaseA, diseaseB)} · ${
      s.kind === "trial" ? "Clinical Trial" : s.kind === "pubmed" ? "PubMed" : "Reference Text"
    })`;
    if (s.kind === "trial") {
      const t = trialById.get(s.ref)!;
      parts.push(`${tag} ${t.title}`);
      parts.push(`   Status: ${t.status} | Phase: ${t.phase} | Sponsor: ${t.sponsor}`);
      if (t.conditions.length) parts.push(`   Conditions: ${t.conditions.slice(0, 6).join(", ")}`);
      if (t.interventions.length) parts.push(`   Interventions: ${t.interventions.join("; ")}`);
      if (t.briefSummary) parts.push(`   Summary: ${t.briefSummary.substring(0, 900)}`);
    } else if (s.kind === "pubmed") {
      const p = pubmedById.get(s.ref)!;
      parts.push(`${tag} ${p.title}`);
      parts.push(`   ${[p.authors, p.journal, p.year].filter(Boolean).join(" — ")}`);
      parts.push(`   Abstract: ${p.abstract.substring(0, 1100)}`);
    } else {
      const b = bookById.get(s.ref)!;
      parts.push(`${tag} ${b.title} (pages ${b.pages.join(", ")})`);
      parts.push(`   Excerpt: ${b.excerpt.substring(0, 6000)}`);
    }
    parts.push("");
  }

  return parts.join("\n");
}

interface AiResponse {
  conclusion: RepurposeReport["conclusion"];
  reasoning: RepurposeReport["reasoning"];
  medical: RepurposeReport["medical"];
  plain: RepurposeReport["plain"];
  candidates: RepurposeReport["candidates"];
}

// ---------------------------------------------------------------------------
// Search-term expansion — improves recall so the synthesis sees the evidence
// that actually exists. For each disease we gather synonyms, abbreviations,
// and (critically) the names of associated clinical syndromes that share a
// literature (e.g. HTLV-1 → "HTLV-1-associated myelopathy", "HAM/TSP",
// "tropical spastic paraparesis"). We also extract Disease A's principal
// treatments so we can search for them directly within Disease B.
// ---------------------------------------------------------------------------
export interface SearchExpansion {
  aliasesA: string[];
  aliasesB: string[];
  treatmentsA: string[];
}

const EXPANSION_PROMPT = `You are a biomedical search strategist. For two diseases, produce terms that MAXIMIZE recall on PubMed and ClinicalTrials.gov.

For each disease, list search aliases: the full name, common abbreviations, alternative spellings/hyphenations, and — importantly — the names of the principal CLINICAL SYNDROMES or manifestations that share a literature with it (e.g. for "HTLV-1" include "HTLV-1-associated myelopathy", "HAM/TSP", "tropical spastic paraparesis"; for a cancer include major subtypes).

Also list Disease A's principal established and investigational TREATMENTS as generic drug names or specific drug classes (these will be searched directly against Disease B to find repurposing evidence).

Use only accepted medical terminology; do NOT invent drugs or conditions. Return ONLY JSON:
{ "aliasesA": ["..."], "aliasesB": ["..."], "treatmentsA": ["..."] }
Provide 4-8 aliases per disease and 5-10 treatments for Disease A.`;

function uniqClean(values: unknown, limit: number): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (typeof v !== "string") continue;
    const t = v.trim();
    const key = t.toLowerCase();
    if (t && !seen.has(key)) {
      seen.add(key);
      out.push(t);
    }
    if (out.length >= limit) break;
  }
  return out;
}

async function expandSearchTerms(diseaseA: string, diseaseB: string): Promise<SearchExpansion> {
  const fallback: SearchExpansion = { aliasesA: [diseaseA], aliasesB: [diseaseB], treatmentsA: [] };
  if (!process.env.OPENAI_API_KEY) return fallback;
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 600,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: EXPANSION_PROMPT },
        { role: "user", content: `Disease A: ${diseaseA}\nDisease B: ${diseaseB}` },
      ],
    });
    const content = resp.choices[0]?.message?.content?.trim();
    if (!content) return fallback;
    const parsed = JSON.parse(content) as Record<string, unknown>;
    // Always keep the user's original terms first.
    const aliasesA = uniqClean([diseaseA, ...(Array.isArray(parsed.aliasesA) ? parsed.aliasesA : [])], 8);
    const aliasesB = uniqClean([diseaseB, ...(Array.isArray(parsed.aliasesB) ? parsed.aliasesB : [])], 8);
    const treatmentsA = uniqClean(parsed.treatmentsA, 10);
    return {
      aliasesA: aliasesA.length ? aliasesA : [diseaseA],
      aliasesB: aliasesB.length ? aliasesB : [diseaseB],
      treatmentsA,
    };
  } catch (err) {
    console.error("research-repurpose: term expansion failed, using raw terms:", err instanceof Error ? err.message : err);
    return fallback;
  }
}

/** OR-join phrases for PubMed / ClinicalTrials Essie syntax, each quoted. */
function orJoin(terms: string[]): string {
  return terms
    .filter(Boolean)
    .map((t) => `"${t.replace(/"/g, "")}"`)
    .join(" OR ");
}

async function synthesize(userPrompt: string): Promise<AiResponse> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.chat.completions.create({
    // Pinned gpt-4o snapshot (not -mini) for the synthesis: deeper mechanistic
    // reasoning about shared pathways/targets and more reliable evidence-tier
    // confidence grading. Pinned for reproducibility — bump deliberately. The
    // cheap term-expansion step stays on gpt-4o-mini.
    model: "gpt-4o-2024-11-20",
    temperature: 0.2,
    max_tokens: 10000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) throw new Error("OpenAI returned empty response");
  const parsed = JSON.parse(content) as Partial<AiResponse>;

  const emptyMedical: RepurposeReport["medical"] = {
    disease_a_treatments: "",
    disease_b_landscape: "",
    repurposing_rationale: "",
    existing_evidence: "",
    recommendations_cautions: "",
  };
  const emptyPlain: RepurposeReport["plain"] = {
    overview: "",
    treatments_for_first: "",
    why_might_help_second: "",
    research_so_far: "",
    cautions: "",
  };
  const emptyConclusion: RepurposeReport["conclusion"] = {
    verdict: "",
    confidence: "Low",
    key_points: [],
    what_would_increase_confidence: [],
  };
  const rawConclusion: Partial<RepurposeReport["conclusion"]> = parsed.conclusion || {};
  return {
    conclusion: {
      ...emptyConclusion,
      ...rawConclusion,
      key_points: Array.isArray(rawConclusion.key_points) ? rawConclusion.key_points : [],
      what_would_increase_confidence: Array.isArray(rawConclusion.what_would_increase_confidence)
        ? rawConclusion.what_would_increase_confidence
        : [],
    },
    reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning.filter((s) => typeof s === "string") : [],
    medical: { ...emptyMedical, ...(parsed.medical || {}) },
    plain: { ...emptyPlain, ...(parsed.plain || {}) },
    candidates: Array.isArray(parsed.candidates) ? parsed.candidates.slice(0, 6) : [],
  };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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
      return NextResponse.json({ error: "Case not found or not assigned to you" }, { status: 404 });
    }

    const body = await request.json();
    const diseaseA: string = (body.diseaseA || "").trim();
    // Disease B (the target) defaults to the case's primary diagnosis.
    const diseaseB: string = (body.diseaseB || caseData.primaryDiagnosis || "").trim();
    const includeTrials = body.includeTrials !== false;
    const includePubMed = body.includePubMed !== false;
    const includeBook = body.includeBook !== false;

    if (!diseaseA || !diseaseB) {
      return NextResponse.json(
        { error: "Both Disease A (treatment source) and Disease B (target) are required." },
        { status: 400 },
      );
    }
    if (diseaseA.toLowerCase() === diseaseB.toLowerCase()) {
      return NextResponse.json(
        { error: "The two diseases must be different." },
        { status: 400 },
      );
    }

    console.log(`research-repurpose: A="${diseaseA}" B="${diseaseB}" trials=${includeTrials} pubmed=${includePubMed} book=${includeBook}`);

    // Expand each disease into aliases + the associated syndromes that share a
    // literature, plus Disease A's principal treatments — so the searches reach
    // the evidence that actually exists (e.g. HTLV-1 → HAM/TSP).
    const expansion = await expandSearchTerms(diseaseA, diseaseB);
    const orA = orJoin(expansion.aliasesA);
    const orB = orJoin(expansion.aliasesB);
    const orTreatments = orJoin(expansion.treatmentsA);
    console.log(
      `research-repurpose: expanded A=[${expansion.aliasesA.join(", ")}] B=[${expansion.aliasesB.join(", ")}] treatmentsA=[${expansion.treatmentsA.join(", ")}]`,
    );

    // Gather everything in parallel. The cross-over searches (literature with
    // BOTH diseases, and trials/papers testing Disease A's treatments in
    // Disease B) are what surface real repurposing evidence.
    const [
      trialsA,
      trialsB,
      trialsTxCross,
      pubmedA,
      pubmedB,
      pubmedCross,
      pubmedTxCross,
      bookA,
      bookB,
    ] = await Promise.all([
      includeTrials ? fetchTrials(diseaseA, 12).catch(() => []) : Promise.resolve([] as TrialDigest[]),
      includeTrials ? fetchTrials(diseaseB, 10).catch(() => []) : Promise.resolve([] as TrialDigest[]),
      // Trials in Disease B that test any of Disease A's treatments.
      includeTrials && orTreatments
        ? fetchTrials(diseaseB, 10, orTreatments).catch(() => [])
        : Promise.resolve([] as TrialDigest[]),
      includePubMed
        ? fetchPubMed(`(${orA}) AND (treatment OR therapy OR management OR drug)`, 12).catch(() => [])
        : Promise.resolve([] as PubMedDigest[]),
      includePubMed ? fetchPubMed(`(${orB})`, 10).catch(() => []) : Promise.resolve([] as PubMedDigest[]),
      // Literature mentioning both diseases.
      includePubMed ? fetchPubMed(`(${orA}) AND (${orB})`, 10).catch(() => []) : Promise.resolve([] as PubMedDigest[]),
      // Disease A's treatments studied in Disease B — the key repurposing signal.
      includePubMed && orTreatments
        ? fetchPubMed(`(${orTreatments}) AND (${orB})`, 10).catch(() => [])
        : Promise.resolve([] as PubMedDigest[]),
      includeBook ? fetchBookExcerpt(diseaseA).catch(() => null) : Promise.resolve(null),
      includeBook ? fetchBookExcerpt(diseaseB).catch(() => null) : Promise.resolve(null),
    ]);

    // Assign global reference numbers in a stable order and build lookup maps.
    // De-duplicate across the overlapping searches by PMID / NCT id.
    const sources: RepurposeSource[] = [];
    const trialById = new Map<number, TrialDigest>();
    const pubmedById = new Map<number, PubMedDigest>();
    const bookById = new Map<number, BookDigest>();
    const seenNct = new Set<string>();
    const seenPmid = new Set<string>();
    let ref = 0;

    const addTrials = (trials: TrialDigest[], origin: SourceOrigin) => {
      for (const t of trials) {
        if (t.nctId && seenNct.has(t.nctId)) continue;
        if (t.nctId) seenNct.add(t.nctId);
        ref += 1;
        trialById.set(ref, t);
        sources.push({
          ref,
          kind: "trial",
          origin,
          title: t.title,
          detail: [t.status, t.phase, t.sponsor].filter(Boolean).join(" · "),
          url: t.url,
          nctId: t.nctId,
        });
      }
    };
    const addPubMed = (articles: PubMedDigest[], origin: SourceOrigin) => {
      for (const p of articles) {
        if (p.pmid && seenPmid.has(p.pmid)) continue;
        if (p.pmid) seenPmid.add(p.pmid);
        ref += 1;
        pubmedById.set(ref, p);
        const author = p.authors ? p.authors.split(",")[0] + " et al." : "Unknown";
        sources.push({
          ref,
          kind: "pubmed",
          origin,
          title: p.title,
          detail: `${author} — ${p.journal} ${p.year}`.trim(),
          url: p.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${p.pmid}/` : "",
          pmid: p.pmid,
        });
      }
    };
    const addBook = (book: BookDigest | null, origin: SourceOrigin) => {
      if (!book) return;
      ref += 1;
      bookById.set(ref, book);
      sources.push({
        ref,
        kind: "book",
        origin,
        title: book.title,
        detail: `pages ${book.pages.join(", ")}`,
        url: "",
        pages: book.pages,
      });
    };

    // Order: Disease A first (treatments), then the cross-over evidence
    // (most relevant to repurposing), then Disease B background.
    addTrials(trialsA, "A");
    addPubMed(pubmedA, "A");
    addBook(bookA, "A");
    addPubMed(pubmedTxCross, "cross");
    addPubMed(pubmedCross, "cross");
    addTrials(trialsTxCross, "cross");
    addTrials(trialsB, "B");
    addPubMed(pubmedB, "B");
    addBook(bookB, "B");

    const crossCount = sources.filter((s) => s.origin === "cross").length;
    console.log(
      `research-repurpose: gathered ${sources.length} unique sources (cross-over=${crossCount}) from A(trials=${trialsA.length},pubmed=${pubmedA.length}) cross(txPubmed=${pubmedTxCross.length},pubmed=${pubmedCross.length},txTrials=${trialsTxCross.length}) B(trials=${trialsB.length},pubmed=${pubmedB.length})`,
    );

    if (sources.length === 0) {
      return NextResponse.json(
        { error: "No source material found for either disease from the selected sources." },
        { status: 404 },
      );
    }

    const userPrompt = buildUserPrompt(diseaseA, diseaseB, sources, trialById, pubmedById, bookById);
    const ai = await synthesize(userPrompt);

    const report: RepurposeReport = {
      diseaseA,
      diseaseB,
      conclusion: ai.conclusion,
      reasoning: ai.reasoning,
      medical: ai.medical,
      plain: ai.plain,
      candidates: ai.candidates,
      sources,
    };

    return NextResponse.json(report);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("research-repurpose error:", msg);
    return NextResponse.json({ error: msg || "Internal server error" }, { status: 500 });
  }
}

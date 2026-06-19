import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Allow up to 2 minutes for large trial searches
export const maxDuration = 120;

const CT_API_BASE = "https://clinicaltrials.gov/api/v2";

export interface ClinicalTrial {
  nctId: string;
  title: string;
  officialTitle: string;
  status: string;
  phase: string;
  studyType: string;
  briefSummary: string;
  conditions: string[];
  interventions: string[];
  sponsor: string;
  startDate: string;
  completionDate: string;
  enrollment: number;
  locations: string[];
  eligibility: {
    criteria: string;
    sex: string;
    minAge: string;
    maxAge: string;
  };
  url: string;
}

function buildApiUrl(params: {
  condition: string;
  intervention: string;
  location: string;
  otherTerms: string;
  status: string[];
  phase: string[];
  studyType: string;
  sex: string;
  ageGroup: string[];
  funderType: string[];
  studyResults: string;
  pageSize: number;
  pageToken?: string;
}): string {
  const url = new URL(`${CT_API_BASE}/studies`);

  if (params.condition) url.searchParams.set("query.cond", params.condition);
  if (params.intervention) url.searchParams.set("query.intr", params.intervention);
  if (params.location) url.searchParams.set("query.locn", params.location);
  if (params.otherTerms) url.searchParams.set("query.term", params.otherTerms);

  // Status filter
  if (params.status.length > 0) {
    url.searchParams.set("filter.overallStatus", params.status.join(","));
  }

  // Phase filter
  if (params.phase.length > 0) {
    url.searchParams.set("filter.phase", params.phase.join(","));
  }

  // Study type — mapped to aggFilters
  if (params.studyType) {
    url.searchParams.set("filter.advanced", `SEARCH[Location](AREA[LocationStatus]${params.studyType})`);
  }

  // Sex filter — via aggFilters
  if (params.sex && params.sex !== "all") {
    url.searchParams.set("query.term",
      [params.otherTerms, `AREA[EligibilityCriteria]${params.sex}`].filter(Boolean).join(" AND ")
    );
  }

  // Age group filter
  if (params.ageGroup.length > 0) {
    // ClinicalTrials.gov API doesn't have a direct age group filter.
    // Use aggFilters: ages format
    const ageMap: Record<string, string> = {
      child: "child",
      adult: "adult",
      older_adult: "older_adult",
    };
    const mapped = params.ageGroup.map(a => ageMap[a]).filter(Boolean);
    if (mapped.length > 0) {
      url.searchParams.set("aggFilters", `ages:${mapped.join(",")}`);
    }
  }

  // Funder type
  if (params.funderType.length > 0) {
    const existing = url.searchParams.get("aggFilters") || "";
    const funderStr = `funderType:${params.funderType.join(",")}`;
    url.searchParams.set("aggFilters", [existing, funderStr].filter(Boolean).join(","));
  }

  // Study results
  if (params.studyResults === "with") {
    const existing = url.searchParams.get("aggFilters") || "";
    url.searchParams.set("aggFilters", [existing, "results:with"].filter(Boolean).join(","));
  } else if (params.studyResults === "without") {
    const existing = url.searchParams.get("aggFilters") || "";
    url.searchParams.set("aggFilters", [existing, "results:without"].filter(Boolean).join(","));
  }

  url.searchParams.set("pageSize", String(params.pageSize));
  url.searchParams.set("countTotal", "true");

  if (params.pageToken) {
    url.searchParams.set("pageToken", params.pageToken);
  }

  return url.toString();
}

function parseTrialFromApi(study: Record<string, unknown>): ClinicalTrial {
  const proto = study.protocolSection as Record<string, unknown> | undefined;
  if (!proto) {
    return {
      nctId: "",
      title: "",
      officialTitle: "",
      status: "",
      phase: "",
      studyType: "",
      briefSummary: "",
      conditions: [],
      interventions: [],
      sponsor: "",
      startDate: "",
      completionDate: "",
      enrollment: 0,
      locations: [],
      eligibility: { criteria: "", sex: "", minAge: "", maxAge: "" },
      url: "",
    };
  }

  const ident = proto.identificationModule as Record<string, unknown> | undefined;
  const statusModule = proto.statusModule as Record<string, unknown> | undefined;
  const designModule = proto.designModule as Record<string, unknown> | undefined;
  const descModule = proto.descriptionModule as Record<string, unknown> | undefined;
  const condModule = proto.conditionsModule as Record<string, unknown> | undefined;
  const armsModule = proto.armsInterventionsModule as Record<string, unknown> | undefined;
  const sponsorModule = proto.sponsorCollaboratorsModule as Record<string, unknown> | undefined;
  const eligModule = proto.eligibilityModule as Record<string, unknown> | undefined;
  const contactsModule = proto.contactsLocationsModule as Record<string, unknown> | undefined;

  const nctId = (ident?.nctId as string) || "";

  // Parse interventions
  const interventionsList = (armsModule?.interventions as Array<Record<string, unknown>>) || [];
  const interventions = interventionsList.map(
    (i) => `${i.type || ""}: ${i.name || ""}`.trim()
  );

  // Parse locations (first 5)
  const locationsList = (contactsModule?.locations as Array<Record<string, unknown>>) || [];
  const locations = locationsList.slice(0, 5).map((loc) => {
    const parts = [loc.facility, loc.city, loc.state, loc.country].filter(Boolean);
    return parts.join(", ");
  });

  // Parse start/completion dates
  const startDateStruct = statusModule?.startDateStruct as Record<string, unknown> | undefined;
  const completionDateStruct = statusModule?.completionDateStruct as Record<string, unknown> | undefined;

  // Parse enrollment
  const enrollmentInfo = designModule?.enrollmentInfo as Record<string, unknown> | undefined;

  // Parse phases
  const phases = (designModule?.phases as string[]) || [];

  return {
    nctId,
    title: (ident?.briefTitle as string) || "",
    officialTitle: (ident?.officialTitle as string) || "",
    status: (statusModule?.overallStatus as string) || "",
    phase: phases.join(", ") || "N/A",
    studyType: (designModule?.studyType as string) || "",
    briefSummary: (descModule?.briefSummary as string) || "",
    conditions: (condModule?.conditions as string[]) || [],
    interventions,
    sponsor: ((sponsorModule?.leadSponsor as Record<string, unknown>)?.name as string) || "",
    startDate: (startDateStruct?.date as string) || "",
    completionDate: (completionDateStruct?.date as string) || "",
    enrollment: (enrollmentInfo?.count as number) || 0,
    locations,
    eligibility: {
      criteria: (eligModule?.eligibilityCriteria as string) || "",
      sex: (eligModule?.sex as string) || "",
      minAge: (eligModule?.minimumAge as string) || "",
      maxAge: (eligModule?.maximumAge as string) || "",
    },
    url: `https://clinicaltrials.gov/study/${nctId}`,
  };
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
    const {
      condition,
      intervention = "",
      location = "",
      otherTerms = "",
      status = [],
      phase = [],
      studyType = "",
      sex = "",
      ageGroup = [],
      funderType = [],
      studyResults = "",
    } = body;

    // Use case diagnosis as default condition if none provided
    const searchCondition = condition || caseData.primaryDiagnosis || "";
    if (!searchCondition) {
      return NextResponse.json(
        { error: "No condition specified and case has no primary diagnosis" },
        { status: 400 }
      );
    }

    // Fetch all results in batches of 1000 (API max page size).
    // Uses cursor-based pagination via nextPageToken.
    const BATCH_SIZE = 1000;
    const MAX_TRIALS = 5000; // Safety cap
    const allTrials: ClinicalTrial[] = [];
    let totalCount = 0;
    let pageToken: string | undefined;
    let batchNum = 0;

    do {
      const apiUrl = buildApiUrl({
        condition: searchCondition,
        intervention,
        location,
        otherTerms,
        status,
        phase,
        studyType,
        sex,
        ageGroup,
        funderType,
        studyResults,
        pageSize: BATCH_SIZE,
        pageToken,
      });

      if (batchNum === 0) console.log("ClinicalTrials.gov API URL:", apiUrl);

      const response = await fetch(apiUrl, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`ClinicalTrials.gov API error (batch ${batchNum}):`, response.status, errText);
        if (batchNum === 0) {
          return NextResponse.json(
            { error: "Failed to search ClinicalTrials.gov" },
            { status: 502 }
          );
        }
        break; // Use whatever we have so far
      }

      const data = await response.json();

      if (batchNum === 0) {
        totalCount = data.totalCount || 0;
      }

      const studies = (data.studies || []) as Record<string, unknown>[];
      const batchTrials = studies.map(parseTrialFromApi).filter((t) => t.nctId);
      allTrials.push(...batchTrials);

      console.log(`ClinicalTrials.gov: batch ${batchNum}, got ${batchTrials.length} trials (total so far: ${allTrials.length}/${totalCount})`);

      pageToken = data.nextPageToken || undefined;
      batchNum++;

      // Respect rate limit (10 requests/sec) — wait 150ms between batches
      if (pageToken && allTrials.length < MAX_TRIALS) {
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    } while (pageToken && allTrials.length < MAX_TRIALS);

    console.log(`ClinicalTrials.gov: ${totalCount} total, fetched ${allTrials.length} trials`);

    return NextResponse.json({
      totalCount,
      trials: allTrials,
    });
  } catch (error) {
    console.error("Clinical trials search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

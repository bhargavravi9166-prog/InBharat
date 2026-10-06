import { Router, type IRouter, type Request } from "express";
import {
  CreateHeritageSpotBody,
  CreateHeritageSpotResponse,
  GetHeritageSummaryResponse,
  ListHeritageSpotsQueryParams,
  ListHeritageSpotsResponse,
  ListVillagesQueryParams,
  ListVillagesResponse,
  UpvoteHeritageSpotParams,
  UpvoteHeritageSpotResponse,
  type HeritageSpot,
  type HeritageSummary,
  type Village,
} from "@workspace/api-zod";
import {
  createLocalSpot,
  getLocalSpots,
  getLocalVillages,
  rememberRemoteSpots,
  rememberRemoteVillages,
  upvoteLocalSpot,
} from "./heritage-fallback";

const router: IRouter = Router();
const spotsTable = "local_spots";
const villagesTable = "villages";
const SUPABASE_RETRY_DELAY_MS = 30_000;
let supabaseOfflineUntil = 0;

type Row = Record<string, unknown>;

class SupabaseRequestError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
  }
}

async function withOfflineFallback<T>(
  req: Request,
  liveRequest: () => Promise<T>,
  fallback: () => T,
): Promise<T> {
  if (Date.now() < supabaseOfflineUntil) return fallback();
  try {
    const result = await liveRequest();
    supabaseOfflineUntil = 0;
    return result;
  } catch (error) {
    const shouldLog = Date.now() >= supabaseOfflineUntil;
    supabaseOfflineUntil = Date.now() + SUPABASE_RETRY_DELAY_MS;
    if (shouldLog) {
      req.log.warn(
        { reason: error instanceof Error ? error.message : "unknown Supabase error" },
        "Supabase unavailable; serving local heritage data",
      );
    }
    return fallback();
  }
}

function supabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new SupabaseRequestError(
      "Supabase is not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY.",
      503,
    );
  }
  return { url, key };
}

async function supabaseRequest(path: string, init: RequestInit = {}): Promise<unknown> {
  const { url, key } = supabaseConfig();
  let response: Response;
  try {
    response = await fetch(`${url}/rest/v1/${path}`, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(1_500),
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new SupabaseRequestError(
      "Could not reach Supabase. Check the project URL and network availability.",
      502,
    );
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = text;
    }
  }
  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null && "message" in payload
        ? String(payload.message)
        : `Supabase returned HTTP ${response.status}.`;
    throw new SupabaseRequestError(message, response.status);
  }
  return payload;
}

function stringValue(row: Row, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return fallback;
}

function nullableString(row: Row, keys: string[]): string | null {
  return stringValue(row, keys, "") || null;
}

function numberValue(row: Row, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return fallback;
}

function asRows(value: unknown): Row[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (row): row is Row => typeof row === "object" && row !== null && !Array.isArray(row),
  );
}

function mapSpot(row: Row): HeritageSpot {
  const nestedVillage =
    typeof row.villages === "object" && row.villages !== null
      ? (row.villages as Row)
      : {};
  return {
    id: stringValue(row, ["id"]),
    title: stringValue(row, ["title", "spot_title", "name"], "Untitled spot"),
    villageName: stringValue(
      row,
      ["village_name", "villageName", "village"],
      stringValue(nestedVillage, ["name"], "Village"),
    ),
    district: stringValue(row, ["district"], stringValue(nestedVillage, ["district"], "India")),
    state: stringValue(row, ["state"], stringValue(nestedVillage, ["state"], "India")),
    category: stringValue(row, ["category"], "Heritage"),
    description: nullableString(row, ["description"]),
    imageUrl: nullableString(row, ["image_url", "imageUrl", "photo_url"]),
    upvotes: Math.max(0, Math.round(numberValue(row, ["upvotes", "votes"]))),
    latitude:
      row.latitude === null || row.latitude === undefined
        ? null
        : numberValue(row, ["latitude"], Number.NaN),
    longitude:
      row.longitude === null || row.longitude === undefined
        ? null
        : numberValue(row, ["longitude"], Number.NaN),
  };
}

function mapVillage(row: Row): Village {
  return {
    id: stringValue(row, ["id", "slug", "name"]),
    name: stringValue(row, ["name", "village_name", "village"]),
    district: stringValue(row, ["district"], "India"),
    state: stringValue(row, ["state"], "India"),
    tehsil: nullableString(row, ["tehsil", "subdistrict"]),
    description: nullableString(row, ["description"]),
    imageUrl: nullableString(row, ["image_url", "imageUrl", "photo_url"]),
    spotCount: 0,
  };
}

function queryString(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

async function loadSpots(limit = 100): Promise<HeritageSpot[]> {
  const query = queryString({
    select: "*",
    order: "created_at.desc",
    limit: "1000",
  });
  const result = await supabaseRequest(`${spotsTable}?${query}`);
  return rememberRemoteSpots(asRows(result).map(mapSpot)).slice(0, limit);
}

async function loadVillages(): Promise<Village[]> {
  const query = queryString({ select: "*", order: "name.asc", limit: "1000" });
  const result = await supabaseRequest(`${villagesTable}?${query}`);
  return rememberRemoteVillages(asRows(result).map(mapVillage));
}

function villageKey(village: Pick<Village, "name" | "district" | "state">): string {
  return `${village.name.toLocaleLowerCase()}|${village.district.toLocaleLowerCase()}|${village.state.toLocaleLowerCase()}`;
}

function combineVillages(villages: Village[], spots: HeritageSpot[]): Village[] {
  const unique = new Map(villages.map((village) => [villageKey(village), village]));
  for (const spot of spots) {
    const village: Village = {
      id: `${spot.villageName}|${spot.district}|${spot.state}`,
      name: spot.villageName,
      district: spot.district,
      state: spot.state,
      tehsil: null,
      description: null,
      imageUrl: null,
      spotCount: 0,
    };
    if (!unique.has(villageKey(village))) unique.set(villageKey(village), village);
  }
  const counts = new Map<string, number>();
  for (const spot of spots) {
    const key = villageKey({ name: spot.villageName, district: spot.district, state: spot.state });
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(unique.entries())
    .map(([key, village]) => ({ ...village, spotCount: counts.get(key) ?? 0 }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function sendFailure(res: Parameters<Parameters<IRouter["get"]>[1]>[1], error: unknown) {
  if (error instanceof SupabaseRequestError) {
    res.status(error.status === 502 ? 503 : error.status).json({ error: error.message });
    return;
  }
  res.status(500).json({ error: "The heritage data request could not be completed." });
}

router.get("/heritage/spots", async (req, res) => {
  const parsed = ListHeritageSpotsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid spot search parameters." });
    return;
  }
  try {
    const { category, search, limit } = parsed.data;
    const terms = search?.trim().toLocaleLowerCase();
    const categoryFilter = category?.trim().toLocaleLowerCase();
    const rows = await withOfflineFallback(req, () => loadSpots(1000), getLocalSpots);
    const searchableVillages = terms
      ? await withOfflineFallback(req, loadVillages, getLocalVillages)
      : [];
    const matchingVillageKeys = new Set(
      searchableVillages
        .filter((village) =>
          [village.name, village.district, village.state, village.tehsil ?? ""]
            .join(" ")
            .toLocaleLowerCase()
            .includes(terms ?? ""),
        )
        .map(villageKey),
    );
    const spots = rows
      .filter((spot) => !categoryFilter || spot.category.toLocaleLowerCase() === categoryFilter)
      .filter(
        (spot) =>
          !terms ||
          [spot.title, spot.villageName, spot.district, spot.state, spot.category]
            .join(" ")
            .toLocaleLowerCase()
            .includes(terms) ||
          matchingVillageKeys.has(villageKey(spot)),
      )
      .slice(0, limit ?? 24);
    res.json(ListHeritageSpotsResponse.parse(spots));
  } catch (error) {
    sendFailure(res, error);
  }
});

router.post("/heritage/spots", async (req, res) => {
  const parsed = CreateHeritageSpotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Check the required spot details and try again." });
    return;
  }
  try {
    const body = parsed.data;
    const row = {
      title: body.title,
      village_name: body.villageName,
      district: body.district,
      state: body.state,
      category: body.category,
      description: body.description ?? null,
      image_url: body.imageUrl ?? null,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      upvotes: 0,
    };
    const created = await withOfflineFallback(
      req,
      async () => {
        const result = await supabaseRequest(spotsTable, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify(row),
        });
        const saved = asRows(result)[0];
        if (!saved) throw new SupabaseRequestError("Supabase returned no saved spot.", 502);
        return CreateHeritageSpotResponse.parse(mapSpot(saved));
      },
      () => CreateHeritageSpotResponse.parse(createLocalSpot(body)),
    );
    res.status(201).json(created);
  } catch (error) {
    sendFailure(res, error);
  }
});

router.post("/heritage/spots/:spotId/upvote", async (req, res) => {
  const parsed = UpvoteHeritageSpotParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid spot identifier." });
    return;
  }
  try {
    const updated = await withOfflineFallback<HeritageSpot | null>(
      req,
      async () => {
        const result = await supabaseRequest("rpc/increment_local_spot_upvotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ p_spot_id: parsed.data.spotId }),
        });
        const row = Array.isArray(result) ? asRows(result)[0] : result;
        if (typeof row !== "object" || row === null || Array.isArray(row)) return null;
        return UpvoteHeritageSpotResponse.parse(mapSpot(row as Row));
      },
      () => upvoteLocalSpot(parsed.data.spotId),
    );
    if (!updated) {
      res.status(404).json({ error: "This place is no longer available to upvote." });
      return;
    }
    res.json(updated);
  } catch (error) {
    sendFailure(res, error);
  }
});

router.get("/villages", async (req, res) => {
  const parsed = ListVillagesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid village search parameters." });
    return;
  }
  try {
    const { search, limit } = parsed.data;
    const [villages, spots] = await Promise.all([
      withOfflineFallback(req, loadVillages, getLocalVillages),
      withOfflineFallback(req, () => loadSpots(1000), getLocalSpots),
    ]);
    const terms = search?.trim().toLocaleLowerCase();
    const results = combineVillages(villages, spots)
      .filter(
        (village) =>
          !terms ||
          [village.name, village.district, village.state, village.tehsil ?? ""]
            .join(" ")
            .toLocaleLowerCase()
            .includes(terms),
      )
      .slice(0, limit ?? 40);
    res.json(ListVillagesResponse.parse(results));
  } catch (error) {
    sendFailure(res, error);
  }
});

router.get("/heritage/summary", async (req, res) => {
  try {
    const [spots, villages] = await Promise.all([
      withOfflineFallback(req, () => loadSpots(1000), getLocalSpots),
      withOfflineFallback(req, loadVillages, getLocalVillages),
    ]);
    const summary: HeritageSummary = {
      spotCount: spots.length,
      villageCount: combineVillages(villages, spots).length,
      totalUpvotes: spots.reduce((total, spot) => total + spot.upvotes, 0),
    };
    res.json(GetHeritageSummaryResponse.parse(summary));
  } catch (error) {
    sendFailure(res, error);
  }
});

export default router;

import type { EfhubStatKey, PlayerBoostContext } from "./progression.js";

type EfhubBoostSide = "left" | "right";

type EfhubBoostRequest = {
  id: number;
  side: EfhubBoostSide;
};

type RawEfhubBoost = {
  id: number;
  name: string;
  stats: Record<string, number>;
};

type RawEfhubBoostFile = {
  left?: RawEfhubBoost[];
  right?: RawEfhubBoost[];
};

type EfhubBoost = PlayerBoostContext & {
  side: EfhubBoostSide;
};

let cachedBoosts: EfhubBoost[] | null = null;

const fallbackBoosts: EfhubBoost[] = [
  {
    id: 4,
    side: "left",
    name: "Technique +2",
    stats: {
      ballControl: 2,
      dribbling: 2,
      tightPossession: 2,
      lowPass: 2
    }
  }
];

export async function getEfhubBoosts(requests: EfhubBoostRequest[]) {
  const uniqueRequests = requests.filter(
    (request, index, list) =>
      request.id > 0 &&
      list.findIndex((item) => item.id === request.id && item.side === request.side) === index
  );

  if (uniqueRequests.length === 0) {
    return [];
  }

  const boosts = await loadEfhubBoosts();

  return uniqueRequests
    .map((request) => findBoost(boosts, request))
    .filter((boost): boost is EfhubBoost => boost !== null);
}

async function loadEfhubBoosts() {
  if (cachedBoosts) {
    return cachedBoosts;
  }

  try {
    const response = await fetch("https://efhub.com/data/boosts.json", {
      headers: {
        "User-Agent": "Hubball/0.1 local importer"
      }
    });

    if (!response.ok) {
      throw new Error(`EFHub boosts ${response.status}`);
    }

    const payload = (await response.json()) as RawEfhubBoostFile;
    cachedBoosts = [
      ...normalizeBoosts(payload.left ?? [], "left"),
      ...normalizeBoosts(payload.right ?? [], "right")
    ];
  } catch {
    cachedBoosts = fallbackBoosts;
  }

  return cachedBoosts;
}

function normalizeBoosts(boosts: RawEfhubBoost[], side: EfhubBoostSide) {
  return boosts.map((boost) => ({
    id: boost.id,
    side,
    name: boost.name,
    stats: normalizeStats(boost.stats)
  }));
}

function normalizeStats(stats: Record<string, number>) {
  return Object.fromEntries(
    Object.entries(stats)
      .filter(([, value]) => Number.isFinite(value) && value !== 0)
      .map(([key, value]) => [key, value])
  ) as Partial<Record<EfhubStatKey, number>>;
}

function findBoost(boosts: EfhubBoost[], request: EfhubBoostRequest) {
  const exactMatch = boosts.find((boost) => boost.id === request.id && boost.side === request.side);

  if (exactMatch) {
    return exactMatch;
  }

  return boosts.find((boost) => boost.id === request.id) ?? null;
}

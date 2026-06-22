export type EfhubSearchResult = {
  id: string;
  name: string;
  team: string;
  position: string;
  overall: number;
  playingStyle: string;
  imageUrl: string;
  playerType?: number;
  sourceUrl: string;
};

type EfhubPublicPlayer = {
  id: string | number;
  name: string;
  team?: string;
  position?: string;
  overallRating?: number;
  playingStyle?: string;
  imageUrl?: string;
  playerType?: number;
};

type EfhubPublicPlayersResponse = {
  players?: EfhubPublicPlayer[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
};

let efhubCookie: string | null = null;

export async function searchEfhubPlayers(query: string, options: { limit?: number; page?: number } = {}) {
  const normalizedQuery = query.trim();
  const limit = options.limit ?? 24;
  const page = options.page ?? 1;

  if (normalizedQuery.length < 2) {
    return {
      players: [],
      total: 0,
      page,
      limit,
      totalPages: 0
    };
  }

  const result = await fetchEfhubPlayers(normalizedQuery, limit, page);

  const players = (result.players ?? []).slice(0, limit).map(toSearchResult);

  return {
    players,
    total: Number(result.total ?? result.players?.length ?? 0),
    page: Number(result.page ?? 1),
    limit,
    totalPages: Number(result.totalPages ?? 1)
  };
}

export async function listTopEfhubPlayers(
  options: { concurrency?: number; delayMs?: number; pages?: number; target?: number } = {}
) {
  const target = Math.min(Math.max(options.target ?? (options.pages ? options.pages * 24 : 10000), 24), 10000);
  const requestedPages = Math.ceil(target / 24);
  const concurrency = Math.min(Math.max(options.concurrency ?? 2, 1), 4);
  const delayMs = Math.max(options.delayMs ?? 220, 0);
  const players: EfhubSearchResult[] = [];
  const seen = new Set<string>();
  const firstResult = await fetchEfhubPlayers("", 24, 1);
  const total = Number(firstResult.total ?? 0);
  const totalPages = Number(firstResult.totalPages ?? requestedPages);
  const pages = Math.min(requestedPages, totalPages || requestedPages);
  const pageResults: EfhubPublicPlayersResponse[] = [firstResult];
  let nextPage = 2;

  async function worker() {
    while (nextPage <= pages) {
      const page = nextPage;
      nextPage += 1;
      pageResults.push(await fetchEfhubPlayers("", 24, page));
      if (delayMs > 0) {
        await sleep(delayMs);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, pages) }, worker));

  for (const result of pageResults) {
    for (const player of (result.players ?? []).map(toSearchResult)) {
      if (!seen.has(player.id)) {
        seen.add(player.id);
        players.push(player);
      }
    }
  }

  return {
    players: players.slice(0, target),
    total,
    page: 1,
    limit: Math.min(players.length, target),
    scannedPages: pages,
    totalPages
  };
}

async function fetchEfhubPlayers(query: string, limit: number, page: number, didRefreshCookie = false, retryCount = 0) {
  const cookie = await getEfhubCookie();
  const params = new URLSearchParams({
    search: query,
    limit: String(limit),
    page: String(page)
  });
  const response = await fetch(`https://efhub.com/api/public/players?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      Cookie: cookie,
      Referer: "https://efhub.com/players",
      "User-Agent": "Hubball/0.1 local EFHub search"
    }
  });

  if (response.status === 403 && !didRefreshCookie) {
    efhubCookie = null;
    return fetchEfhubPlayers(query, limit, page, true);
  }

  if (response.status === 429 && retryCount < 5) {
    await sleep(1200 * (retryCount + 1));
    return fetchEfhubPlayers(query, limit, page, didRefreshCookie, retryCount + 1);
  }

  if (!response.ok) {
    throw new Error(`Busca do EFHub falhou (${response.status}).`);
  }

  return (await response.json()) as EfhubPublicPlayersResponse;
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function getEfhubCookie() {
  if (efhubCookie) {
    return efhubCookie;
  }

  const response = await fetch("https://efhub.com/api/auth/token", {
    headers: {
      Referer: "https://efhub.com/players",
      "User-Agent": "Hubball/0.1 local EFHub search"
    }
  });
  const setCookie = response.headers.get("set-cookie");
  const cookie = setCookie?.split(";")[0];

  if (!response.ok || !cookie) {
    throw new Error("Nao consegui abrir sessao de busca no EFHub.");
  }

  efhubCookie = cookie;
  return efhubCookie;
}

function toSearchResult(player: EfhubPublicPlayer): EfhubSearchResult {
  const id = String(player.id);

  return {
    id,
    name: player.name,
    team: player.team ?? "Nao informado",
    position: translatePosition(player.position ?? ""),
    overall: Number(player.overallRating ?? 0),
    playingStyle: player.playingStyle ?? "Nao informado",
    imageUrl: player.imageUrl ?? `https://efimg.com/efootballhub22/images/player_cards/${id}_l.png`,
    playerType: player.playerType,
    sourceUrl: `https://efhub.com/players/${id}`
  };
}

function translatePosition(position: string) {
  const labels: Record<string, string> = {
    GK: "GO",
    CB: "ZC",
    LB: "LE",
    RB: "LD",
    LWB: "ALE",
    RWB: "ALD",
    DMF: "VOL",
    CMF: "MLG",
    LMF: "MLE",
    RMF: "MLD",
    AMF: "MAT",
    LWF: "PTE",
    RWF: "PTD",
    SS: "SA",
    CF: "CA"
  };

  return labels[position] ?? position;
}

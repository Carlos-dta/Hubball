import cors from "cors";
import express from "express";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  deleteMyCard,
  findMyCardByPlayerId,
  getStoredPlayer,
  loadMyCards,
  loadPersistedPlayers,
  saveMyCard,
  upsertPlayerCard
} from "./db.js";
import { players, type PlayerCard } from "./data/players.js";
import { importPlayerFromEfhubLink } from "./efhubImport.js";
import { listTopEfhubPlayers, searchEfhubPlayers, type EfhubSearchResult } from "./efhubSearch.js";

type MyCard = {
  id: string;
  playerId: string;
  nickname?: string;
  level?: number;
  customNotes?: string;
  addedAt: string;
};

const app = express();
const port = Number(process.env.PORT ?? 3333);
let myCards: MyCard[] = loadMyCards();

const bestLineupCandidateSlots = [
  { positions: ["PTE", "CA", "SA", "MLE"], limit: 24 },
  { positions: ["CA", "SA"], limit: 28 },
  { positions: ["PTD", "SA", "MLD"], limit: 24 },
  { positions: ["MAT", "SA", "MLG", "MLE", "MLD"], limit: 28 },
  { positions: ["MLG", "MAT", "VOL", "MLE", "MLD"], limit: 34 },
  { positions: ["VOL", "MLG", "ZC"], limit: 26 },
  { positions: ["LE", "ALE"], limit: 22 },
  { positions: ["ZC", "VOL"], limit: 32 },
  { positions: ["LD", "ALD"], limit: 22 },
  { positions: ["GO"], limit: 20 }
];

app.use(cors());
app.use(express.json({ limit: "1mb" }));

for (const persistedPlayer of loadPersistedPlayers()) {
  upsertCachedPlayer(persistedPlayer, { persist: false });
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, app: "Hubball API" });
});

app.get("/api/players", (req, res) => {
  const search = String(req.query.search ?? "").trim().toLowerCase();
  const position = String(req.query.position ?? "").trim().toLowerCase();

  const result = players.filter((player) => {
    const matchesSearch =
      !search ||
      [player.name, player.version, player.club, player.nationality, player.playStyle]
        .join(" ")
        .toLowerCase()
        .includes(search);

    const matchesPosition = !position || player.position.toLowerCase() === position;

    return matchesSearch && matchesPosition;
  });

  res.json(result);
});

app.get("/api/players/:id", (req, res) => {
  const player = players.find((item) => item.id === req.params.id);

  if (!player) {
    res.status(404).json({ message: "Jogador nao encontrado." });
    return;
  }

  res.json(player);
});

app.get("/api/efhub/search", async (req, res) => {
  const query = String(req.query.q ?? req.query.search ?? "");
  const limit = Number(req.query.limit ?? 12);
  const page = Number(req.query.page ?? 1);

  try {
    res.json(
      await searchEfhubPlayers(query, {
        limit: Math.min(Math.max(limit, 1), 24),
        page: Math.max(page, 1)
      })
    );
  } catch (error) {
    res.status(502).json({ message: getErrorMessage(error) });
  }
});

app.get("/api/efhub/best-players", async (req, res) => {
  const requestedScan = Number(req.query.scan ?? 10000);
  const requestedPages = Number(req.query.pages ?? 0);
  const target = requestedPages > 0 ? requestedPages * 24 : requestedScan;

  try {
    const topList = await listTopEfhubPlayers({
      concurrency: 2,
      delayMs: 260,
      target: Math.min(Math.max(target, 480), 10000)
    });
    const candidates = selectBestEfhubCandidates(topList.players);
    const importedPlayers = await importEfhubCandidateCards(candidates);

    res.json({
      players: importedPlayers,
      candidates: candidates.length,
      scanned: topList.players.length,
      scannedPages: topList.scannedPages
    });
  } catch (error) {
    res.status(502).json({ message: getErrorMessage(error) });
  }
});

app.get("/api/my-cards", (_req, res) => {
  res.json(hydrateMyCards());
});

app.post("/api/my-cards", (req, res) => {
  const { playerId, nickname, level, customNotes } = req.body as Partial<MyCard>;

  if (!playerId || !players.some((player) => player.id === playerId)) {
    res.status(400).json({ message: "playerId invalido." });
    return;
  }

  const alreadyAdded = myCards.some((card) => card.playerId === playerId);
  if (alreadyAdded) {
    res.status(409).json({ message: "Essa carta ja esta na sua colecao." });
    return;
  }

  const card: MyCard = {
    id: randomUUID(),
    playerId,
    nickname,
    level,
    customNotes,
    addedAt: new Date().toISOString()
  };

  saveMyCard(card);
  myCards = [card, ...myCards];
  res.status(201).json(hydrateMyCard(card));
});

app.delete("/api/my-cards/:id", (req, res) => {
  const before = myCards.length;
  const removedFromDatabase = deleteMyCard(req.params.id);
  myCards = myCards.filter((card) => card.id !== req.params.id);

  if (!removedFromDatabase && myCards.length === before) {
    res.status(404).json({ message: "Carta nao encontrada na colecao." });
    return;
  }

  res.status(204).send();
});

app.post("/api/exports/chatgpt", (req, res) => {
  const { formation, objective } = req.body as { formation?: string; objective?: string };
  const collection = hydrateMyCards();

  const prompt = buildChatGptPrompt(collection, {
    formation: formation?.trim() || "a melhor formacao para esse elenco",
    objective: objective?.trim() || "montar o melhor time, banco e prioridades de treino"
  });

  res.json({
    count: collection.length,
    prompt
  });
});

app.post("/api/import/efhub-link", async (req, res) => {
  const { url } = req.body as { url?: string };

  if (!url) {
    res.status(400).json({ message: "Envie um link valido do EFHub/eFootballHub." });
    return;
  }

  try {
    const importedPlayer = await importPlayerFromEfhubLink(url);
    upsertCachedPlayer(importedPlayer);

    const existingCard = myCards.find((card) => card.playerId === importedPlayer.id) ?? findMyCardByPlayerId(importedPlayer.id);
    const card =
      existingCard ??
      ({
        id: randomUUID(),
        playerId: importedPlayer.id,
        addedAt: new Date().toISOString()
      } satisfies MyCard);

    if (!existingCard) {
      saveMyCard(card);
      myCards = [card, ...myCards];
    } else if (!myCards.some((item) => item.id === existingCard.id)) {
      myCards = [existingCard, ...myCards];
    }

    res.status(existingCard ? 200 : 201).json({
      status: existingCard ? "updated" : "imported",
      message: existingCard
        ? `${importedPlayer.name} atualizado com dados do EFHub.`
        : `${importedPlayer.name} importado e adicionado na sua colecao.`,
      player: importedPlayer,
      card: hydrateMyCard(card)
    });
  } catch (error) {
    res.status(422).json({ message: getErrorMessage(error) });
  }
});

const clientDistPath = path.join(process.cwd(), "dist");
const clientIndexPath = path.join(clientDistPath, "index.html");

if (existsSync(clientIndexPath)) {
  app.use(express.static(clientDistPath));
  app.get("*", (_req, res) => {
    res.sendFile(clientIndexPath);
  });
}

app.listen(port, () => {
  console.log(`Hubball API running on http://localhost:${port}`);
});

function hydrateMyCards() {
  return myCards.map(hydrateMyCard).filter(isHydratedCard);
}

function hydrateMyCard(card: MyCard) {
  const player = players.find((item) => item.id === card.playerId) ?? getStoredPlayer(card.playerId);

  if (!player) {
    return null;
  }

  return {
    ...card,
    player
  };
}

function isHydratedCard(card: ReturnType<typeof hydrateMyCard>): card is MyCard & { player: PlayerCard } {
  return card !== null;
}

function selectBestEfhubCandidates(results: EfhubSearchResult[]) {
  const selected = new Map<string, EfhubSearchResult>();
  const filteredResults = results
    .filter(isBestLineupCandidate)
    .sort((first, second) => second.overall - first.overall);

  for (const slot of bestLineupCandidateSlots) {
    const matchingPlayers = filteredResults
      .filter((player) => slot.positions.includes(player.position))
      .slice(0, slot.limit);

    for (const player of matchingPlayers) {
      selected.set(player.id, player);
    }
  }

  for (const player of filteredResults.slice(0, 80)) {
    selected.set(player.id, player);
  }

  return [...selected.values()].slice(0, 220);
}

function isBestLineupCandidate(player: EfhubSearchResult) {
  const team = player.team.trim().toLowerCase();
  const hasGenericTeam = team === "team blue" || team === "team yellow" || team === "nao informado";
  const hasUsableOverall = player.overall >= 90 && player.overall <= 110;

  return Boolean(player.id && player.name && player.position && hasUsableOverall && !hasGenericTeam);
}

async function importEfhubCandidateCards(candidates: EfhubSearchResult[]) {
  const importedPlayers: PlayerCard[] = [];
  const failedIds = new Set<string>();
  const concurrency = 6;
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < candidates.length) {
      const candidate = candidates[nextIndex];
      nextIndex += 1;

      try {
        const cachedPlayer = players.find((player) => player.id === candidate.id);
        const importedPlayer = cachedPlayer?.maxAttributes
          ? cachedPlayer
          : await importPlayerFromEfhubLink(candidate.sourceUrl);
        upsertCachedPlayer(importedPlayer);
        importedPlayers.push(importedPlayer);
      } catch {
        failedIds.add(candidate.id);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));

  if (importedPlayers.length === 0 && failedIds.size > 0) {
    throw new Error("Nao consegui importar as cartas fortes do EFHub agora.");
  }

  return importedPlayers.sort((first, second) => second.maxOverall - first.maxOverall);
}

function upsertCachedPlayer(player: PlayerCard, options: { persist?: boolean } = {}) {
  const existingIndex = players.findIndex((item) => item.id === player.id);

  if (existingIndex >= 0) {
    players.splice(existingIndex, 1, player);
  } else {
    players.unshift(player);
  }

  if (options.persist !== false) {
    upsertPlayerCard(player);
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Nao consegui importar esse link agora.";
}

function buildChatGptPrompt(
  cards: Array<MyCard & { player: PlayerCard }>,
  options: { formation: string; objective: string }
) {
  const lines = cards.map(({ player, level, customNotes }, index) => {
    const analysisAttributes = player.maxAttributes ?? player.attributes;
    const topAttributes = Object.entries(analysisAttributes)
      .flatMap(([group, values]) =>
        Object.entries(values).map(([name, value]) => ({ group, name, value }))
      )
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
      .map((item) => `${item.name} ${item.value}`)
      .join(", ");

    return [
      `${index + 1}. ${player.name} - ${player.version}`,
      `Posicao principal: ${player.position} | Overall base/max: ${player.overall}/${player.maxOverall} | Estilo: ${player.playStyle}`,
      `Dados fisicos: ${player.height}cm, ${player.weight}kg, ${player.age} anos, pe ${player.foot}, condicao ${player.condition}`,
      `Clube/selecao: ${player.club} | Nacionalidade: ${player.nationality}`,
      `Posicoes base: ${formatPositionRatings(player.positions)}`,
      player.maxPositions ? `Posicoes MAX: ${formatPositionRatings(player.maxPositions)}` : "",
      `Build analisada: ${player.maxBuild ? `MAX nivel ${player.maxBuild.levelCap}, pontos ${player.maxBuild.pointsUsed}/${player.maxBuild.totalPoints}` : "base"}`,
      player.maxBuild ? `Sliders MAX: ${formatSliders(player.maxBuild.sliders)}` : "",
      player.maxBuild?.overallWithoutManager
        ? `Overall MAX sem tecnico: ${player.maxBuild.overallWithoutManager}`
        : "",
      player.maxBuild?.playerBoosts?.length
        ? `Boosters da carta na build MAX: ${player.maxBuild.playerBoosts.join("; ")}`
        : "",
      player.maxBuild?.manager
        ? `Tecnico considerado: ${player.maxBuild.manager.name}, ${player.maxBuild.manager.playstyle} ${player.maxBuild.manager.skillValue}, boosts: ${player.maxBuild.manager.boosts.join(", ")}`
        : "Tecnico considerado: nao informado",
      `Melhores atributos da build analisada: ${topAttributes}`,
      `Atributos base completos:\n${formatAttributes(player.attributes)}`,
      player.maxAttributes ? `Atributos MAX completos:\n${formatAttributes(player.maxAttributes)}` : "",
      `Habilidades: ${player.skills.join(", ")}`,
      `Boosters: ${player.boosters.length > 0 ? player.boosters.join(", ") : "nenhum"}`,
      player.sourceUrl ? `Link EFHub: ${player.sourceUrl}` : "",
      `Nivel/treino atual: ${level ?? "nao informado"}`,
      `Observacoes: ${customNotes || player.notes}`
    ].filter(Boolean).join("\n");
  });

  return [
    "Quero que voce atue como analista avancado de elenco no eFootball.",
    `Objetivo: ${options.objective}.`,
    `Formacao desejada: ${options.formation}.`,
    "",
    "Analise sinergia, titulares, banco, pontos fracos, jogadores redundantes, melhores funcoes por posicao e prioridades de evolucao.",
    "Quando houver conflito entre overall e encaixe tatico, explique qual escolha faz mais sentido.",
    "",
    `Minha colecao tem ${cards.length} carta(s):`,
    "",
    lines.join("\n\n")
  ].join("\n");
}

function formatAttributes(attributes: PlayerCard["attributes"]) {
  return Object.entries(attributes)
    .map(([group, values]) => {
      const stats = Object.entries(values)
        .map(([name, value]) => `${name} ${value}`)
        .join(", ");

      return `${group}: ${stats}`;
    })
    .join("\n");
}

function formatPositionRatings(positions: PlayerCard["positions"]) {
  const order = ["PTE", "CA", "PTD", "SA", "MAT", "MLE", "MLG", "MLD", "VOL", "LE", "ZC", "LD", "GO"];
  const knownPositions = order
    .filter((position) => positions[position] !== undefined)
    .map((position) => `${position} ${positions[position]}`);
  const otherPositions = Object.entries(positions)
    .filter(([position]) => !order.includes(position))
    .map(([position, value]) => `${position} ${value}`);

  return [...knownPositions, ...otherPositions].join(", ");
}

function formatSliders(sliders: Record<string, number>) {
  const labels: Record<string, string> = {
    shooting: "Chute",
    passing: "Passe",
    dribbling: "Drible",
    dexterity: "Destreza",
    lowerBodyStrength: "Forca inferior",
    aerialStrength: "Jogo aereo",
    defending: "Defesa",
    gk1: "Goleiro 1",
    gk2: "Goleiro 2",
    gk3: "Goleiro 3"
  };

  const activeSliders = Object.entries(sliders)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => `${labels[key] ?? key} ${value}`);

  return activeSliders.length > 0 ? activeSliders.join(", ") : "sem pontos distribuidos";
}

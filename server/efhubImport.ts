import type { PlayerAttributeGroup, PlayerCard } from "./data/players.js";
import { getEfhubBoosts } from "./efhubBoosts.js";
import {
  calculateMaxProgressionBuild,
  computePositionRatings,
  type EfhubStatKey,
  type EfhubStats,
  type PlayerBoostContext
} from "./progression.js";
import { selectedManager } from "./selectedManager.js";

type EfhubPlayer = {
  id: string;
  name: string;
  team?: string;
  league?: string;
  position: string;
  playingStyle?: string;
  overallRating: number;
  age?: number;
  height?: number;
  weight?: number;
  preferredFoot?: "Left" | "Right";
  weakFootAccuracy?: number;
  condition?: number;
  form?: number;
  boostId?: number;
  levelCap?: number;
  skills?: string[] | string;
  imageUrl?: string;
};

type EfhubAdditionalPosition = {
  position: string;
  familiarity: number;
};

const statLabels: Record<string, string> = {
  offensiveAwareness: "Talento ofensivo",
  ballControl: "Controle de bola",
  dribbling: "Drible",
  tightPossession: "Conducao firme",
  lowPass: "Passe rasteiro",
  loftedPass: "Passe alto",
  finishing: "Finalizacao",
  heading: "Cabecada",
  setPieceTaking: "Bola parada",
  curl: "Curva",
  speed: "Velocidade",
  acceleration: "Aceleracao",
  kickingPower: "Forca do chute",
  jump: "Impulsao",
  physicalContact: "Contato fisico",
  balance: "Equilibrio",
  stamina: "Resistencia",
  defensiveAwareness: "Talento defensivo",
  ballWinning: "Combatendo",
  trackingBack: "Envolvimento defensivo",
  aggression: "Agressividade",
  gkAwareness: "Goleiro",
  gkCatching: "Encaixe GR",
  gkClearing: "Espalmada GR",
  gkReflexes: "Reflexos",
  gkReach: "Alcance"
};

const attributeGroups: Record<PlayerAttributeGroup, EfhubStatKey[]> = {
  Ataque: ["offensiveAwareness", "finishing", "heading", "setPieceTaking", "curl"],
  Passe: ["lowPass", "loftedPass"],
  Drible: ["ballControl", "dribbling", "tightPossession", "balance"],
  Defesa: ["defensiveAwareness", "ballWinning", "trackingBack", "aggression"],
  Atletismo: ["speed", "acceleration", "kickingPower", "jump", "physicalContact", "stamina"],
  Goleiro: ["gkAwareness", "gkCatching", "gkClearing", "gkReflexes", "gkReach"]
};

const conditionMap: Record<number, string> = {
  1: "E",
  2: "D",
  3: "C",
  4: "B",
  5: "A"
};

const positionLabels: Record<string, string> = {
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

const skillLabels: Record<string, string> = {
  acrobaticClearance: "Acrobatic Clearance",
  acrobaticFinishing: "Acrobatic Finishing",
  aerialSuperiority: "Aerial Superiority",
  blocker: "Blocker",
  captaincy: "Captaincy",
  chipShotControl: "Chip Shot Control",
  cutBehindAndTurn: "Cut Behind & Turn",
  doubleTouch: "Double Touch",
  fightingSpirit: "Fighting Spirit",
  firstTimeShot: "First-time Shot",
  gamesmanship: "Gamesmanship",
  heading: "Heading",
  heelTrick: "Heel Trick",
  interception: "Interception",
  knuckleShot: "Knuckle Shot",
  longRangeDrive: "Long-Range Curler",
  longRangeShooting: "Long Range Shooting",
  lowLoftedPass: "Low Lofted Pass",
  manMarking: "Man Marking",
  marseilleTurn: "Marseille Turn",
  noLookPass: "No Look Pass",
  oneTouchPass: "One-touch Pass",
  outsideCurler: "Outside Curler",
  penaltySpecialist: "Penalty Specialist",
  pinpointCrossing: "Pinpoint Crossing",
  risingShots: "Rising Shot",
  scotchMove: "Scotch Move",
  sombrero: "Sombrero",
  soleControl: "Sole Control",
  superSub: "Super-sub",
  throughPassing: "Through Passing",
  weightedPass: "Weighted Pass"
};

export async function importPlayerFromEfhubLink(inputUrl: string): Promise<PlayerCard> {
  const { id, fetchUrl, sourceUrl } = parseEfhubPlayerUrl(inputUrl);
  const response = await fetch(fetchUrl, {
    headers: {
      "User-Agent": "Hubball/0.1 local importer"
    }
  });

  if (!response.ok) {
    throw new Error(`Nao consegui carregar a pagina do EFHub (${response.status}).`);
  }

  const html = await response.text();
  const normalized = normalizeNextFlightHtml(html);
  const baseIndex = normalized.indexOf("\"baseStats\":");

  if (baseIndex === -1) {
    throw new Error("Nao encontrei os atributos da carta nessa pagina do EFHub.");
  }

  const stats = parseJsonValue<EfhubStats>(normalized, "baseStats", baseIndex);
  const playerSkills = parseJsonValue<string[]>(normalized, "playerSkills", baseIndex) ?? [];
  const additionalPositions =
    parseJsonValue<EfhubAdditionalPosition[]>(normalized, "additionalPositions", baseIndex) ?? [];
  const player =
    parseJsonValue<EfhubPlayer>(normalized, "player", normalized.indexOf("\"playerSkills\":", baseIndex)) ??
    parsePlayerFromMeta(html, id);
  const levelCap = Math.max(
    1,
    Number(player?.levelCap ?? parseNumberProperty(normalized, "initialLevelCap", baseIndex) ?? 1)
  );

  if (!stats || !player) {
    throw new Error("O EFHub carregou, mas o formato da carta nao foi reconhecido.");
  }

  const skills = Array.isArray(player.skills) ? player.skills : playerSkills;
  const translatedSkills = skills.map((skill) => skillLabels[skill] ?? translateKeyFromHtml(normalized, skill));
  const displayPosition = translatePosition(player.position);
  const extraPositions = additionalPositions
    .map((item) => `${translatePosition(item.position)} familiaridade ${item.familiarity}`)
    .join(", ");
  const playerBoosts = await getEfhubBoosts(buildPlayerBoostRequests(normalized, player, baseIndex));
  const playerBoostDescriptions = playerBoosts.map(describePlayerBoost);
  const maxBuildWithoutManager = calculateMaxProgressionBuild({
    stats,
    position: player.position,
    height: Number(player.height ?? 0),
    weakFootAccuracy: Number(player.weakFootAccuracy ?? 2),
    levelCap,
    playerBoosts
  });
  const maxBuild = calculateMaxProgressionBuild({
    stats,
    position: player.position,
    height: Number(player.height ?? 0),
    weakFootAccuracy: Number(player.weakFootAccuracy ?? 2),
    levelCap,
    manager: selectedManager,
    playerBoosts
  });

  return {
    id,
    name: player.name,
    version: player.league || player.team || "EFHub",
    club: player.team || "Nao informado",
    nationality: player.team || "Nao informado",
    position: displayPosition,
    overall: Number(player.overallRating),
    baseOverall: Number(player.overallRating),
    maxOverall: Math.max(Number(player.overallRating), maxBuild.overall),
    playStyle: player.playingStyle || "Nao informado",
    height: Number(player.height ?? 0),
    weight: Number(player.weight ?? 0),
    age: Number(player.age ?? 0),
    foot: player.preferredFoot === "Left" ? "Esquerdo" : "Direito",
    condition: conditionMap[Number(player.condition)] ?? String(player.condition ?? "N/A"),
    positions: buildPositionRatings({
      stats,
      height: Number(player.height ?? 0),
      weakFootAccuracy: Number(player.weakFootAccuracy ?? 2)
    }),
    maxPositions: buildPositionRatings({
      stats: maxBuild.stats,
      height: Number(player.height ?? 0),
      weakFootAccuracy: Number(player.weakFootAccuracy ?? 2)
    }),
    attributes: buildAttributes(stats),
    maxAttributes: buildAttributes(maxBuild.stats),
    maxBuild: {
      levelCap: maxBuild.levelCap,
      totalPoints: maxBuild.totalPoints,
      pointsUsed: maxBuild.pointsUsed,
      sliders: maxBuild.sliders,
      overallWithoutManager: maxBuildWithoutManager.overall,
      playerBoosts: playerBoostDescriptions,
      manager: {
        name: selectedManager.name,
        playstyle: selectedManager.playstyle,
        skillValue: selectedManager.skillValue,
        boosts: selectedManager.boosts.map((boost) => boost.label)
      }
    },
    skills: translatedSkills,
    boosters: playerBoosts.map((boost) => boost.name),
    notes: [
      `Importado do EFHub em ${new Date().toLocaleDateString("pt-BR")}.`,
      extraPositions ? `Posicoes adicionais informadas pelo EFHub: ${extraPositions}.` : "",
      playerBoostDescriptions.length ? `Booster da carta: ${playerBoostDescriptions.join("; ")}.` : "",
      `Build MAX calculada com nivel maximo ${levelCap} e ${maxBuild.pointsUsed}/${maxBuild.totalPoints} pontos.`,
      `Overall MAX sem tecnico: ${maxBuildWithoutManager.overall}.`,
      `Tecnico considerado: ${selectedManager.name}, ${selectedManager.playstyle} ${selectedManager.skillValue}, ${selectedManager.boosts.map((boost) => boost.label).join(", ")}.`
    ]
      .filter(Boolean)
      .join(" "),
    source: "efhub",
    sourceUrl,
    imageUrl: player.imageUrl || `https://efimg.com/efootballhub22/images/player_cards/${id}_l.png`,
    importedAt: new Date().toISOString()
  };
}

function buildPlayerBoostRequests(normalized: string, player: EfhubPlayer, baseIndex: number) {
  const leftBoostId = parseNumberProperty(normalized, "initialBoostLeftId", baseIndex) ?? player.boostId ?? null;
  const rightBoostId = parseNumberProperty(normalized, "initialBoostRightId", baseIndex);

  return [
    leftBoostId ? { id: leftBoostId, side: "left" as const } : null,
    rightBoostId ? { id: rightBoostId, side: "right" as const } : null
  ].filter((request): request is { id: number; side: "left" | "right" } => request !== null && request.id > 0);
}

function describePlayerBoost(boost: PlayerBoostContext) {
  const stats = Object.entries(boost.stats)
    .map(([key, value]) => `${statLabels[key] ?? splitCamelCase(key)} ${value > 0 ? "+" : ""}${value}`)
    .join(", ");

  return stats ? `${boost.name} (${stats})` : boost.name;
}

function parseEfhubPlayerUrl(inputUrl: string) {
  let parsed: URL;

  try {
    parsed = new URL(inputUrl);
  } catch {
    throw new Error("Link invalido. Cole a URL completa da carta no EFHub.");
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");

  if (!["efhub.com", "efootballhub.net"].includes(hostname)) {
    throw new Error("Use um link de jogador do EFHub ou eFootballHub.");
  }

  const id = parsed.pathname.match(/\/(?:players?|player)\/(\d+)/i)?.[1] ?? parsed.pathname.match(/(\d+)\/?$/)?.[1];

  if (!id) {
    throw new Error("Nao consegui identificar o ID do jogador nesse link.");
  }

  return {
    id,
    fetchUrl: `https://efhub.com/players/${id}`,
    sourceUrl: `https://efhub.com/players/${id}`
  };
}

function normalizeNextFlightHtml(html: string) {
  return html
    .replaceAll("\\\"", "\"")
    .replaceAll("\\/", "/")
    .replaceAll("\\u0026", "&")
    .replaceAll("\\n", "\n");
}

function parseJsonValue<T>(text: string, key: string, fromIndex = 0): T | null {
  const keyIndex = text.indexOf(`"${key}":`, fromIndex);

  if (keyIndex === -1) {
    return null;
  }

  const valueStart = findValueStart(text, keyIndex + key.length + 3);

  if (valueStart === -1) {
    return null;
  }

  const valueEnd = findBalancedValueEnd(text, valueStart);

  if (valueEnd === -1) {
    return null;
  }

  try {
    return JSON.parse(text.slice(valueStart, valueEnd + 1)) as T;
  } catch {
    return null;
  }
}

function parseNumberProperty(text: string, key: string, fromIndex = 0) {
  const match = text.slice(fromIndex).match(new RegExp(`"${escapeRegExp(key)}":(\\d+)`));

  return match ? Number(match[1]) : null;
}

function findValueStart(text: string, startIndex: number) {
  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];

    if (char === "{" || char === "[") {
      return index;
    }
  }

  return -1;
}

function findBalancedValueEnd(text: string, startIndex: number) {
  const opener = text[startIndex];
  const closer = opener === "{" ? "}" : "]";
  let depth = 0;
  let isInsideString = false;
  let isEscaped = false;

  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];

    if (isInsideString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (char === "\\") {
        isEscaped = true;
      } else if (char === "\"") {
        isInsideString = false;
      }

      continue;
    }

    if (char === "\"") {
      isInsideString = true;
    } else if (char === opener) {
      depth += 1;
    } else if (char === closer) {
      depth -= 1;

      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function parsePlayerFromMeta(html: string, id: string): EfhubPlayer | null {
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? "";
  const description = html.match(/<meta name="description" content="([^"]+)"/i)?.[1] ?? "";
  const titleMatch = title.match(/^(.+?)\s+\D+\s+(\d+)\s+OVR/i);
  const descriptionMatch = description.match(/\D+\s+(\d+)\s+OVR\s+([A-Z]+)/i);

  if (!titleMatch || !descriptionMatch) {
    return null;
  }

  return {
    id,
    name: decodeHtml(titleMatch[1]),
    position: descriptionMatch[2],
    overallRating: Number(descriptionMatch[1])
  };
}

function decodeHtml(value: string) {
  return value.replaceAll("&amp;", "&").replaceAll("&#x27;", "'").replaceAll("&quot;", "\"");
}

function buildAttributes(stats: EfhubStats) {
  return Object.fromEntries(
    Object.entries(attributeGroups).map(([group, keys]) => [
      group,
      Object.fromEntries(keys.map((key) => [statLabels[key], Number(stats[key] ?? 0)]))
    ])
  ) as Record<PlayerAttributeGroup, Record<string, number>>;
}

function translateKeyFromHtml(html: string, key: string) {
  const pattern = new RegExp(`"${escapeRegExp(key)}":"([^"]+)"`);
  const translated = html.match(pattern)?.[1];

  return translated ? decodeHtml(translated) : splitCamelCase(key);
}

function splitCamelCase(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (char) => char.toUpperCase());
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function translatePosition(position: string) {
  return positionLabels[position] ?? position;
}

function buildPositionRatings(options: { stats: EfhubStats; height: number; weakFootAccuracy: number }) {
  return Object.fromEntries(
    Object.entries(computePositionRatings(options)).map(([position, rating]) => [
      translatePosition(position),
      rating
    ])
  );
}

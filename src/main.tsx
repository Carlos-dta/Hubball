import React from "react";
import ReactDOM from "react-dom/client";
import type { Root } from "react-dom/client";
import {
  Clipboard,
  Database,
  Download,
  ExternalLink,
  Link2,
  Plus,
  Search,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  Trash2,
  Users,
  X
} from "lucide-react";
import "./styles.css";

declare global {
  interface Window {
    __hubballRoot?: Root;
  }
}

type PlayerAttributeGroup = "Ataque" | "Passe" | "Drible" | "Defesa" | "Atletismo" | "Goleiro";

type PlayerCard = {
  id: string;
  name: string;
  version: string;
  club: string;
  nationality: string;
  position: string;
  overall: number;
  baseOverall?: number;
  maxOverall: number;
  playStyle: string;
  height: number;
  weight: number;
  age: number;
  foot: "Direito" | "Esquerdo";
  condition: string;
  positions: Record<string, number>;
  maxPositions?: Record<string, number>;
  attributes: Record<PlayerAttributeGroup, Record<string, number>>;
  maxAttributes?: Record<PlayerAttributeGroup, Record<string, number>>;
  maxBuild?: {
    levelCap: number;
    totalPoints: number;
    pointsUsed: number;
    sliders: Record<string, number>;
    overallWithoutManager?: number;
    playerBoosts?: string[];
    manager?: {
      name: string;
      playstyle: string;
      skillValue: number;
      boosts: string[];
    };
  };
  skills: string[];
  boosters: string[];
  notes: string;
  source?: "mock" | "efhub" | "manual";
  sourceUrl?: string;
  imageUrl?: string;
  importedAt?: string;
};

type MyCard = {
  id: string;
  playerId: string;
  nickname?: string;
  level?: number;
  customNotes?: string;
  addedAt: string;
  player: PlayerCard;
};

type ExportResponse = {
  count: number;
  prompt: string;
};

type EfhubSearchResult = {
  id: string;
  name: string;
  team: string;
  position: string;
  overall: number;
  playingStyle: string;
  imageUrl: string;
  sourceUrl: string;
};

type AnalysisStatus = "evoluido" | "naoEvoluido" | "trancado" | "duplicado" | "emUso";
type AnalysisTag =
  | "favorito"
  | "duvida"
  | "possivelTitular"
  | "possivelDispensa"
  | "prioridadeTreino"
  | "protegido"
  | "epico"
  | "bigTime"
  | "showTime"
  | "cartaRara"
  | "duplicado";
type AnalysisFilter =
  | "todos"
  | "naoEvoluidos"
  | "especiais"
  | "epicos"
  | "duplicados"
  | "posicao"
  | "favoritos"
  | "dispensa";
type AnalysisSort = "overallMax" | "position" | "cardType" | "status" | "priority";

type AnalysisCardMeta = {
  status?: AnalysisStatus;
  tags?: AnalysisTag[];
};

type AppView = "home" | "lineup";
type LineupFormationKey = "4-3-3" | "4-2-1-3" | "4-2-2-2" | "3-2-4-1" | "5-2-3";
type LineupAssignmentMap = Record<string, PlayerCard>;
type LineupTeam = {
  id: string;
  name: string;
  assignments: LineupAssignmentMap;
  bench: LineupAssignmentMap;
};
type LineupSlot = {
  id: string;
  label: string;
  x: number;
  y: number;
};
type LineupBenchSlot = {
  id: string;
  label: string;
  title: string;
};
type LineupFormationConfig = {
  key: LineupFormationKey;
  label: string;
  style: string;
  slots: LineupSlot[];
};

const api = {
  async getMyCards() {
    const response = await fetch("/api/my-cards");
    return readJson<MyCard[]>(response);
  },
  async removeMyCard(cardId: string) {
    const response = await fetch(`/api/my-cards/${cardId}`, { method: "DELETE" });
    if (!response.ok) {
      throw new Error("Nao consegui remover essa carta.");
    }
  },
  async exportPrompt(formation: string, objective: string) {
    const response = await fetch("/api/exports/chatgpt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formation, objective })
    });
    return readJson<ExportResponse>(response);
  },
  async importEfhubLink(url: string) {
    const response = await fetch("/api/import/efhub-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });
    return readJson<{ status: string; message: string; player: PlayerCard; card: MyCard | null }>(response);
  },
  async searchEfhubPlayers(query: string, page = 1) {
    const params = new URLSearchParams({ q: query, limit: "24", page: String(page) });
    const response = await fetch(`/api/efhub/search?${params.toString()}`);
    return readJson<{
      players: EfhubSearchResult[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(response);
  },
  async getEfhubBestPlayers() {
    const response = await fetch("/api/efhub/best-players?scan=10000");
    return readJson<{
      players: PlayerCard[];
      candidates: number;
      scanned: number;
      scannedPages: number;
    }>(response);
  }
};

function App() {
  const [currentView, setCurrentView] = React.useState<AppView>("home");
  const [myCards, setMyCards] = React.useState<MyCard[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = React.useState<string | null>(null);
  const [formation, setFormation] = React.useState("4-2-1-3");
  const [objective, setObjective] = React.useState("montar o melhor time titular, banco e prioridades de treino");
  const [prompt, setPrompt] = React.useState("");
  const [efhubUrl, setEfhubUrl] = React.useState("");
  const [efhubSearch, setEfhubSearch] = React.useState("");
  const [efhubResults, setEfhubResults] = React.useState<EfhubSearchResult[]>([]);
  const [efhubTotal, setEfhubTotal] = React.useState(0);
  const [efhubPage, setEfhubPage] = React.useState(1);
  const [efhubTotalPages, setEfhubTotalPages] = React.useState(0);
  const [isEfhubSearching, setIsEfhubSearching] = React.useState(false);
  const [isEfhubLoadingMore, setIsEfhubLoadingMore] = React.useState(false);
  const [importingEfhubId, setImportingEfhubId] = React.useState<string | null>(null);
  const [isLinkImporting, setIsLinkImporting] = React.useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [buildMode, setBuildMode] = React.useState<"base" | "max">("max");
  const [analysisPrompt, setAnalysisPrompt] = React.useState("");
  const [analysisFormation, setAnalysisFormation] = React.useState("4-2-1-3");
  const [analysisCoach, setAnalysisCoach] = React.useState("D. Stojkovic");
  const [analysisPlaystyle, setAnalysisPlaystyle] = React.useState("QuickCounter 88");
  const [analysisCoachBoost, setAnalysisCoachBoost] = React.useState("Forca do chute +1");
  const [analysisFocus, setAnalysisFocus] = React.useState("competitivo");
  const [analysisPriority, setAnalysisPriority] = React.useState("melhor time");
  const [analysisFilter, setAnalysisFilter] = React.useState<AnalysisFilter>("todos");
  const [analysisSort, setAnalysisSort] = React.useState<AnalysisSort>("overallMax");
  const [analysisPosition, setAnalysisPosition] = React.useState("Todas");
  const [analysisMeta, setAnalysisMeta] = React.useState<Record<string, AnalysisCardMeta>>(loadAnalysisMeta);
  const [lineupTeams, setLineupTeams] = React.useState<LineupTeam[]>(loadLineupTeams);
  const [lineupFormation, setLineupFormation] = React.useState<LineupFormationKey>(loadLineupFormation);
  const [activeLineupTeamId, setActiveLineupTeamId] = React.useState(loadActiveLineupTeamId);
  const [activeLineupSlotId, setActiveLineupSlotId] = React.useState<string | null>(null);
  const [lineupSearch, setLineupSearch] = React.useState("");
  const [lineupResults, setLineupResults] = React.useState<EfhubSearchResult[]>([]);
  const [lineupTotal, setLineupTotal] = React.useState(0);
  const [lineupPage, setLineupPage] = React.useState(1);
  const [lineupTotalPages, setLineupTotalPages] = React.useState(0);
  const [isLineupSearching, setIsLineupSearching] = React.useState(false);
  const [isLineupLoadingMore, setIsLineupLoadingMore] = React.useState(false);
  const [importingLineupId, setImportingLineupId] = React.useState<string | null>(null);
  const [isBuildingEfhubBestLineup, setIsBuildingEfhubBestLineup] = React.useState(false);
  const [lineupCandidatePool, setLineupCandidatePool] = React.useState<PlayerCard[]>([]);
  const [lineupCandidateSource, setLineupCandidateSource] = React.useState("");
  const [lineupPrompt, setLineupPrompt] = React.useState("");

  const collectionIds = React.useMemo(() => new Set(myCards.map((card) => card.playerId)), [myCards]);
  const selectedCard =
    myCards.find((card) => card.playerId === selectedPlayerId) ?? myCards[0] ?? null;
  const selectedPlayer = selectedCard?.player ?? null;
  const selectedBuild = selectedPlayer ? getDisplayBuild(selectedPlayer, buildMode) : null;
  const selectedAnalysisMeta = selectedCard ? analysisMeta[selectedCard.playerId] ?? {} : {};
  const activeLineupTeam = lineupTeams.find((team) => team.id === activeLineupTeamId) ?? lineupTeams[0];
  const activeLineupSlots = getLineupFormation(lineupFormation).slots;
  const activeLineupFieldSlot = activeLineupSlots.find((slot) => slot.id === activeLineupSlotId) ?? null;
  const activeLineupBenchSlot = lineupBenchSlots.find((slot) => slot.id === activeLineupSlotId) ?? null;
  const activeLineupSlot = activeLineupFieldSlot ?? activeLineupBenchSlot;
  const lineupSubstitutes = React.useMemo(
    () =>
      activeLineupFieldSlot
        ? getLineupSubstitutes(
            lineupCandidatePool.length > 0 ? lineupCandidatePool : myCards.map((card) => card.player),
            {
              ...(activeLineupTeam?.assignments ?? {}),
              ...(activeLineupTeam?.bench ?? {})
            },
            activeLineupFieldSlot,
            buildMode,
            10
          )
        : [],
    [activeLineupFieldSlot, activeLineupTeam?.assignments, activeLineupTeam?.bench, buildMode, lineupCandidatePool, myCards]
  );

  React.useEffect(() => {
    let isActive = true;

    async function boot() {
      try {
        const result = await api.getMyCards();

        if (!isActive) return;
        setMyCards(result);
        setSelectedPlayerId(result[0]?.playerId ?? null);
      } catch (error) {
        setNotice(getErrorMessage(error));
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    boot();

    return () => {
      isActive = false;
    };
  }, []);

  React.useEffect(() => {
    if (myCards.length === 0) {
      setSelectedPlayerId(null);
      return;
    }

    setSelectedPlayerId((current) => {
      if (current && myCards.some((card) => card.playerId === current)) {
        return current;
      }

      return myCards[0].playerId;
    });
  }, [myCards]);

  React.useEffect(() => {
    if (selectedPlayer && buildMode === "max" && !selectedPlayer.maxAttributes) {
      setBuildMode("base");
    }
  }, [buildMode, selectedPlayer]);

  React.useEffect(() => {
    saveAnalysisMeta(analysisMeta);
  }, [analysisMeta]);

  React.useEffect(() => {
    saveLineupTeams(lineupTeams);
  }, [lineupTeams]);

  React.useEffect(() => {
    saveLineupFormation(lineupFormation);
  }, [lineupFormation]);

  React.useEffect(() => {
    if (!lineupTeams.some((team) => team.id === activeLineupTeamId)) {
      setActiveLineupTeamId(lineupTeams[0]?.id ?? "team-1");
    }
  }, [activeLineupTeamId, lineupTeams]);

  React.useEffect(() => {
    saveActiveLineupTeamId(activeLineupTeamId);
  }, [activeLineupTeamId]);

  React.useEffect(() => {
    const query = efhubSearch.trim();

    if (query.length < 2) {
      setEfhubResults([]);
      setEfhubTotal(0);
      setEfhubPage(1);
      setEfhubTotalPages(0);
      setIsEfhubSearching(false);
      return;
    }

    let isActive = true;
    setIsEfhubSearching(true);

    const timeout = window.setTimeout(async () => {
      try {
        const result = await api.searchEfhubPlayers(query, 1);

        if (isActive) {
          setEfhubResults(result.players);
          setEfhubTotal(result.total);
          setEfhubPage(result.page);
          setEfhubTotalPages(result.totalPages);
        }
      } catch (error) {
        if (isActive) {
          setNotice(getErrorMessage(error));
        }
      } finally {
        if (isActive) {
          setIsEfhubSearching(false);
        }
      }
    }, 320);

    return () => {
      isActive = false;
      window.clearTimeout(timeout);
    };
  }, [efhubSearch]);

  React.useEffect(() => {
    const query = lineupSearch.trim();

    if (!activeLineupSlotId || query.length < 2) {
      setLineupResults([]);
      setLineupTotal(0);
      setLineupPage(1);
      setLineupTotalPages(0);
      setIsLineupSearching(false);
      return;
    }

    let isActive = true;
    setIsLineupSearching(true);

    const timeout = window.setTimeout(async () => {
      try {
        const result = await api.searchEfhubPlayers(query, 1);

        if (isActive) {
          setLineupResults(result.players);
          setLineupTotal(result.total);
          setLineupPage(result.page);
          setLineupTotalPages(result.totalPages);
        }
      } catch (error) {
        if (isActive) {
          setNotice(getErrorMessage(error));
        }
      } finally {
        if (isActive) {
          setIsLineupSearching(false);
        }
      }
    }, 320);

    return () => {
      isActive = false;
      window.clearTimeout(timeout);
    };
  }, [activeLineupSlotId, lineupSearch]);

  async function removeFromCollection(cardId: string) {
    try {
      await api.removeMyCard(cardId);
      setMyCards((current) => current.filter((card) => card.id !== cardId));
      setNotice("Carta removida.");
    } catch (error) {
      setNotice(getErrorMessage(error));
    }
  }

  async function generatePrompt() {
    setIsGeneratingPrompt(true);

    try {
      const result = await api.exportPrompt(formation, objective);
      setPrompt(result.prompt);
      setNotice(`Prompt gerado com ${result.count} carta(s).`);
    } catch (error) {
      setNotice(getErrorMessage(error));
    } finally {
      setIsGeneratingPrompt(false);
    }
  }

  async function copyPrompt() {
    if (!prompt) return;
    await copyTextToClipboard(prompt);
    setNotice("Prompt copiado para a area de transferencia.");
  }

  function gerarPromptAnaliseElenco() {
    const generatedPrompt = buildPromptAnaliseElenco({
      cards: myCards,
      meta: analysisMeta,
      formation: analysisFormation,
      coach: analysisCoach,
      playstyle: analysisPlaystyle,
      coachBoost: analysisCoachBoost,
      focus: analysisFocus,
      priority: analysisPriority,
      filter: analysisFilter,
      sort: analysisSort,
      position: analysisPosition,
      mode: buildMode
    });

    setAnalysisPrompt(generatedPrompt);
    setNotice("Prompt compacto de analise gerado.");
  }

  async function copyAnalysisPrompt() {
    if (!analysisPrompt) return;
    await copyTextToClipboard(analysisPrompt);
    setNotice("Prompt compacto copiado.");
  }

  function downloadAnalysisPrompt() {
    if (!analysisPrompt) return;

    const blob = new Blob([analysisPrompt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `hubball-analise-elenco-${new Date().toISOString().slice(0, 10)}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Arquivo .txt gerado.");
  }

  async function handleImportLink() {
    const url = efhubUrl.trim();

    if (!url) {
      return;
    }

    setIsLinkImporting(true);

    try {
      const result = await api.importEfhubLink(url);
      applyImportedEfhubPlayer(result);
      setEfhubUrl("");
      setNotice(result.message);
    } catch (error) {
      setNotice(getErrorMessage(error));
    } finally {
      setIsLinkImporting(false);
    }
  }

  async function importEfhubSearchResult(result: EfhubSearchResult) {
    setImportingEfhubId(result.id);

    try {
      const imported = await api.importEfhubLink(result.sourceUrl);
      applyImportedEfhubPlayer(imported);
      setNotice(imported.message);
    } catch (error) {
      setNotice(getErrorMessage(error));
    } finally {
      setImportingEfhubId(null);
    }
  }

  async function loadMoreEfhubResults() {
    const query = efhubSearch.trim();

    if (!query || efhubPage >= efhubTotalPages) {
      return;
    }

    setIsEfhubLoadingMore(true);

    try {
      const result = await api.searchEfhubPlayers(query, efhubPage + 1);
      setEfhubResults((current) => mergeEfhubResults(current, result.players));
      setEfhubTotal(result.total);
      setEfhubPage(result.page);
      setEfhubTotalPages(result.totalPages);
    } catch (error) {
      setNotice(getErrorMessage(error));
    } finally {
      setIsEfhubLoadingMore(false);
    }
  }

  function openLineupSlot(slotId: string) {
    setActiveLineupSlotId(slotId);
    setLineupSearch("");
    setLineupResults([]);
    setLineupTotal(0);
    setLineupPage(1);
    setLineupTotalPages(0);
  }

  async function importLineupSearchResult(result: EfhubSearchResult) {
    if (!activeLineupSlot) {
      return;
    }

    setImportingLineupId(result.id);

    try {
      const imported = await api.importEfhubLink(result.sourceUrl);
      applyImportedEfhubPlayer(imported);
      assignPlayerToActiveLineupSlot(imported.player);
      setLineupSearch("");
      setLineupResults([]);
      setNotice(`${imported.player.name} escalado em ${activeLineupSlot.label}.`);
    } catch (error) {
      setNotice(getErrorMessage(error));
    } finally {
      setImportingLineupId(null);
    }
  }

  async function loadMoreLineupResults() {
    const query = lineupSearch.trim();

    if (!query || lineupPage >= lineupTotalPages) {
      return;
    }

    setIsLineupLoadingMore(true);

    try {
      const result = await api.searchEfhubPlayers(query, lineupPage + 1);
      setLineupResults((current) => mergeEfhubResults(current, result.players));
      setLineupTotal(result.total);
      setLineupPage(result.page);
      setLineupTotalPages(result.totalPages);
    } catch (error) {
      setNotice(getErrorMessage(error));
    } finally {
      setIsLineupLoadingMore(false);
    }
  }

  function removeLineupAssignment(slotId: string) {
    if (isLineupBenchSlotId(slotId)) {
      updateActiveLineupBench((current) => {
        const next = { ...current };
        delete next[slotId];
        return next;
      });
      return;
    }

    updateActiveLineupAssignments((current) => removeLineupSlotFromMap(current, slotId));
  }

  function clearLineupAssignments() {
    updateActiveLineupAssignments(() => ({}));
    updateActiveLineupBench(() => ({}));
    setActiveLineupSlotId(null);
    setLineupSearch("");
    setLineupResults([]);
  }

  function fillBestLineupFromCollection() {
    if (myCards.length === 0) {
      setNotice("Adicione cartas na colecao antes de montar o melhor time.");
      return;
    }

    const assignments = buildBestLineupAssignments(
      myCards.map((card) => card.player),
      buildMode,
      activeLineupSlots
    );
    const filledCount = Object.keys(assignments).length;

    if (filledCount === 0) {
      setNotice("Nao encontrei cartas compativeis para preencher o campo.");
      return;
    }

    setLineupCandidatePool(myCards.map((card) => card.player));
    setLineupCandidateSource("Colecao");
    updateActiveLineupAssignments(() => assignments);
    setActiveLineupSlotId(null);
    setLineupSearch("");
    setLineupResults([]);
    setLineupTotal(0);
    setLineupPage(1);
    setLineupTotalPages(0);
    setNotice(`Melhor time da colecao montado em ${lineupFormation} com ${filledCount}/${activeLineupSlots.length} cartas considerando modo ${buildMode.toUpperCase()} e condicao.`);
  }

  async function fillBestLineupFromEfhub() {
    setIsBuildingEfhubBestLineup(true);

    try {
      const result = await api.getEfhubBestPlayers();
      const assignments = buildBestLineupAssignments(result.players, buildMode, activeLineupSlots);
      const filledCount = Object.keys(assignments).length;

      if (filledCount === 0) {
        setNotice("Nao consegui montar um time com os candidatos do EFHub agora.");
        return;
      }

      setLineupCandidatePool(result.players);
      setLineupCandidateSource(`EFHub ${result.scanned.toLocaleString("pt-BR")} cartas`);
      updateActiveLineupAssignments(() => assignments);
      setActiveLineupSlotId(null);
      setLineupSearch("");
      setLineupResults([]);
      setLineupTotal(0);
      setLineupPage(1);
      setLineupTotalPages(0);
      setNotice(
        `Melhor time EFHub montado em ${lineupFormation} com ${filledCount}/${activeLineupSlots.length} cartas. Analisei ${result.scanned} cartas do ranking global.`
      );
    } catch (error) {
      setNotice(getErrorMessage(error));
    } finally {
      setIsBuildingEfhubBestLineup(false);
    }
  }

  function updateActiveLineupAssignments(updater: (current: LineupAssignmentMap) => LineupAssignmentMap) {
    if (!activeLineupTeam) {
      return;
    }

    setLineupTeams((current) =>
      current.map((team) =>
        team.id === activeLineupTeam.id
          ? {
              ...team,
              assignments: updater(team.assignments)
            }
          : team
      )
    );
  }

  function updateActiveLineupBench(updater: (current: LineupAssignmentMap) => LineupAssignmentMap) {
    if (!activeLineupTeam) {
      return;
    }

    setLineupTeams((current) =>
      current.map((team) =>
        team.id === activeLineupTeam.id
          ? {
              ...team,
              bench: updater(team.bench ?? {})
            }
          : team
      )
    );
  }

  function assignPlayerToActiveLineupSlot(player: PlayerCard) {
    if (!activeLineupTeam || !activeLineupSlotId) {
      return;
    }

    setLineupTeams((current) =>
      current.map((team) => {
        if (team.id !== activeLineupTeam.id) {
          return team;
        }

        const assignments = removeLineupPlayerFromMap(team.assignments, player.id);
        const bench = removeLineupPlayerFromMap(team.bench ?? {}, player.id);

        if (isLineupBenchSlotId(activeLineupSlotId)) {
          return {
            ...team,
            assignments,
            bench: {
              ...bench,
              [activeLineupSlotId]: player
            }
          };
        }

        return {
          ...team,
          assignments: {
            ...assignments,
            [activeLineupSlotId]: player
          },
          bench
        };
      })
    );
  }

  function addLineupTeam() {
    const nextIndex = lineupTeams.length + 1;
    const newTeam = {
      id: createClientId(),
      name: `Time ${String.fromCharCode(64 + Math.min(nextIndex, 26))}`,
      assignments: {},
      bench: {}
    };

    setLineupTeams((current) => [...current, newTeam]);
    setActiveLineupTeamId(newTeam.id);
    setActiveLineupSlotId(null);
    setLineupSearch("");
    setLineupResults([]);
  }

  function renameLineupTeam(teamId: string, name: string) {
    setLineupTeams((current) =>
      current.map((team) => (team.id === teamId ? { ...team, name } : team))
    );
  }

  function removeLineupTeam(teamId: string) {
    if (lineupTeams.length <= 2) {
      setNotice("Mantenha pelo menos 2 times para comparar.");
      return;
    }

    setLineupTeams((current) => current.filter((team) => team.id !== teamId));
    setActiveLineupSlotId(null);
    setLineupSearch("");
    setLineupResults([]);
  }

  function selectLineupTeam(teamId: string) {
    setActiveLineupTeamId(teamId);
    setActiveLineupSlotId(null);
    setLineupSearch("");
    setLineupResults([]);
    setLineupTotal(0);
    setLineupPage(1);
    setLineupTotalPages(0);
  }

  function selectLineupFormation(formationKey: LineupFormationKey) {
    setLineupFormation(formationKey);
    setActiveLineupSlotId(null);
    setLineupSearch("");
    setLineupResults([]);
    setLineupTotal(0);
    setLineupPage(1);
    setLineupTotalPages(0);
  }

  function useLineupSubstitute(player: PlayerCard) {
    if (!activeLineupFieldSlot) {
      return;
    }

    assignPlayerToActiveLineupSlot(player);
    setNotice(`${player.name} entrou em ${activeLineupFieldSlot.label}.`);
  }

  function createCurrentLineupPrompt() {
    if (!activeLineupTeam) {
      return "";
    }

    const filledCount = activeLineupSlots.filter((slot) => activeLineupTeam.assignments[slot.id]).length;
    const benchCount = lineupBenchSlots.filter((slot) => activeLineupTeam.bench?.[slot.id]).length;

    if (filledCount === 0 && benchCount === 0) {
      return "";
    }

    return buildLineupAnalysisPrompt({
      activeTeam: activeLineupTeam,
      teams: lineupTeams,
      formation: getLineupFormation(lineupFormation),
      mode: buildMode,
      candidatePool: lineupCandidatePool.length > 0 ? lineupCandidatePool : myCards.map((card) => card.player),
      substituteSource: lineupCandidateSource || "Colecao"
    });
  }

  function generateLineupPrompt() {
    const generatedPrompt = createCurrentLineupPrompt();

    if (!generatedPrompt) {
      setNotice("Monte pelo menos uma carta no campo ou no banco antes de gerar o prompt.");
      return;
    }

    setLineupPrompt(generatedPrompt);
    setNotice("Prompt da escalacao gerado.");
  }

  async function copyLineupPrompt() {
    const generatedPrompt = createCurrentLineupPrompt();

    if (!generatedPrompt) {
      setNotice("Monte pelo menos uma carta no campo ou no banco antes de copiar o prompt.");
      return;
    }

    setLineupPrompt(generatedPrompt);
    await copyTextToClipboard(generatedPrompt);
    setNotice("Prompt da escalacao copiado.");
  }

  function downloadLineupPrompt() {
    if (!lineupPrompt) return;

    const blob = new Blob([lineupPrompt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `hubball-escalacao-${new Date().toISOString().slice(0, 10)}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Arquivo da escalacao gerado.");
  }

  function applyImportedEfhubPlayer(result: { player: PlayerCard; card: MyCard | null }) {
    if (result.card) {
      const importedCard = result.card;

      setMyCards((current) => [
        importedCard,
        ...current.filter((card) => card.id !== importedCard.id && card.playerId !== importedCard.playerId)
      ]);
    }

    setSelectedPlayerId(result.player.id);
    setBuildMode("max");
  }

  function updateSelectedAnalysisMeta(patch: Partial<AnalysisCardMeta>) {
    if (!selectedCard) return;

    setAnalysisMeta((current) => ({
      ...current,
      [selectedCard.playerId]: {
        ...current[selectedCard.playerId],
        ...patch
      }
    }));
  }

  function toggleSelectedAnalysisTag(tag: AnalysisTag) {
    if (!selectedCard) return;

    setAnalysisMeta((current) => {
      const currentMeta = current[selectedCard.playerId] ?? {};
      const tags = currentMeta.tags ?? [];
      const nextTags = tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag];

      return {
        ...current,
        [selectedCard.playerId]: {
          ...currentMeta,
          tags: nextTags
        }
      };
    });
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark">
          <span>HB</span>
        </div>
        <div>
          <h1>Hubball</h1>
          <p>eFootball card hub</p>
        </div>
        <div className="topbar-actions">
          <nav className="topbar-nav" aria-label="Navegacao principal">
            <button
              className={currentView === "home" ? "is-active" : ""}
              type="button"
              onClick={() => setCurrentView("home")}
            >
              <Shield size={16} />
              Colecao
            </button>
            <button
              className={currentView === "lineup" ? "is-active" : ""}
              type="button"
              onClick={() => setCurrentView("lineup")}
            >
              <Users size={16} />
              Laboratorio
            </button>
          </nav>
          <div className="topbar-metrics" aria-label="Resumo">
            <span>
              <Users size={16} />
              {myCards.length} cartas
            </span>
            <span>
              <Database size={16} />
              API local
            </span>
          </div>
        </div>
      </header>

      {notice && (
        <button className="notice" type="button" onClick={() => setNotice("")}>
          {notice}
        </button>
      )}

      {currentView === "home" ? (
        <>
          <section className="import-command" aria-label="Buscar EFHub">
            <div className="command-bar">
              <label className="search-field search-field-large">
                <Search size={20} />
                <input
                  value={efhubSearch}
                  onChange={(event) => setEfhubSearch(event.target.value)}
                  placeholder="Buscar carta no EFHub"
                />
              </label>

              <label className="link-field">
                <Link2 size={18} />
                <input
                  value={efhubUrl}
                  onChange={(event) => setEfhubUrl(event.target.value)}
                  placeholder="Cole um link do EFHub"
                />
                <button
                  className="ghost-button"
                  type="button"
                  onClick={handleImportLink}
                  disabled={!efhubUrl.trim() || isLinkImporting}
                >
                  <Link2 size={17} />
                  {isLinkImporting ? "Importando" : "Importar"}
                </button>
              </label>
            </div>

            {(isEfhubSearching || efhubResults.length > 0 || efhubSearch.trim().length >= 2) && (
              <div className="efhub-results">
                <div className="result-count">
                  {isEfhubSearching
                    ? "Buscando cartas..."
                    : efhubResults.length > 0
                      ? `${efhubResults.length} de ${efhubTotal} cartas`
                      : "Nenhuma carta encontrada"}
                </div>
                <div className="efhub-result-grid">
                  {efhubResults.map((result) => {
                    const isInCollection = collectionIds.has(result.id);
                    const isImporting = importingEfhubId === result.id;

                    return (
                      <article className="efhub-result-card" key={result.id}>
                        <img src={result.imageUrl} alt="" />
                        <div>
                          <strong>{result.name}</strong>
                          <span>
                            {result.position} {result.overall} | {result.team}
                          </span>
                          <small>{result.playingStyle}</small>
                        </div>
                        <button
                          className="icon-button"
                          type="button"
                          aria-label={`Importar ${result.name}`}
                          onClick={() => importEfhubSearchResult(result)}
                          disabled={isInCollection || isImporting}
                        >
                          <Plus size={17} />
                        </button>
                      </article>
                    );
                  })}
                </div>
                {!isEfhubSearching && efhubPage < efhubTotalPages && (
                  <button
                    className="ghost-button load-more"
                    type="button"
                    onClick={loadMoreEfhubResults}
                    disabled={isEfhubLoadingMore}
                  >
                    <Search size={18} />
                    {isEfhubLoadingMore ? "Carregando" : "Carregar mais"}
                  </button>
                )}
              </div>
            )}
          </section>

          <section className="hub-layout">
            <div className="hub-main">
              <section className="collection-panel" aria-label="Minha colecao">
                <div className="section-title">
                  <Shield size={18} />
                  <h2>Minha Colecao</h2>
                </div>

                {isLoading && <p className="empty-state">Carregando cartas...</p>}
                {!isLoading && myCards.length === 0 && <p className="empty-state">Nenhuma carta na colecao.</p>}

                <div className="collection-gallery">
                  {myCards.map((card) => (
                    <CollectionTile
                      card={card}
                      isSelected={card.playerId === selectedPlayer?.id}
                      key={card.id}
                      onRemove={() => removeFromCollection(card.id)}
                      onSelect={() => setSelectedPlayerId(card.playerId)}
                    />
                  ))}
                </div>
              </section>

          <section className="detail-pane" aria-label="Detalhes da carta">
            {selectedPlayer && selectedBuild ? (
              <>
                <section className="player-hero">
                  <PlayerCardPreview player={selectedPlayer} overall={selectedBuild.overall} />
                  <div className="player-identity">
                    <div className="identity-topline">
                      <span>{selectedPlayer.club}</span>
                      <span>{selectedPlayer.version}</span>
                    </div>
                    <h2>{selectedPlayer.name}</h2>
                    <p>{selectedPlayer.playStyle}</p>
                    <div className="mode-toggle" aria-label="Build">
                      <button
                        className={buildMode === "base" ? "is-active" : ""}
                        type="button"
                        onClick={() => setBuildMode("base")}
                      >
                        Base
                      </button>
                      <button
                        className={buildMode === "max" ? "is-active" : ""}
                        type="button"
                        onClick={() => setBuildMode("max")}
                        disabled={!selectedPlayer.maxAttributes}
                      >
                        <TrendingUp size={15} />
                        MAX
                      </button>
                    </div>
                    <div className="bio-grid">
                      <Metric label="Base" value={String(selectedPlayer.overall)} />
                      <Metric label="Max" value={String(selectedPlayer.maxOverall)} />
                      {selectedPlayer.maxBuild?.overallWithoutManager && (
                        <Metric label="Sem tecnico" value={String(selectedPlayer.maxBuild.overallWithoutManager)} />
                      )}
                      <Metric label="Altura" value={`${selectedPlayer.height}cm`} />
                      <Metric label="Peso" value={`${selectedPlayer.weight}kg`} />
                      <Metric label="Pe" value={selectedPlayer.foot} />
                      <Metric label="Condicao" value={selectedPlayer.condition} />
                      {selectedPlayer.maxBuild && (
                        <Metric
                          label="Pontos"
                          value={`${selectedPlayer.maxBuild.pointsUsed}/${selectedPlayer.maxBuild.totalPoints}`}
                        />
                      )}
                      {selectedPlayer.maxBuild?.manager && (
                        <Metric label="Tecnico" value={selectedPlayer.maxBuild.manager.name} />
                      )}
                    </div>
                    <div className="hero-actions">
                      {selectedPlayer.sourceUrl && (
                        <a
                          className="ghost-button"
                          href={selectedPlayer.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink size={18} />
                          EFHub
                        </a>
                      )}
                    </div>
                  </div>
                  <PositionBoard positions={selectedBuild.positions} primaryPosition={selectedPlayer.position} />
                </section>

                <BuildSummary player={selectedPlayer} />

                <section className="attributes-layout">
                  {Object.entries(selectedBuild.attributes).map(([group, values]) => (
                    <AttributeGroup key={group} title={group} values={values} />
                  ))}
                </section>

                <section className="skills-band">
                  <div>
                    <h3>Habilidades</h3>
                    <div className="chip-list">
                      {selectedPlayer.skills.length > 0 ? (
                        selectedPlayer.skills.map((skill) => <span key={skill}>{skill}</span>)
                      ) : (
                        <span>Nenhuma</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3>Boosters</h3>
                    <div className="chip-list">
                      {getDisplayBoosters(selectedPlayer).map((booster) => (
                        <span key={booster}>{booster}</span>
                      ))}
                    </div>
                  </div>
                </section>
              </>
            ) : (
              <p className="empty-state">Selecione uma carta da colecao.</p>
            )}
          </section>
        </div>

        <aside className="export-pane" aria-label="Exportar prompt">
          <section className="panel-section">
            <div className="section-title">
              <Sparkles size={18} />
              <h2>Prompt ChatGPT</h2>
            </div>
            <label className="text-field">
              <span>Formacao</span>
              <input value={formation} onChange={(event) => setFormation(event.target.value)} />
            </label>
            <label className="text-field">
              <span>Objetivo</span>
              <textarea value={objective} onChange={(event) => setObjective(event.target.value)} rows={3} />
            </label>
            <button
              className="primary-button full"
              type="button"
              onClick={generatePrompt}
              disabled={myCards.length === 0 || isGeneratingPrompt}
            >
              <Clipboard size={18} />
              {isGeneratingPrompt ? "Gerando" : "Gerar prompt"}
            </button>
            <textarea className="prompt-output" value={prompt} readOnly placeholder="Prompt" />
            <button className="ghost-button full" type="button" onClick={copyPrompt} disabled={!prompt}>
              <Clipboard size={18} />
              Copiar prompt
            </button>
          </section>

          <section className="panel-section analysis-panel">
            <div className="section-title">
              <Sparkles size={18} />
              <h2>Analise de elenco</h2>
            </div>

            <div className="analysis-grid">
              <label className="text-field">
                <span>Formacao</span>
                <input value={analysisFormation} onChange={(event) => setAnalysisFormation(event.target.value)} />
              </label>
              <label className="text-field">
                <span>Tecnico</span>
                <input value={analysisCoach} onChange={(event) => setAnalysisCoach(event.target.value)} />
              </label>
              <label className="text-field">
                <span>Estilo</span>
                <input value={analysisPlaystyle} onChange={(event) => setAnalysisPlaystyle(event.target.value)} />
              </label>
              <label className="text-field">
                <span>Boost tecnico</span>
                <input value={analysisCoachBoost} onChange={(event) => setAnalysisCoachBoost(event.target.value)} />
              </label>
              <label className="text-field">
                <span>Foco</span>
                <select value={analysisFocus} onChange={(event) => setAnalysisFocus(event.target.value)}>
                  <option value="competitivo">competitivo</option>
                  <option value="epicos">epicos</option>
                  <option value="Brasil">Brasil</option>
                  <option value="eventos">eventos</option>
                  <option value="limpeza de elenco">limpeza de elenco</option>
                </select>
              </label>
              <label className="text-field">
                <span>Prioridade</span>
                <select value={analysisPriority} onChange={(event) => setAnalysisPriority(event.target.value)}>
                  <option value="melhor time">melhor time</option>
                  <option value="treino">treino</option>
                  <option value="dispensa">dispensa</option>
                  <option value="comparacao de cartas">comparacao de cartas</option>
                </select>
              </label>
              <label className="text-field">
                <span>Filtro</span>
                <select value={analysisFilter} onChange={(event) => setAnalysisFilter(event.target.value as AnalysisFilter)}>
                  {analysisFilterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-field">
                <span>Ordenar</span>
                <select value={analysisSort} onChange={(event) => setAnalysisSort(event.target.value as AnalysisSort)}>
                  {analysisSortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {analysisFilter === "posicao" && (
                <label className="text-field">
                  <span>Posicao</span>
                  <select value={analysisPosition} onChange={(event) => setAnalysisPosition(event.target.value)}>
                    {analysisPositionOptions.map((position) => (
                      <option key={position} value={position}>
                        {position}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <div className="analysis-card-editor">
              <div>
                <strong>{selectedPlayer ? selectedPlayer.name : "Carta selecionada"}</strong>
                <span>{selectedPlayer ? selectedPlayer.version : "Selecione uma carta da colecao"}</span>
              </div>
              <div className="analysis-grid">
                <label className="text-field">
                  <span>Status</span>
                  <select
                    value={selectedAnalysisMeta.status ?? defaultAnalysisStatus(selectedCard)}
                    onChange={(event) => updateSelectedAnalysisMeta({ status: event.target.value as AnalysisStatus })}
                    disabled={!selectedCard}
                  >
                    {analysisStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="tag-toggle-list">
                {analysisTagOptions.map((tag) => (
                  <button
                    className={(selectedAnalysisMeta.tags ?? []).includes(tag.value) ? "is-active" : ""}
                    key={tag.value}
                    type="button"
                    onClick={() => toggleSelectedAnalysisTag(tag.value)}
                    disabled={!selectedCard}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="primary-button full"
              type="button"
              onClick={gerarPromptAnaliseElenco}
              disabled={myCards.length === 0}
            >
              <Clipboard size={18} />
              Gerar prompt analise elenco
            </button>
            <textarea className="prompt-output analysis-output" value={analysisPrompt} readOnly placeholder="Prompt compacto" />
            <div className="analysis-actions">
              <button className="ghost-button full" type="button" onClick={copyAnalysisPrompt} disabled={!analysisPrompt}>
                <Clipboard size={18} />
                Copiar prompt
              </button>
              <button className="ghost-button full" type="button" onClick={downloadAnalysisPrompt} disabled={!analysisPrompt}>
                <Download size={18} />
                Baixar .txt
              </button>
            </div>
          </section>
        </aside>
          </section>
        </>
      ) : (
        <LineupComparePage
          activeSlotId={activeLineupSlotId}
          activeTeamId={activeLineupTeamId}
          buildMode={buildMode}
          formation={lineupFormation}
          importingId={importingLineupId}
          isBuildingEfhubBestLineup={isBuildingEfhubBestLineup}
          isLoadingMore={isLineupLoadingMore}
          isSearching={isLineupSearching}
          onAddTeam={addLineupTeam}
          onAutoFillCollection={fillBestLineupFromCollection}
          onAutoFillEfhub={fillBestLineupFromEfhub}
          onClearTeam={clearLineupAssignments}
          onFormationChange={selectLineupFormation}
          onImport={importLineupSearchResult}
          onLoadMore={loadMoreLineupResults}
          onCopyPrompt={copyLineupPrompt}
          onDownloadPrompt={downloadLineupPrompt}
          onGeneratePrompt={generateLineupPrompt}
          onOpenSlot={openLineupSlot}
          onRemovePlayer={removeLineupAssignment}
          onRemoveTeam={removeLineupTeam}
          onRenameTeam={renameLineupTeam}
          onSearchChange={setLineupSearch}
          onSelectTeam={selectLineupTeam}
          page={lineupPage}
          prompt={lineupPrompt}
          results={lineupResults}
          search={lineupSearch}
          bench={activeLineupTeam?.bench ?? {}}
          benchSlots={lineupBenchSlots}
          slots={activeLineupSlots}
          substituteSource={lineupCandidateSource || "Colecao"}
          substitutes={lineupSubstitutes}
          teams={lineupTeams}
          total={lineupTotal}
          totalPages={lineupTotalPages}
          totalCards={myCards.length}
          onUseSubstitute={useLineupSubstitute}
        />
      )}
    </main>
  );
}

function LineupComparePage({
  activeSlotId,
  activeTeamId,
  buildMode,
  formation,
  importingId,
  isBuildingEfhubBestLineup,
  isLoadingMore,
  isSearching,
  onAddTeam,
  onAutoFillCollection,
  onAutoFillEfhub,
  onClearTeam,
  onFormationChange,
  onImport,
  onLoadMore,
  onCopyPrompt,
  onDownloadPrompt,
  onGeneratePrompt,
  onOpenSlot,
  onRemovePlayer,
  onRemoveTeam,
  onRenameTeam,
  onSearchChange,
  onSelectTeam,
  onUseSubstitute,
  page,
  prompt,
  results,
  search,
  bench,
  benchSlots,
  slots,
  substituteSource,
  substitutes,
  teams,
  total,
  totalCards,
  totalPages
}: {
  activeSlotId: string | null;
  activeTeamId: string;
  buildMode: "base" | "max";
  formation: LineupFormationKey;
  importingId: string | null;
  isBuildingEfhubBestLineup: boolean;
  isLoadingMore: boolean;
  isSearching: boolean;
  onAddTeam: () => void;
  onAutoFillCollection: () => void;
  onAutoFillEfhub: () => void;
  onClearTeam: () => void;
  onFormationChange: (formation: LineupFormationKey) => void;
  onImport: (result: EfhubSearchResult) => void;
  onLoadMore: () => void;
  onCopyPrompt: () => void;
  onDownloadPrompt: () => void;
  onGeneratePrompt: () => void;
  onOpenSlot: (slotId: string) => void;
  onRemovePlayer: (slotId: string) => void;
  onRemoveTeam: (teamId: string) => void;
  onRenameTeam: (teamId: string, name: string) => void;
  onSearchChange: (value: string) => void;
  onSelectTeam: (teamId: string) => void;
  onUseSubstitute: (player: PlayerCard) => void;
  page: number;
  prompt: string;
  results: EfhubSearchResult[];
  search: string;
  bench: LineupAssignmentMap;
  benchSlots: LineupBenchSlot[];
  slots: LineupSlot[];
  substituteSource: string;
  substitutes: PlayerCard[];
  teams: LineupTeam[];
  total: number;
  totalCards: number;
  totalPages: number;
}) {
  const activeTeam = teams.find((team) => team.id === activeTeamId) ?? teams[0];
  const rankedTeams = teams
    .map((team) => ({ team, stats: getLineupTeamStats(team, buildMode, slots) }))
    .sort((first, second) => second.stats.collectiveStrength - first.stats.collectiveStrength);
  const leaderId = rankedTeams[0]?.team.id ?? null;
  const formationConfig = getLineupFormation(formation);

  return (
    <section className="lineup-page" aria-label="Laboratorio">
      <div className="lineup-page-header">
        <div className="section-title">
          <Shield size={18} />
          <h2>Laboratorio</h2>
        </div>
        <div className="lineup-team-tabs" aria-label="Times">
          {teams.map((team) => (
            <button
              className={team.id === activeTeamId ? "is-active" : ""}
              key={team.id}
              type="button"
              onClick={() => onSelectTeam(team.id)}
            >
              {team.name || "Time sem nome"}
            </button>
          ))}
          <button type="button" onClick={onAddTeam}>
            <Plus size={16} />
            Time
          </button>
        </div>
      </div>

      {activeTeam && (
        <div className="lineup-team-config">
          <label className="text-field">
            <span>Time ativo</span>
            <input
              value={activeTeam.name}
              onChange={(event) => onRenameTeam(activeTeam.id, event.target.value)}
              placeholder="Nome do time"
            />
          </label>
          <label className="text-field">
            <span>Formacao</span>
            <select
              value={formation}
              onChange={(event) => onFormationChange(event.target.value as LineupFormationKey)}
            >
              {lineupFormationOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button className="ghost-button" type="button" onClick={() => onRemoveTeam(activeTeam.id)} disabled={teams.length <= 2}>
            <Trash2 size={17} />
            Remover time
          </button>
        </div>
      )}

      <div className="lineup-comparison-grid">
        {teams.map((team) => (
          <LineupTeamSummary
            isActive={team.id === activeTeamId}
            isLeader={team.id === leaderId}
            key={team.id}
            mode={buildMode}
            onSelect={() => onSelectTeam(team.id)}
            slots={slots}
            team={team}
          />
        ))}
      </div>

      <LineupLab
        activeSlotId={activeSlotId}
        assignments={activeTeam?.assignments ?? {}}
        buildMode={buildMode}
        canAutoFill={totalCards > 0}
        formation={formationConfig}
        importingId={importingId}
        isBuildingEfhubBestLineup={isBuildingEfhubBestLineup}
        isLoadingMore={isLoadingMore}
        isSearching={isSearching}
        onAutoFillCollection={onAutoFillCollection}
        onAutoFillEfhub={onAutoFillEfhub}
        onClear={onClearTeam}
        onImport={onImport}
        onLoadMore={onLoadMore}
        onOpenSlot={onOpenSlot}
        onRemove={onRemovePlayer}
        onSearchChange={onSearchChange}
        page={page}
        results={results}
        search={search}
        bench={bench}
        benchSlots={benchSlots}
        slots={slots}
        substituteSource={substituteSource}
        substitutes={substitutes}
        total={total}
        totalPages={totalPages}
        onUseSubstitute={onUseSubstitute}
      />

      <section className="lineup-prompt-panel" aria-label="Prompt da escalacao">
        <div className="lineup-prompt-header">
          <div className="section-title">
            <Sparkles size={18} />
            <h2>Prompt da escalacao</h2>
          </div>
          <div className="lineup-prompt-actions">
            <button className="primary-button" type="button" onClick={onGeneratePrompt}>
              <Clipboard size={18} />
              Gerar prompt
            </button>
            <button className="ghost-button" type="button" onClick={onCopyPrompt}>
              <Clipboard size={18} />
              Copiar prompt
            </button>
            <button className="ghost-button" type="button" onClick={onDownloadPrompt} disabled={!prompt}>
              <Download size={18} />
              Baixar .txt
            </button>
          </div>
        </div>
        <textarea
          className="prompt-output lineup-prompt-output"
          value={prompt}
          readOnly
          placeholder="Monte o time no campo e gere um prompt para analisar a escalacao no ChatGPT."
        />
      </section>
    </section>
  );
}

function LineupTeamSummary({
  isActive,
  isLeader,
  mode,
  onSelect,
  slots,
  team
}: {
  isActive: boolean;
  isLeader: boolean;
  mode: "base" | "max";
  onSelect: () => void;
  slots: LineupSlot[];
  team: LineupTeam;
}) {
  const stats = getLineupTeamStats(team, mode, slots);

  return (
    <button className={`lineup-team-summary ${isActive ? "is-active" : ""}`} type="button" onClick={onSelect}>
      <span className="lineup-summary-top">
        <strong>{team.name || "Time sem nome"}</strong>
        {isLeader && stats.filled > 0 && <small>melhor forca</small>}
      </span>
      <span className="lineup-summary-number">
        <small>Forca coletiva</small>
        <b>{stats.collectiveStrength}</b>
      </span>
      <span className="lineup-summary-metrics">
        <span>{stats.filled}/{slots.length} cartas</span>
        <span>Media {stats.averageRating || "-"}</span>
      </span>
      <span className="lineup-summary-list">
        {stats.topPlayers.length > 0
          ? stats.topPlayers.map((player) => (
              <span key={player.id}>
                {player.name} {getLineupRating(player, mode)}
              </span>
            ))
          : "Monte esse time no campo"}
      </span>
    </button>
  );
}

function CollectionTile({
  card,
  isSelected,
  onRemove,
  onSelect
}: {
  card: MyCard;
  isSelected: boolean;
  onRemove: () => void;
  onSelect: () => void;
}) {
  const player = card.player;

  return (
    <article className={`collection-tile ${isSelected ? "is-selected" : ""}`}>
      <button className="collection-select" type="button" onClick={onSelect}>
        <div className="collection-art">
          {player.imageUrl ? <img src={player.imageUrl} alt="" /> : <CardMini player={player} />}
          <span className="collection-rating">
            <b>{getCardRating(player)}</b>
            <small>{player.position}</small>
          </span>
        </div>
        <div className="collection-meta">
          <strong>{player.name}</strong>
          <span>{player.version}</span>
          <small>{player.playStyle}</small>
        </div>
      </button>
      <button className="icon-button collection-remove" type="button" aria-label={`Remover ${player.name}`} onClick={onRemove}>
        <Trash2 size={17} />
      </button>
    </article>
  );
}

function LineupLab({
  activeSlotId,
  assignments,
  buildMode,
  canAutoFill,
  formation,
  importingId,
  isBuildingEfhubBestLineup,
  isLoadingMore,
  isSearching,
  onAutoFillCollection,
  onAutoFillEfhub,
  onClear,
  onImport,
  onLoadMore,
  onOpenSlot,
  onRemove,
  onSearchChange,
  onUseSubstitute,
  page,
  results,
  search,
  bench,
  benchSlots,
  slots,
  substituteSource,
  substitutes,
  total,
  totalPages
}: {
  activeSlotId: string | null;
  assignments: LineupAssignmentMap;
  buildMode: "base" | "max";
  canAutoFill: boolean;
  formation: LineupFormationConfig;
  importingId: string | null;
  isBuildingEfhubBestLineup: boolean;
  isLoadingMore: boolean;
  isSearching: boolean;
  onAutoFillCollection: () => void;
  onAutoFillEfhub: () => void;
  onClear: () => void;
  onImport: (result: EfhubSearchResult) => void;
  onLoadMore: () => void;
  onOpenSlot: (slotId: string) => void;
  onRemove: (slotId: string) => void;
  onSearchChange: (value: string) => void;
  onUseSubstitute: (player: PlayerCard) => void;
  page: number;
  results: EfhubSearchResult[];
  search: string;
  bench: LineupAssignmentMap;
  benchSlots: LineupBenchSlot[];
  slots: LineupSlot[];
  substituteSource: string;
  substitutes: PlayerCard[];
  total: number;
  totalPages: number;
}) {
  const activeFieldSlot = slots.find((slot) => slot.id === activeSlotId) ?? null;
  const activeBenchSlot = benchSlots.find((slot) => slot.id === activeSlotId) ?? null;
  const activeSlot = activeFieldSlot ?? activeBenchSlot;
  const filledCount = slots.filter((slot) => assignments[slot.id]).length;
  const benchCount = benchSlots.filter((slot) => bench[slot.id]).length;

  return (
    <section className="lineup-lab-panel" aria-label="Laboratorio de escalacao">
      <div className="lineup-lab-header">
        <div className="section-title">
          <Shield size={18} />
          <h2>Laboratorio de escalacao</h2>
        </div>
        <div className="lineup-lab-actions">
          <span>{formation.label}</span>
          <span>{filledCount}/{slots.length} titulares</span>
          <span>{benchCount}/{benchSlots.length} banco</span>
          <button className="primary-button" type="button" onClick={onAutoFillEfhub} disabled={isBuildingEfhubBestLineup}>
            <Sparkles size={17} />
            {isBuildingEfhubBestLineup ? "Buscando EFHub" : "Melhor EFHub"}
          </button>
          <button className="ghost-button" type="button" onClick={onAutoFillCollection} disabled={!canAutoFill}>
            <Users size={17} />
            Colecao
          </button>
          <button className="ghost-button" type="button" onClick={onClear} disabled={filledCount === 0 && benchCount === 0}>
            Limpar
          </button>
        </div>
      </div>

      <div className="lineup-lab-layout">
        <div className="lineup-board">
          <div className="lineup-pitch">
            <div className="pitch-center-circle" />
            <div className="pitch-box pitch-box-top" />
            <div className="pitch-box pitch-box-bottom" />
            {slots.map((slot) => {
              const assignedPlayer = assignments[slot.id];
              const isActive = slot.id === activeSlotId;

              return (
                <div
                  className={`lineup-slot ${isActive ? "is-active" : ""} ${assignedPlayer ? "has-player" : ""}`}
                  key={slot.id}
                  style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                >
                  <button className="lineup-slot-button" type="button" onClick={() => onOpenSlot(slot.id)}>
                    {assignedPlayer ? (
                      <LineupPlayerCard player={assignedPlayer} slotLabel={slot.label} mode={buildMode} />
                    ) : (
                      <span className="lineup-empty-slot">
                        <X size={24} />
                        <small>{slot.label}</small>
                      </span>
                    )}
                  </button>
                  {assignedPlayer && (
                    <button
                      className="lineup-slot-remove"
                      type="button"
                      aria-label={`Remover ${assignedPlayer.name}`}
                      onClick={() => onRemove(slot.id)}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              );
            })}
            <span className="lineup-formation-label">{formation.label}</span>
            <span className="lineup-style-label">{formation.style}</span>
          </div>

          <section className="lineup-bench-panel" aria-label="Banco de reservas">
            <div className="lineup-bench-header">
              <strong>Banco de reservas</strong>
              <span>{benchCount}/12</span>
            </div>
            <div className="lineup-bench-grid">
              {benchSlots.map((slot) => {
                const assignedPlayer = bench[slot.id];
                const isActive = slot.id === activeSlotId;

                return (
                  <div
                    className={`lineup-bench-slot ${isActive ? "is-active" : ""} ${assignedPlayer ? "has-player" : ""}`}
                    key={slot.id}
                  >
                    <button type="button" onClick={() => onOpenSlot(slot.id)}>
                      {assignedPlayer ? (
                        <LineupBenchPlayer player={assignedPlayer} slotLabel={slot.label} mode={buildMode} />
                      ) : (
                        <span className="lineup-bench-empty">
                          <X size={20} />
                          <small>{slot.label}</small>
                        </span>
                      )}
                    </button>
                    {assignedPlayer && (
                      <button
                        className="lineup-bench-remove"
                        type="button"
                        aria-label={`Remover ${assignedPlayer.name} do banco`}
                        onClick={() => onRemove(slot.id)}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="lineup-search-panel">
          <div>
            <strong>{activeSlot ? `Escolher ${getLineupSlotDisplayName(activeSlot)}` : "Clique em um X"}</strong>
            <span>{activeSlot ? "Busca EFHub" : "Slot vazio"}</span>
          </div>
          {activeFieldSlot && (
            <div className="lineup-substitute-section">
              <div className="lineup-substitute-title">
                <strong>Substitutos sugeridos</strong>
                <span>{substituteSource}</span>
              </div>
              {substitutes.length > 0 ? (
                <div className="lineup-substitute-list">
                  {substitutes.map((player) => (
                    <button
                      className="lineup-substitute-card"
                      key={player.id}
                      type="button"
                      onClick={() => onUseSubstitute(player)}
                    >
                      <img src={player.imageUrl} alt="" />
                      <span>
                        <strong>{player.name}</strong>
                        <small>
                          {player.position} {getLineupRating(player, buildMode)} | Cond. {player.condition}
                        </small>
                      </span>
                      <Plus size={16} />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="empty-state">Monte pelo Melhor EFHub para ver ate 10 alternativas.</p>
              )}
            </div>
          )}
          <label className="search-field">
            <Search size={18} />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={activeSlot ? "Buscar jogador" : "Selecione um slot"}
              disabled={!activeSlot}
            />
          </label>
          <div className="lineup-search-results">
            {isSearching && <p className="empty-state">Buscando cartas...</p>}
            {!isSearching && activeSlot && search.trim().length >= 2 && results.length === 0 && (
              <p className="empty-state">Nenhuma carta encontrada.</p>
            )}
            {!isSearching && results.length > 0 && (
              <div className="result-count">
                {results.length} de {total} cartas
              </div>
            )}
            {results.map((result) => (
              <article className="lineup-result-card" key={result.id}>
                <img src={result.imageUrl} alt="" />
                <div>
                  <strong>{result.name}</strong>
                  <span>
                    {result.position} {result.overall} | {result.team}
                  </span>
                  <small>{result.playingStyle}</small>
                </div>
                <button
                  className="icon-button"
                  type="button"
                  aria-label={`Escalar ${result.name}`}
                  onClick={() => onImport(result)}
                  disabled={importingId === result.id}
                >
                  <Plus size={17} />
                </button>
              </article>
            ))}
            {!isSearching && page < totalPages && (
              <button className="ghost-button full" type="button" onClick={onLoadMore} disabled={isLoadingMore}>
                <Search size={18} />
                {isLoadingMore ? "Carregando" : "Carregar mais"}
              </button>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

function LineupPlayerCard({
  mode,
  player,
  slotLabel
}: {
  mode: "base" | "max";
  player: PlayerCard;
  slotLabel: string;
}) {
  const rating = mode === "max" ? player.maxOverall : player.overall;

  return (
    <span className="lineup-player-card">
      <span className="lineup-player-rating">
        <b>{rating}</b>
        <small>{slotLabel}</small>
      </span>
      {player.imageUrl && <img src={player.imageUrl} alt="" />}
      <strong>{player.name}</strong>
    </span>
  );
}

function LineupBenchPlayer({
  mode,
  player,
  slotLabel
}: {
  mode: "base" | "max";
  player: PlayerCard;
  slotLabel: string;
}) {
  const rating = getLineupRating(player, mode);

  return (
    <span className="lineup-bench-player">
      {player.imageUrl && <img src={player.imageUrl} alt="" />}
      <span>
        <b>{rating}</b>
        <small>{slotLabel}</small>
      </span>
      <strong>{player.name}</strong>
      <em>{player.position}</em>
    </span>
  );
}

function CardMini({ player }: { player: PlayerCard }) {
  const rating = getCardRating(player);

  return (
    <span className="card-mini" aria-label={`${player.name} ${rating}`}>
      <b>{rating}</b>
      <small>{player.position}</small>
    </span>
  );
}

function getCardRating(player: PlayerCard) {
  return player.maxAttributes ? player.maxOverall : player.overall;
}

function getLineupRating(player: PlayerCard, mode: "base" | "max") {
  return mode === "max" ? player.maxOverall : player.overall;
}

function getLineupTeamStats(team: LineupTeam, mode: "base" | "max", slots: LineupSlot[]) {
  const players = slots
    .map((slot) => team.assignments[slot.id])
    .filter((player): player is PlayerCard => Boolean(player));
  const ratings = players.map((player) => getLineupRating(player, mode));
  const totalRating = ratings.reduce((sum, rating) => sum + rating, 0);
  const averageRating = ratings.length > 0 ? Math.round(totalRating / ratings.length) : 0;
  const collectiveStrength = totalRating * 3;
  const topPlayers = [...players]
    .sort((first, second) => getLineupRating(second, mode) - getLineupRating(first, mode))
    .slice(0, 3);

  return {
    averageRating,
    collectiveStrength,
    filled: players.length,
    topPlayers,
    totalRating
  };
}

function buildBestLineupAssignments(players: PlayerCard[], mode: "base" | "max", slots: LineupSlot[]) {
  let plans = new Map<number, { assignments: LineupAssignmentMap; score: number }>();
  plans.set(0, { assignments: {}, score: 0 });

  for (const player of players) {
    const nextPlans = new Map(plans);

    for (const [mask, plan] of plans) {
      slots.forEach((slot, index) => {
        if (mask & (1 << index)) {
          return;
        }

        const slotScore = getAutoLineupSlotScore(player, slot, mode);

        if (slotScore <= 0) {
          return;
        }

        const nextMask = mask | (1 << index);
        const nextScore = plan.score + slotScore;
        const currentPlan = nextPlans.get(nextMask);

        if (!currentPlan || nextScore > currentPlan.score) {
          nextPlans.set(nextMask, {
            assignments: {
              ...plan.assignments,
              [slot.id]: player
            },
            score: nextScore
          });
        }
      });
    }

    plans = nextPlans;
  }

  const bestPlan = [...plans.values()].sort((first, second) => {
    const filledDiff = Object.keys(second.assignments).length - Object.keys(first.assignments).length;
    return filledDiff || second.score - first.score;
  })[0];

  return bestPlan?.assignments ?? {};
}

function getLineupSubstitutes(
  players: PlayerCard[],
  assignments: LineupAssignmentMap,
  slot: LineupSlot,
  mode: "base" | "max",
  limit: number
) {
  const assignedPlayerIds = new Set(
    Object.entries(assignments)
      .filter(([slotId]) => slotId !== slot.id)
      .map(([, player]) => player.id)
  );

  return players
    .filter((player) => !assignedPlayerIds.has(player.id) && assignments[slot.id]?.id !== player.id)
    .map((player) => ({
      player,
      score: getAutoLineupSlotScore(player, slot, mode)
    }))
    .filter((item) => item.score > 0)
    .sort((first, second) => second.score - first.score)
    .slice(0, limit)
    .map((item) => item.player);
}

function isLineupBenchSlotId(slotId: string | null) {
  return Boolean(slotId && lineupBenchSlots.some((slot) => slot.id === slotId));
}

function removeLineupSlotFromMap(assignments: LineupAssignmentMap, slotId: string) {
  const next = { ...assignments };
  delete next[slotId];
  return next;
}

function removeLineupPlayerFromMap(assignments: LineupAssignmentMap, playerId: string) {
  return Object.fromEntries(
    Object.entries(assignments).filter(([, player]) => player.id !== playerId)
  ) as LineupAssignmentMap;
}

function getLineupSlotDisplayName(slot: LineupSlot | LineupBenchSlot) {
  return "title" in slot ? slot.title : slot.label;
}

function buildLineupAnalysisPrompt(options: {
  activeTeam: LineupTeam;
  teams: LineupTeam[];
  formation: LineupFormationConfig;
  mode: "base" | "max";
  candidatePool: PlayerCard[];
  substituteSource: string;
}) {
  const exportMode = options.mode === "max" ? "MAX" : "BASE";
  const activeStats = getLineupTeamStats(options.activeTeam, options.mode, options.formation.slots);
  const activeBenchCount = lineupBenchSlots.filter((slot) => options.activeTeam.bench?.[slot.id]).length;
  const teamSummaryLines = options.teams.map((team, index) =>
    formatLineupTeamSummaryLine(team, index, options.mode, options.formation.slots)
  );
  const activeLineupLines = options.formation.slots.map((slot, index) =>
    formatLineupSlotPromptLine(slot, options.activeTeam.assignments[slot.id], index, options.mode)
  );
  const activeBenchLines = lineupBenchSlots.map((slot, index) =>
    formatLineupSlotPromptLine(slot, options.activeTeam.bench?.[slot.id], index, options.mode)
  );
  const benchLines = formatLineupBenchSuggestionLines(
    options.candidatePool,
    options.activeTeam.assignments,
    options.activeTeam.bench ?? {},
    options.formation.slots,
    options.mode
  );

  return [
    "# Analise de escalacao - eFootball",
    "",
    "Quero que voce atue como analista avancado de time no eFootball.",
    "",
    "## Contexto da escalacao",
    `- Time ativo: ${options.activeTeam.name || "Time sem nome"}`,
    `- Formacao: ${options.formation.label}`,
    `- Estilo planejado: ${options.formation.style}`,
    `- Modo da exportacao: ${exportMode}`,
    `- Observacao do modo: ${options.mode === "max" ? "overalls e atributos consideram o potencial maximo das cartas." : "overalls e atributos consideram as cartas em estado base."}`,
    `- Forca coletiva estimada: ${activeStats.collectiveStrength}`,
    `- Media de overall: ${activeStats.averageRating || "nao calculada"}`,
    `- Jogadores preenchidos: ${activeStats.filled}/${options.formation.slots.length}`,
    `- Reservas preenchidos: ${activeBenchCount}/12`,
    `- Fonte dos substitutos: ${options.substituteSource}`,
    "",
    "## Times comparados",
    "",
    teamSummaryLines.join("\n"),
    "",
    "## Escalacao do time ativo",
    "",
    activeLineupLines.join("\n"),
    "",
    "## Banco do time ativo",
    "",
    activeBenchLines.join("\n"),
    "",
    "## Alternativas sugeridas pela fonte",
    "",
    benchLines.length > 0
      ? benchLines.join("\n")
      : "Sem banco sugerido. Se necessario, avalie apenas os jogadores escalados.",
    "",
    "## Instrucao final",
    "",
    "Com base nessa escalacao, entregue:",
    "",
    "1. se esse time vale a pena para jogar competitivo;",
    "2. pontos fortes e fracos do time ativo;",
    "3. melhor funcao de cada jogador na formacao;",
    "4. jogadores que destoam mesmo com overall alto;",
    "5. substituicoes recomendadas usando as alternativas listadas;",
    "6. banco ideal e prioridades de troca;",
    "7. ajustes de instrucoes individuais;",
    "8. comparacao entre os times montados;",
    "9. melhor formacao entre as opcoes comparadas, se houver conflito;",
    "10. explicacao clara quando encaixe tatico for mais importante que overall."
  ].join("\n");
}

function formatLineupTeamSummaryLine(
  team: LineupTeam,
  index: number,
  mode: "base" | "max",
  slots: LineupSlot[]
) {
  const stats = getLineupTeamStats(team, mode, slots);
  const benchCount = lineupBenchSlots.filter((slot) => team.bench?.[slot.id]).length;
  const compactLineup = slots
    .map((slot) => {
      const player = team.assignments[slot.id];

      return player ? `${slot.label}: ${player.name} ${getLineupRating(player, mode)}` : `${slot.label}: vazio`;
    })
    .join(" | ");

  return `${index + 1}. ${team.name || "Time sem nome"} | Forca coletiva: ${stats.collectiveStrength} | Media: ${stats.averageRating || "-"} | Titulares: ${stats.filled}/${slots.length} | Banco: ${benchCount}/12 | ${compactLineup}`;
}

function formatLineupSlotPromptLine(
  slot: LineupSlot | LineupBenchSlot,
  player: PlayerCard | undefined,
  index: number,
  mode: "base" | "max"
) {
  if (!player) {
    return `${index + 1}. ${getLineupSlotDisplayName(slot)}: vazio`;
  }

  const slotRating =
    "title" in slot ? getLineupRating(player, mode) : getLineupSlotRating(player, slot.label, mode) || getLineupRating(player, mode);

  return [
    `${index + 1}. ${getLineupSlotDisplayName(slot)}: ${player.name}`,
    `Carta: ${player.version}`,
    `Pos principal: ${player.position}`,
    `Overall: ${player.overall}->${player.maxOverall}`,
    `Rating no slot: ${slotRating}`,
    `Estilo: ${player.playStyle}`,
    `Condicao: ${player.condition}`,
    `Pe: ${player.foot}`,
    `Altura: ${player.height}cm`,
    `Booster: ${getCompactBoosters(player)}`,
    `Atributos-chave ${mode === "max" ? "max" : "base"}: ${formatTopAttributes(player, 7, mode)}`,
    `Habilidades-chave: ${formatKeySkills(player.skills)}`,
    player.sourceUrl ? `Link EFHub: ${player.sourceUrl}` : ""
  ]
    .filter(Boolean)
    .join(" | ");
}

function formatLineupBenchSuggestionLines(
  candidatePool: PlayerCard[],
  assignments: LineupAssignmentMap,
  bench: LineupAssignmentMap,
  slots: LineupSlot[],
  mode: "base" | "max"
) {
  const selectedIds = new Set([...Object.values(assignments), ...Object.values(bench)].map((player) => player.id));
  const suggested = new Map<string, { player: PlayerCard; slots: Set<string>; score: number }>();
  const unavailablePlayers = {
    ...assignments,
    ...bench
  };

  for (const slot of slots) {
    const substitutes = getLineupSubstitutes(candidatePool, unavailablePlayers, slot, mode, 4);

    for (const player of substitutes) {
      if (selectedIds.has(player.id)) {
        continue;
      }

      const score = getAutoLineupSlotScore(player, slot, mode);
      const current = suggested.get(player.id);

      if (current) {
        current.slots.add(slot.label);
        current.score = Math.max(current.score, score);
      } else {
        suggested.set(player.id, {
          player,
          slots: new Set([slot.label]),
          score
        });
      }
    }
  }

  return [...suggested.values()]
    .sort((first, second) => second.score - first.score)
    .slice(0, 10)
    .map(({ player, slots }, index) =>
      [
        `${index + 1}. ${player.name}`,
        `Carta: ${player.version}`,
        `Uso sugerido: ${[...slots].join("/")}`,
        `Pos principal: ${player.position}`,
        `Overall: ${player.overall}->${player.maxOverall}`,
        `Condicao: ${player.condition}`,
        `Atributos-chave ${mode === "max" ? "max" : "base"}: ${formatTopAttributes(player, 5, mode)}`,
        `Habilidades-chave: ${formatKeySkills(player.skills)}`
      ].join(" | ")
    );
}

function getAutoLineupSlotScore(player: PlayerCard, slot: LineupSlot, mode: "base" | "max") {
  const positionFit = getSlotPositionFit(player.position, slot.label);

  if (positionFit === 0) {
    return 0;
  }

  const slotRating = getLineupSlotRating(player, slot.label, mode);

  if (slotRating < getMinimumSlotRating(slot.label)) {
    return 0;
  }

  const primaryBonus = positionFit === 2 ? 350 : 120;
  const conditionBonus = getConditionBonus(player.condition) * 10;

  return slotRating * 100 + getLineupRating(player, mode) * 2 + primaryBonus + conditionBonus;
}

function getLineupSlotRating(player: PlayerCard, slotPosition: string, mode: "base" | "max") {
  const positions = getPositionsForMode(player, mode);
  const fallbackPositions: Record<string, string[]> = {
    ALE: ["LE", "MLE"],
    ALD: ["LD", "MLD"]
  };
  const ratingPositions = [slotPosition, ...(fallbackPositions[slotPosition] ?? [])];

  for (const position of ratingPositions) {
    const rating = positions[position];

    if (rating !== undefined) {
      return rating;
    }
  }

  return player.position === slotPosition ? getLineupRating(player, mode) : 0;
}

function getSlotPositionFit(playerPosition: string, slotPosition: string) {
  if (playerPosition === slotPosition) {
    return 2;
  }

  const compatiblePositions: Record<string, string[]> = {
    PTE: ["MLE", "SA", "CA"],
    CA: ["SA"],
    PTD: ["MLD", "SA", "CA"],
    SA: ["CA", "PTE", "PTD", "MAT"],
    MAT: ["SA", "MLG", "MLE", "MLD"],
    MLE: ["PTE", "MLG", "MAT"],
    MLD: ["PTD", "MLG", "MAT"],
    MLG: ["VOL", "MAT", "MLE", "MLD"],
    VOL: ["MLG", "ZC"],
    ALE: ["LE", "MLE"],
    LE: ["ALE"],
    ZC: [],
    ALD: ["LD", "MLD"],
    LD: ["ALD"],
    GO: []
  };

  return compatiblePositions[slotPosition]?.includes(playerPosition) ? 1 : 0;
}

function getMinimumSlotRating(position: string) {
  if (position === "GO") return 70;
  if (position === "ZC" || position === "LE" || position === "LD" || position === "ALE" || position === "ALD") return 68;
  return 70;
}

function getConditionBonus(condition: string) {
  const normalizedCondition = condition.trim().toUpperCase().slice(0, 1);
  const bonuses: Record<string, number> = {
    A: 4,
    B: 2,
    C: 0,
    D: -2,
    E: -4
  };

  return bonuses[normalizedCondition] ?? 0;
}

function createClientId() {
  if (globalThis.crypto && "randomUUID" in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }

  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function PlayerCardPreview({ player, overall }: { player: PlayerCard; overall: number }) {
  return (
    <div className="card-preview">
      <div className="card-glow" />
      <div className="card-rating">
        <b>{overall}</b>
        <span>{player.position}</span>
      </div>
      <div className="card-silhouette">
        {player.imageUrl ? <img src={player.imageUrl} alt="" /> : <Star size={76} strokeWidth={1.2} />}
      </div>
      <div className="card-footer">
        <strong>{player.name}</strong>
        <span>{player.club}</span>
      </div>
    </div>
  );
}

function PositionBoard({
  positions,
  primaryPosition
}: {
  positions: Record<string, number>;
  primaryPosition: string;
}) {
  return (
    <div className="position-board">
      {positionMapCells.map((cell) => {
        const value = positions[cell.position];
        const isPrimary = cell.position === primaryPosition;
        const isStrong = value !== undefined && value >= 90;

        return (
          <span
            className={`position-cell position-${cell.area} ${isPrimary ? "is-primary" : ""} ${isStrong ? "is-strong" : ""}`}
            key={cell.position}
            style={{ gridArea: cell.area }}
          >
            <small>{cell.position}</small>
            <strong>{value ?? "--"}</strong>
          </span>
        );
      })}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span className="metric">
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}

function BuildSummary({ player }: { player: PlayerCard }) {
  if (!player.maxBuild) {
    return null;
  }

  return (
    <section className="build-summary">
      <div className="summary-metrics">
        <Metric label="Nivel" value={String(player.maxBuild.levelCap)} />
        <Metric label="Pontos" value={`${player.maxBuild.pointsUsed}/${player.maxBuild.totalPoints}`} />
        {player.maxBuild.overallWithoutManager && (
          <Metric label="MAX sem tecnico" value={String(player.maxBuild.overallWithoutManager)} />
        )}
        <Metric label="MAX com tecnico" value={String(player.maxOverall)} />
      </div>
      <div className="summary-block">
        <h3>Sliders</h3>
        <div className="chip-list">
          {Object.entries(player.maxBuild.sliders)
            .filter(([, value]) => value > 0)
            .map(([key, value]) => (
              <span key={key}>
                {sliderLabels[key] ?? key} {value}
              </span>
            ))}
        </div>
      </div>
      <div className="summary-block">
        <h3>Contexto</h3>
        <div className="chip-list">
          {player.maxBuild.playerBoosts?.map((boost) => <span key={boost}>{boost}</span>)}
          {player.maxBuild.manager && (
            <span>
              {player.maxBuild.manager.name}: {player.maxBuild.manager.boosts.join(", ")}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

function AttributeGroup({ title, values }: { title: string; values: Record<string, number> }) {
  return (
    <article className="attribute-group">
      <h3>{title}</h3>
      {Object.entries(values).map(([name, value]) => (
        <div className="attribute-row" key={name}>
          <span>{name}</span>
          <meter min="0" max="100" value={value} />
          <b className={value >= 85 ? "elite" : value <= 55 ? "low" : ""}>{value}</b>
        </div>
      ))}
    </article>
  );
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message ?? "Erro inesperado na API.");
  }

  return payload as T;
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall back below when the browser denies the async clipboard API.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error("Nao consegui copiar automaticamente.");
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Algo saiu fora do esperado.";
}

function getDisplayBuild(player: PlayerCard, mode: "base" | "max") {
  const canUseMax = mode === "max" && player.maxAttributes;

  return {
    overall: canUseMax ? player.maxOverall : player.overall,
    attributes: canUseMax ? player.maxAttributes! : player.attributes,
    positions: canUseMax ? (player.maxPositions ?? player.positions) : player.positions
  };
}

function getDisplayBoosters(player: PlayerCard) {
  const managerBoosters =
    player.maxBuild?.manager?.boosts.map((boost) => `${player.maxBuild?.manager?.name}: ${boost}`) ?? [];
  const boosters = [...player.boosters, ...managerBoosters];

  return boosters.length > 0 ? boosters : ["Sem boosters"];
}

function buildPromptAnaliseElenco(options: {
  cards: MyCard[];
  meta: Record<string, AnalysisCardMeta>;
  formation: string;
  coach: string;
  playstyle: string;
  coachBoost: string;
  focus: string;
  priority: string;
  filter: AnalysisFilter;
  sort: AnalysisSort;
  position: string;
  mode: "base" | "max";
}) {
  const exportMode = options.mode === "max" ? "MAX" : "BASE";
  const modeObservation =
    options.mode === "max"
      ? "atributos e overalls consideram o potencial maximo da carta."
      : "atributos e overalls consideram a carta no estado base/sem evolucao.";
  const duplicateKeys = getDuplicateKeys(options.cards);
  const filteredCards = sortAnalysisCards(
    filterAnalysisCards(options.cards, options.meta, duplicateKeys, options.filter, options.position),
    options.meta,
    duplicateKeys,
    options.sort
  );
  const importantCards = filteredCards.filter((card) => isMarkedImportant(options.meta[card.playerId]));

  const playerLines = filteredCards.map((card, index) =>
    formatAnalysisPlayerLine(card, index, options.meta[card.playerId], duplicateKeys, options.mode)
  );

  const detailLines = importantCards.map((card) =>
    formatAnalysisPriorityDetails(card, options.meta[card.playerId], duplicateKeys)
  );

  return [
    "# Analise avancada de elenco - eFootball",
    "",
    "Quero que voce atue como analista avancado de elenco no eFootball.",
    "",
    "## Contexto geral",
    `- Objetivo da analise: avaliar a colecao e indicar o melhor uso competitivo das cartas.`,
    `- Formacao desejada: ${options.formation || "nao informada"}.`,
    `- Estilo de jogo/tecnico considerado: ${options.coach || "nao informado"} | ${options.playstyle || "nao informado"}.`,
    `- Total de jogadores: ${filteredCards.length} exportados de ${options.cards.length} na colecao.`,
    `- Criterios de analise: encaixe tatico, posicoes uteis, potencial base->max, atributos relevantes, habilidades, condicao, pe dominante, altura, boosters, duplicidade e prioridade marcada pelo usuario.`,
    `- O que deve ser entregue: titulares, banco, prioridades de treino, cartas para guardar, cartas redundantes e possiveis dispensas.`,
    "",
    "## Configuracao global",
    `- Formacao desejada: ${options.formation || "nao informada"}`,
    `- Tecnico: ${options.coach || "nao informado"}`,
    `- Estilo de jogo: ${options.playstyle || "nao informado"}`,
    `- Boost do tecnico: ${options.coachBoost || "nenhum"}`,
    `- Modo da exportacao: ${exportMode}`,
    `- Observacao do modo: ${modeObservation}`,
    `- Foco da analise: ${options.focus}`,
    `- Prioridade: ${options.priority}`,
    `- Filtro aplicado: ${analysisFilterLabel(options.filter)}${options.filter === "posicao" ? ` (${options.position})` : ""}`,
    `- Ordenacao: ${analysisSortLabel(options.sort)}`,
    "",
    "## Lista compacta dos jogadores",
    "",
    playerLines.length > 0 ? playerLines.join("\n") : "Nenhum jogador encontrado com os filtros atuais.",
    "",
    ...(detailLines.length > 0
      ? [
          "## Detalhes extras de cartas prioritarias",
          "",
          detailLines.join("\n\n"),
          ""
        ]
      : []),
    "## Instrucao final",
    "",
    "Com base nessa colecao, entregue:",
    "",
    "1. melhor time titular na formacao desejada;",
    "2. banco ideal;",
    "3. jogadores que devo evoluir primeiro;",
    "4. jogadores que devo guardar;",
    "5. jogadores que posso dispensar;",
    "6. jogadores redundantes;",
    "7. melhores funcoes por posicao;",
    "8. pontos fracos do elenco;",
    "9. ajustes de instrucoes individuais;",
    "10. conflitos entre overall e encaixe tatico, explicando qual escolha faz mais sentido."
  ].join("\n");
}

function formatAnalysisPlayerLine(
  card: MyCard,
  index: number,
  meta: AnalysisCardMeta | undefined,
  duplicateKeys: Set<string>,
  mode: "base" | "max"
) {
  const player = card.player;
  const status = formatAnalysisMarkers(card, meta, duplicateKeys);
  const boosters = getCompactBoosters(player);
  const positions = getAnalysisPositions(player, mode);

  return [
    `${index + 1}. ${player.name}`,
    `Carta: ${player.version}`,
    `Pos principal: ${player.position}`,
    positions
      ? `Pos uteis: ${positions.usefulPositions}`
      : `Pos: ${formatUsefulPositions(player, mode)}`,
    positions?.backupPositions ? `Quebra-galho: ${positions.backupPositions}` : "",
    `Overall: ${player.overall}->${player.maxOverall}`,
    `Estilo: ${player.playStyle}`,
    `Condicao: ${player.condition}`,
    `Pe: ${player.foot}`,
    `Altura: ${player.height}cm`,
    `Booster: ${boosters}`,
    `Principais atributos ${mode === "max" ? "max" : "base"}: ${formatTopAttributes(player, 8, mode)}`,
    `Habilidades-chave: ${formatKeySkills(player.skills)}`,
    `Status: ${status}`
  ]
    .filter(Boolean)
    .join(" | ");
}

function formatAnalysisPriorityDetails(
  card: MyCard,
  meta: AnalysisCardMeta | undefined,
  duplicateKeys: Set<string>
) {
  const player = card.player;
  const tags = meta?.tags?.map(analysisTagLabel).join(", ") || "marcada";

  return [
    `### ${player.name} - ${player.version}`,
    `- Marcadores: ${tags}`,
    `- Status: ${formatAnalysisMarkers(card, meta, duplicateKeys)}`,
    `- Posicoes base: ${formatPositionRatingsClient(player.positions)}`,
    player.maxPositions ? `- Posicoes MAX: ${formatPositionRatingsClient(player.maxPositions)}` : "",
    player.maxBuild ? `- Sliders MAX: ${formatSlidersClient(player.maxBuild.sliders)}` : "",
    player.sourceUrl ? `- Link EFHub: ${player.sourceUrl}` : "",
    `- Atributos base completos:\n${formatAttributesClient(player.attributes)}`,
    player.maxAttributes ? `- Atributos MAX completos:\n${formatAttributesClient(player.maxAttributes)}` : "",
    `- Observacoes: ${card.customNotes || player.notes || "sem observacoes"}`
  ]
    .filter(Boolean)
    .join("\n");
}

function filterAnalysisCards(
  cards: MyCard[],
  metaMap: Record<string, AnalysisCardMeta>,
  duplicateKeys: Set<string>,
  filter: AnalysisFilter,
  position: string
) {
  return cards.filter((card) => {
    const meta = metaMap[card.playerId];

    if (filter === "todos") return true;
    if (filter === "naoEvoluidos") return isTrainableCard(card.player);
    if (filter === "especiais") return isSpecialCard(card.player);
    if (filter === "epicos") return isEpicCard(card.player, meta);
    if (filter === "duplicados") return isDuplicateCard(card, meta, duplicateKeys);
    if (filter === "favoritos") return hasTag(meta, "favorito");
    if (filter === "dispensa") return hasTag(meta, "possivelDispensa");
    if (filter === "posicao") return position === "Todas" || formatUsefulPositions(card.player, "max").split("/").includes(position);

    return true;
  });
}

function sortAnalysisCards(
  cards: MyCard[],
  metaMap: Record<string, AnalysisCardMeta>,
  duplicateKeys: Set<string>,
  sort: AnalysisSort
) {
  return [...cards].sort((a, b) => {
    if (sort === "overallMax") return b.player.maxOverall - a.player.maxOverall;
    if (sort === "position") return positionSortValue(a.player.position) - positionSortValue(b.player.position);
    if (sort === "cardType") return a.player.version.localeCompare(b.player.version);
    if (sort === "status") {
      return formatAnalysisMarkers(a, metaMap[a.playerId], duplicateKeys).localeCompare(
        formatAnalysisMarkers(b, metaMap[b.playerId], duplicateKeys)
      );
    }
    if (sort === "priority") {
      return (
        priorityScore(b, metaMap[b.playerId], duplicateKeys) -
        priorityScore(a, metaMap[a.playerId], duplicateKeys)
      );
    }

    return 0;
  });
}

function getDuplicateKeys(cards: MyCard[]) {
  const counts = new Map<string, number>();

  for (const card of cards) {
    const key = duplicateKey(card.player);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return new Set(
    [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([key]) => key)
  );
}

function duplicateKey(player: PlayerCard) {
  return normalizeText(`${player.name}|${player.version}|${player.overall}|${player.position}`);
}

function isDuplicateCard(card: MyCard, meta: AnalysisCardMeta | undefined, duplicateKeys: Set<string>) {
  return duplicateKeys.has(duplicateKey(card.player)) || hasTag(meta, "duplicado") || meta?.status === "duplicado";
}

function isMarkedImportant(meta: AnalysisCardMeta | undefined) {
  return Boolean(meta?.tags?.length || (meta?.status && meta.status !== "naoEvoluido"));
}

function getResolvedAnalysisStatus(card: MyCard | null, meta?: AnalysisCardMeta): AnalysisStatus {
  if (meta?.status) return meta.status;

  return "naoEvoluido";
}

function defaultAnalysisStatus(card: MyCard | null) {
  return getResolvedAnalysisStatus(card);
}

function formatAnalysisMarkers(card: MyCard, meta: AnalysisCardMeta | undefined, duplicateKeys: Set<string>) {
  const markers = new Set<string>();
  const manualStatus = meta?.status;

  markers.add(manualStatus === "evoluido" ? "carta pronta" : isTrainableCard(card.player) ? "treinavel" : "carta pronta");

  if (manualStatus === "trancado") markers.add("protegido");
  if (manualStatus === "duplicado") markers.add("duplicado");
  if (manualStatus === "emUso") markers.add("em uso");

  if (hasTag(meta, "favorito")) markers.add("favorito");
  if (hasTag(meta, "possivelTitular")) markers.add("possivel titular");
  if (hasTag(meta, "possivelDispensa")) markers.add("possivel dispensa");
  if (hasTag(meta, "prioridadeTreino")) markers.add("prioridade de treino");
  if (hasTag(meta, "protegido")) markers.add("protegido");
  if (hasTag(meta, "duplicado") || duplicateKeys.has(duplicateKey(card.player))) markers.add("duplicado");

  return [...markers].join(", ");
}

function getCompactBoosters(player: PlayerCard) {
  return player.boosters.length > 0 ? player.boosters.join(", ") : "nenhum";
}

function isTrainableCard(player: PlayerCard) {
  return (player.maxBuild?.levelCap ?? 1) > 1;
}

function getPositionsForMode(player: PlayerCard, mode: "base" | "max") {
  return mode === "max" ? (player.maxPositions ?? player.positions) : player.positions;
}

function formatUsefulPositions(player: PlayerCard, mode: "base" | "max") {
  const positions = getPositionsForMode(player, mode);
  const selectedOverall = mode === "max" ? player.maxOverall : player.overall;
  const maxRating = Math.max(...Object.values(positions), selectedOverall);
  const threshold = Math.max(80, maxRating - 5);
  const usefulPositions = analysisPositionOptions
    .filter((position) => position !== "Todas")
    .filter((position) => position === player.position || (positions[position] ?? 0) >= threshold);

  return usefulPositions.length > 0 ? usefulPositions.join("/") : player.position;
}

function getAnalysisPositions(player: PlayerCard, mode: "base" | "max") {
  const positions = getPositionsForMode(player, mode);
  const mainRating = positions[player.position] ?? (mode === "max" ? player.maxOverall : player.overall);

  if (Object.keys(positions).length <= 1) {
    return null;
  }

  const usefulPositions = analysisPositionOptions
    .filter((position) => position !== "Todas" && position !== player.position)
    .filter((position) => (positions[position] ?? 0) >= Math.max(80, mainRating - 5));
  const backupPositions = analysisPositionOptions
    .filter((position) => position !== "Todas" && position !== player.position)
    .filter((position) => {
      const value = positions[position] ?? 0;
      return value >= Math.max(72, mainRating - 12) && value < Math.max(80, mainRating - 5);
    });

  return {
    usefulPositions: usefulPositions.length > 0 ? usefulPositions.join("/") : "nenhuma",
    backupPositions: backupPositions.join("/")
  };
}

function formatTopAttributes(player: PlayerCard, limit: number, mode: "base" | "max") {
  const attributes = mode === "max" ? (player.maxAttributes ?? player.attributes) : player.attributes;
  const topAttributes = Object.values(attributes)
    .flatMap((values) => Object.entries(values).map(([name, value]) => ({ name, value })))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
    .map((item) => `${item.name} ${item.value}`);

  return topAttributes.length > 0 ? topAttributes.join(", ") : "nao informado";
}

function formatKeySkills(skills: string[]) {
  if (skills.length === 0) return "nenhuma";

  const prioritySkills = keySkillPriority
    .filter((skill) => skills.some((playerSkill) => normalizeText(playerSkill) === normalizeText(skill)));
  const otherSkills = skills.filter(
    (skill) => !prioritySkills.some((prioritySkill) => normalizeText(prioritySkill) === normalizeText(skill))
  );

  return [...prioritySkills, ...otherSkills].slice(0, 6).join(", ");
}

function isSpecialCard(player: PlayerCard) {
  const text = normalizeText(`${player.version} ${player.club} ${player.notes}`);

  return (
    player.source === "efhub" ||
    player.boosters.length > 0 ||
    Boolean(player.maxBuild) ||
    /(epic|epico|big time|show time|highlight|featured|selection|potw|evento|especial|showtime)/i.test(text)
  );
}

function isEpicCard(player: PlayerCard, meta?: AnalysisCardMeta) {
  const text = normalizeText(`${player.version} ${player.club} ${player.notes}`);

  return (
    hasTag(meta, "epico") ||
    hasTag(meta, "bigTime") ||
    hasTag(meta, "showTime") ||
    /epic|epico|big time|show time|legendary|lendario/.test(text)
  );
}

function hasTag(meta: AnalysisCardMeta | undefined, tag: AnalysisTag) {
  return Boolean(meta?.tags?.includes(tag));
}

function priorityScore(card: MyCard, meta: AnalysisCardMeta | undefined, duplicateKeys: Set<string>) {
  let score = card.player.maxOverall;

  if (hasTag(meta, "prioridadeTreino")) score += 80;
  if (hasTag(meta, "possivelTitular")) score += 60;
  if (hasTag(meta, "favorito")) score += 40;
  if (isDuplicateCard(card, meta, duplicateKeys)) score += 20;
  if (hasTag(meta, "possivelDispensa")) score -= 40;

  return score;
}

function positionSortValue(position: string) {
  const index = analysisPositionOptions.indexOf(position);
  return index === -1 ? 999 : index;
}

function formatAttributesClient(attributes: PlayerCard["attributes"]) {
  return Object.entries(attributes)
    .map(([group, values]) => {
      const stats = Object.entries(values)
        .map(([name, value]) => `${name} ${value}`)
        .join(", ");

      return `  - ${group}: ${stats}`;
    })
    .join("\n");
}

function formatPositionRatingsClient(positions: PlayerCard["positions"]) {
  return analysisPositionOptions
    .filter((position) => position !== "Todas" && positions[position] !== undefined)
    .map((position) => `${position} ${positions[position]}`)
    .join(", ");
}

function formatSlidersClient(sliders: Record<string, number>) {
  const activeSliders = Object.entries(sliders)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => `${sliderLabels[key] ?? key} ${value}`);

  return activeSliders.length > 0 ? activeSliders.join(", ") : "sem pontos distribuidos";
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function analysisStatusLabel(status: AnalysisStatus) {
  return analysisStatusOptions.find((option) => option.value === status)?.label ?? status;
}

function analysisTagLabel(tag: AnalysisTag) {
  return analysisTagOptions.find((option) => option.value === tag)?.label ?? tag;
}

function analysisFilterLabel(filter: AnalysisFilter) {
  return analysisFilterOptions.find((option) => option.value === filter)?.label ?? filter;
}

function analysisSortLabel(sort: AnalysisSort) {
  return analysisSortOptions.find((option) => option.value === sort)?.label ?? sort;
}

function loadAnalysisMeta() {
  try {
    const storedMeta = window.localStorage.getItem("hubball-analysis-meta");
    return storedMeta ? (JSON.parse(storedMeta) as Record<string, AnalysisCardMeta>) : {};
  } catch {
    return {};
  }
}

function saveAnalysisMeta(meta: Record<string, AnalysisCardMeta>) {
  try {
    window.localStorage.setItem("hubball-analysis-meta", JSON.stringify(meta));
  } catch {
    // localStorage can be unavailable in private or restricted browser modes.
  }
}

const lineupTeamsStorageKey = "hubball-lineup-teams";
const activeLineupTeamStorageKey = "hubball-lineup-active-team";
const lineupFormationStorageKey = "hubball-lineup-formation";
const legacyLineupStorageKey = "hubball-lineup-lab";

function createDefaultLineupTeams(assignments: LineupAssignmentMap = {}): LineupTeam[] {
  return [
    { id: "team-a", name: "Time A", assignments, bench: {} },
    { id: "team-b", name: "Time B", assignments: {}, bench: {} }
  ];
}

function loadLineupTeams() {
  try {
    const storedTeams = window.localStorage.getItem(lineupTeamsStorageKey);

    if (storedTeams) {
      const parsedTeams = JSON.parse(storedTeams) as LineupTeam[];
      const normalizedTeams = parsedTeams
        .filter((team) => team && team.id)
        .map((team, index) => ({
          id: team.id,
          name: team.name?.trim() || `Time ${String.fromCharCode(65 + index)}`,
          assignments: team.assignments ?? {},
          bench: team.bench ?? {}
        }));

      if (normalizedTeams.length >= 2) {
        return normalizedTeams;
      }

      if (normalizedTeams.length === 1) {
        return [...normalizedTeams, { id: "team-b", name: "Time B", assignments: {}, bench: {} }];
      }
    }

    const legacyAssignments = window.localStorage.getItem(legacyLineupStorageKey);
    return createDefaultLineupTeams(
      legacyAssignments ? (JSON.parse(legacyAssignments) as LineupAssignmentMap) : {}
    );
  } catch {
    return createDefaultLineupTeams();
  }
}

function saveLineupTeams(teams: LineupTeam[]) {
  try {
    window.localStorage.setItem(lineupTeamsStorageKey, JSON.stringify(teams));
  } catch {
    // localStorage can be unavailable in private or restricted browser modes.
  }
}

function loadActiveLineupTeamId() {
  try {
    return window.localStorage.getItem(activeLineupTeamStorageKey) ?? "team-a";
  } catch {
    return "team-a";
  }
}

function saveActiveLineupTeamId(teamId: string) {
  try {
    window.localStorage.setItem(activeLineupTeamStorageKey, teamId);
  } catch {
    // localStorage can be unavailable in private or restricted browser modes.
  }
}

function loadLineupFormation() {
  try {
    const storedFormation = window.localStorage.getItem(lineupFormationStorageKey) as LineupFormationKey | null;

    return storedFormation && isLineupFormationKey(storedFormation) ? storedFormation : "4-3-3";
  } catch {
    return "4-3-3";
  }
}

function saveLineupFormation(formation: LineupFormationKey) {
  try {
    window.localStorage.setItem(lineupFormationStorageKey, formation);
  } catch {
    // localStorage can be unavailable in private or restricted browser modes.
  }
}

function isLineupFormationKey(value: string): value is LineupFormationKey {
  return lineupFormationOptions.some((formation) => formation.key === value);
}

function mergeEfhubResults(current: EfhubSearchResult[], next: EfhubSearchResult[]) {
  const seen = new Set(current.map((result) => result.id));
  const merged = [...current];

  for (const result of next) {
    if (!seen.has(result.id)) {
      seen.add(result.id);
      merged.push(result);
    }
  }

  return merged;
}

const sliderLabels: Record<string, string> = {
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

const analysisStatusOptions: Array<{ value: AnalysisStatus; label: string }> = [
  { value: "naoEvoluido", label: "automatico" },
  { value: "evoluido", label: "carta pronta" },
  { value: "trancado", label: "protegido" },
  { value: "duplicado", label: "duplicado" },
  { value: "emUso", label: "em uso" }
];

const analysisTagOptions: Array<{ value: AnalysisTag; label: string }> = [
  { value: "favorito", label: "favorito" },
  { value: "duvida", label: "duvida" },
  { value: "possivelTitular", label: "possivel titular" },
  { value: "possivelDispensa", label: "possivel dispensa" },
  { value: "prioridadeTreino", label: "prioridade de treino" },
  { value: "protegido", label: "protegido" },
  { value: "epico", label: "epico" },
  { value: "bigTime", label: "Big Time" },
  { value: "showTime", label: "Show Time" },
  { value: "cartaRara", label: "carta rara" },
  { value: "duplicado", label: "duplicado" }
];

const analysisFilterOptions: Array<{ value: AnalysisFilter; label: string }> = [
  { value: "todos", label: "todos os jogadores" },
  { value: "naoEvoluidos", label: "apenas treinaveis" },
  { value: "especiais", label: "apenas cartas especiais" },
  { value: "epicos", label: "apenas epicos" },
  { value: "duplicados", label: "apenas duplicados" },
  { value: "posicao", label: "apenas por posicao" },
  { value: "favoritos", label: "apenas favoritos" },
  { value: "dispensa", label: "candidatos a dispensa" }
];

const analysisSortOptions: Array<{ value: AnalysisSort; label: string }> = [
  { value: "overallMax", label: "overall maximo" },
  { value: "position", label: "posicao" },
  { value: "cardType", label: "tipo de carta" },
  { value: "status", label: "status de evolucao" },
  { value: "priority", label: "prioridade" }
];

const analysisPositionOptions = ["Todas", "PTE", "CA", "PTD", "SA", "MAT", "MLE", "MLG", "MLD", "VOL", "LE", "ZC", "LD", "GO"];

const keySkillPriority = [
  "Double Touch",
  "Flip Flap",
  "Sole Control",
  "Gamesmanship",
  "One-touch Pass",
  "Through Passing",
  "Weighted Pass",
  "Pinpoint Crossing",
  "First-time Shot",
  "Long Range Shooting",
  "Long-Range Curler",
  "Outside Curler",
  "Acrobatic Finishing",
  "Heading",
  "Aerial Superiority",
  "Interception",
  "Blocker",
  "Man Marking",
  "Fighting Spirit",
  "Captaincy",
  "Super-sub"
];

const lineupBenchSlots: LineupBenchSlot[] = Array.from({ length: 12 }, (_, index) => ({
  id: `bench-${index + 1}`,
  label: `R${index + 1}`,
  title: `Reserva ${index + 1}`
}));

const lineupFormationOptions: LineupFormationConfig[] = [
  {
    key: "4-3-3",
    label: "4-3-3",
    style: "Contra-ataque rapido",
    slots: [
      { id: "lwf", label: "PTE", x: 27, y: 18 },
      { id: "cf", label: "CA", x: 50, y: 15 },
      { id: "rwf", label: "PTD", x: 73, y: 18 },
      { id: "lcm", label: "MLG", x: 35, y: 42 },
      { id: "dmf", label: "VOL", x: 50, y: 50 },
      { id: "rcm", label: "MLG", x: 65, y: 42 },
      { id: "lb", label: "LE", x: 24, y: 68 },
      { id: "lcb", label: "ZC", x: 42, y: 75 },
      { id: "rcb", label: "ZC", x: 58, y: 75 },
      { id: "rb", label: "LD", x: 76, y: 68 },
      { id: "gk", label: "GO", x: 50, y: 89 }
    ]
  },
  {
    key: "4-2-1-3",
    label: "4-2-1-3",
    style: "Meia central com dois volantes",
    slots: [
      { id: "4213-lwf", label: "PTE", x: 27, y: 18 },
      { id: "4213-cf", label: "CA", x: 50, y: 15 },
      { id: "4213-rwf", label: "PTD", x: 73, y: 18 },
      { id: "4213-amf", label: "MAT", x: 50, y: 36 },
      { id: "4213-ldmf", label: "VOL", x: 40, y: 53 },
      { id: "4213-rdmf", label: "VOL", x: 60, y: 53 },
      { id: "4213-lb", label: "LE", x: 24, y: 70 },
      { id: "4213-lcb", label: "ZC", x: 42, y: 76 },
      { id: "4213-rcb", label: "ZC", x: 58, y: 76 },
      { id: "4213-rb", label: "LD", x: 76, y: 70 },
      { id: "4213-gk", label: "GO", x: 50, y: 90 }
    ]
  },
  {
    key: "4-2-2-2",
    label: "4-2-2-2",
    style: "Dois atacantes e meias abertos",
    slots: [
      { id: "4222-lcf", label: "CA", x: 42, y: 16 },
      { id: "4222-rcf", label: "CA", x: 58, y: 16 },
      { id: "4222-lamf", label: "MAT", x: 34, y: 36 },
      { id: "4222-ramf", label: "MAT", x: 66, y: 36 },
      { id: "4222-ldmf", label: "VOL", x: 40, y: 53 },
      { id: "4222-rdmf", label: "VOL", x: 60, y: 53 },
      { id: "4222-lb", label: "LE", x: 24, y: 70 },
      { id: "4222-lcb", label: "ZC", x: 42, y: 76 },
      { id: "4222-rcb", label: "ZC", x: 58, y: 76 },
      { id: "4222-rb", label: "LD", x: 76, y: 70 },
      { id: "4222-gk", label: "GO", x: 50, y: 90 }
    ]
  },
  {
    key: "3-2-4-1",
    label: "3-2-4-1",
    style: "Pressao alta com quatro meias",
    slots: [
      { id: "3241-cf", label: "CA", x: 50, y: 14 },
      { id: "3241-lmf", label: "MLE", x: 24, y: 35 },
      { id: "3241-lamf", label: "MAT", x: 42, y: 34 },
      { id: "3241-ramf", label: "MAT", x: 58, y: 34 },
      { id: "3241-rmf", label: "MLD", x: 76, y: 35 },
      { id: "3241-lcm", label: "MLG", x: 40, y: 55 },
      { id: "3241-rcm", label: "VOL", x: 60, y: 55 },
      { id: "3241-lcb", label: "ZC", x: 34, y: 74 },
      { id: "3241-cb", label: "ZC", x: 50, y: 78 },
      { id: "3241-rcb", label: "ZC", x: 66, y: 74 },
      { id: "3241-gk", label: "GO", x: 50, y: 91 }
    ]
  },
  {
    key: "5-2-3",
    label: "5-2-3",
    style: "Linha de cinco e pontas",
    slots: [
      { id: "523-lwf", label: "PTE", x: 27, y: 18 },
      { id: "523-cf", label: "CA", x: 50, y: 15 },
      { id: "523-rwf", label: "PTD", x: 73, y: 18 },
      { id: "523-lcm", label: "MLG", x: 40, y: 47 },
      { id: "523-rcm", label: "MLG", x: 60, y: 47 },
      { id: "523-lwb", label: "ALE", x: 18, y: 66 },
      { id: "523-lcb", label: "ZC", x: 36, y: 75 },
      { id: "523-cb", label: "ZC", x: 50, y: 78 },
      { id: "523-rcb", label: "ZC", x: 64, y: 75 },
      { id: "523-rwb", label: "ALD", x: 82, y: 66 },
      { id: "523-gk", label: "GO", x: 50, y: 91 }
    ]
  }
];

function getLineupFormation(key: LineupFormationKey) {
  return lineupFormationOptions.find((formation) => formation.key === key) ?? lineupFormationOptions[0];
}

const positionMapCells = [
  { position: "PTE", area: "lwf" },
  { position: "CA", area: "cf" },
  { position: "PTD", area: "rwf" },
  { position: "SA", area: "ss" },
  { position: "MLE", area: "lmf" },
  { position: "MAT", area: "amf" },
  { position: "MLG", area: "cmf" },
  { position: "MLD", area: "rmf" },
  { position: "VOL", area: "dmf" },
  { position: "LE", area: "lb" },
  { position: "ZC", area: "cb" },
  { position: "LD", area: "rb" },
  { position: "GO", area: "gk" }
];

const rootElement = document.getElementById("root")!;
const root = window.__hubballRoot ?? ReactDOM.createRoot(rootElement);
window.__hubballRoot = root;

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

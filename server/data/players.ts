export type PlayerAttributeGroup = "Ataque" | "Passe" | "Drible" | "Defesa" | "Atletismo" | "Goleiro";

export type ProgressionBuild = {
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

export type PlayerCard = {
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
  maxBuild?: ProgressionBuild;
  skills: string[];
  boosters: string[];
  notes: string;
  source?: "mock" | "efhub" | "manual";
  sourceUrl?: string;
  imageUrl?: string;
  importedAt?: string;
};

export const players: PlayerCard[] = [
  {
    id: "messi-argentina-2026",
    name: "Lionel Messi",
    version: "Argentina Selection",
    club: "Argentina",
    nationality: "Argentina",
    position: "SA",
    overall: 97,
    maxOverall: 99,
    playStyle: "Armador criativo",
    height: 170,
    weight: 67,
    age: 38,
    foot: "Esquerdo",
    condition: "B",
    positions: { SA: 97, MAT: 96, PTD: 96, CA: 94, MLD: 95, MLE: 95 },
    attributes: {
      Ataque: {
        "Talento ofensivo": 87,
        Finalizacao: 87,
        "Forca do chute": 88,
        "Bola parada": 90,
        Curva: 90
      },
      Passe: {
        "Passe rasteiro": 84,
        "Passe alto": 78,
        "Efeito": 90,
        "Cruzamento": 76
      },
      Drible: {
        "Controle de bola": 89,
        Drible: 88,
        "Conducao firme": 90,
        Equilibrio: 87
      },
      Defesa: {
        "Talento defensivo": 44,
        Combatendo: 48,
        Agressividade: 52,
        "Contato fisico": 71
      },
      Atletismo: {
        Velocidade: 84,
        Aceleracao: 85,
        Impulsao: 49,
        Resistencia: 82
      },
      Goleiro: {
        Goleiro: 40,
        "Encaixe GR": 40,
        Reflexos: 40,
        Alcance: 40
      }
    },
    skills: [
      "Toque duplo",
      "Chute colocado",
      "Passe em profundidade",
      "Passe de primeira",
      "Finalizacao acrobatica",
      "Cobranca especial"
    ],
    boosters: ["Chute +3", "Impulsionadores de posicao"],
    notes: "Melhor como segundo atacante ou meia central ofensivo quando o time precisa de criacao e passe final."
  },
  {
    id: "mbappe-france-2026",
    name: "Kylian Mbappe",
    version: "National Team Pack France",
    club: "France",
    nationality: "Franca",
    position: "CA",
    overall: 96,
    maxOverall: 99,
    playStyle: "Avancado incisivo",
    height: 178,
    weight: 75,
    age: 27,
    foot: "Direito",
    condition: "B",
    positions: { CA: 96, SA: 94, PTE: 95, PTD: 93 },
    attributes: {
      Ataque: {
        "Talento ofensivo": 90,
        Finalizacao: 89,
        "Forca do chute": 86,
        "Bola parada": 72,
        Curva: 78
      },
      Passe: {
        "Passe rasteiro": 76,
        "Passe alto": 70,
        "Efeito": 78,
        "Cruzamento": 73
      },
      Drible: {
        "Controle de bola": 86,
        Drible: 90,
        "Conducao firme": 84,
        Equilibrio: 84
      },
      Defesa: {
        "Talento defensivo": 50,
        Combatendo: 49,
        Agressividade: 63,
        "Contato fisico": 76
      },
      Atletismo: {
        Velocidade: 96,
        Aceleracao: 97,
        Impulsao: 81,
        Resistencia: 82
      },
      Goleiro: {
        Goleiro: 40,
        "Encaixe GR": 40,
        Reflexos: 40,
        Alcance: 40
      }
    },
    skills: ["Arrancada", "Chute de primeira", "Chute potente", "Controle orientado", "Super-sub"],
    boosters: ["Velocidade +2"],
    notes: "Atacante principal para explorar profundidade, contra-ataque e diagonais por dentro."
  },
  {
    id: "neymar-brazil-2026",
    name: "Neymar Jr",
    version: "Brazil Selection",
    club: "Brazil",
    nationality: "Brasil",
    position: "PTE",
    overall: 95,
    maxOverall: 98,
    playStyle: "Armador criativo",
    height: 175,
    weight: 68,
    age: 34,
    foot: "Direito",
    condition: "C",
    positions: { PTE: 95, SA: 94, MAT: 94, PTD: 91 },
    attributes: {
      Ataque: {
        "Talento ofensivo": 86,
        Finalizacao: 84,
        "Forca do chute": 82,
        "Bola parada": 88,
        Curva: 89
      },
      Passe: {
        "Passe rasteiro": 83,
        "Passe alto": 79,
        "Efeito": 88,
        "Cruzamento": 80
      },
      Drible: {
        "Controle de bola": 91,
        Drible: 92,
        "Conducao firme": 91,
        Equilibrio: 86
      },
      Defesa: {
        "Talento defensivo": 46,
        Combatendo: 45,
        Agressividade: 56,
        "Contato fisico": 65
      },
      Atletismo: {
        Velocidade: 84,
        Aceleracao: 88,
        Impulsao: 64,
        Resistencia: 77
      },
      Goleiro: {
        Goleiro: 40,
        "Encaixe GR": 40,
        Reflexos: 40,
        Alcance: 40
      }
    },
    skills: ["Toque duplo", "Chapeu", "Elastico", "Passe em profundidade", "Chute colocado"],
    boosters: ["Drible +2"],
    notes: "Excelente para quebrar linhas no um contra um e criar chances da esquerda para dentro."
  },
  {
    id: "van-dijk-netherlands-2026",
    name: "Virgil van Dijk",
    version: "National Team Pack Netherlands",
    club: "Netherlands",
    nationality: "Holanda",
    position: "ZC",
    overall: 94,
    maxOverall: 97,
    playStyle: "O destruidor",
    height: 193,
    weight: 92,
    age: 34,
    foot: "Direito",
    condition: "B",
    positions: { ZC: 94, LE: 84, LD: 84, VOL: 86 },
    attributes: {
      Ataque: {
        "Talento ofensivo": 58,
        Finalizacao: 60,
        "Forca do chute": 80,
        "Bola parada": 64,
        Curva: 66
      },
      Passe: {
        "Passe rasteiro": 78,
        "Passe alto": 82,
        "Efeito": 70,
        "Cruzamento": 68
      },
      Drible: {
        "Controle de bola": 76,
        Drible: 72,
        "Conducao firme": 73,
        Equilibrio: 68
      },
      Defesa: {
        "Talento defensivo": 92,
        Combatendo: 91,
        Agressividade: 84,
        "Contato fisico": 93
      },
      Atletismo: {
        Velocidade: 82,
        Aceleracao: 76,
        Impulsao: 90,
        Resistencia: 83
      },
      Goleiro: {
        Goleiro: 40,
        "Encaixe GR": 40,
        Reflexos: 40,
        Alcance: 40
      }
    },
    skills: ["Interceptacao", "Bloqueio", "Cabecada", "Passe longo preciso", "Lideranca"],
    boosters: ["Defesa +2"],
    notes: "Zagueiro dominante para linha defensiva mais alta, bolas aereas e saida longa."
  },
  {
    id: "kimmich-germany-2026",
    name: "Joshua Kimmich",
    version: "National Team Pack Germany",
    club: "Germany",
    nationality: "Alemanha",
    position: "VOL",
    overall: 93,
    maxOverall: 96,
    playStyle: "Organizador",
    height: 177,
    weight: 75,
    age: 31,
    foot: "Direito",
    condition: "B",
    positions: { VOL: 93, MC: 92, LD: 91, MAT: 88 },
    attributes: {
      Ataque: {
        "Talento ofensivo": 74,
        Finalizacao: 72,
        "Forca do chute": 82,
        "Bola parada": 86,
        Curva: 87
      },
      Passe: {
        "Passe rasteiro": 88,
        "Passe alto": 90,
        "Efeito": 87,
        "Cruzamento": 88
      },
      Drible: {
        "Controle de bola": 86,
        Drible: 81,
        "Conducao firme": 84,
        Equilibrio: 83
      },
      Defesa: {
        "Talento defensivo": 82,
        Combatendo: 84,
        Agressividade: 86,
        "Contato fisico": 76
      },
      Atletismo: {
        Velocidade: 78,
        Aceleracao: 80,
        Impulsao: 72,
        Resistencia: 91
      },
      Goleiro: {
        Goleiro: 40,
        "Encaixe GR": 40,
        Reflexos: 40,
        Alcance: 40
      }
    },
    skills: ["Passe pesado", "Passe em profundidade", "Cruzamento preciso", "Interceptacao", "Capitao"],
    boosters: ["Passe +2"],
    notes: "Volante cerebral para controlar ritmo, cobrir laterais e distribuir jogo."
  },
  {
    id: "buffon-italy-2026",
    name: "Gianluigi Buffon",
    version: "Italy Selection",
    club: "Italy",
    nationality: "Italia",
    position: "GO",
    overall: 93,
    maxOverall: 96,
    playStyle: "Goleiro defensivo",
    height: 192,
    weight: 92,
    age: 48,
    foot: "Direito",
    condition: "B",
    positions: { GO: 93 },
    attributes: {
      Ataque: {
        "Talento ofensivo": 40,
        Finalizacao: 40,
        "Forca do chute": 72,
        "Bola parada": 45,
        Curva: 48
      },
      Passe: {
        "Passe rasteiro": 62,
        "Passe alto": 68,
        "Efeito": 52,
        "Cruzamento": 45
      },
      Drible: {
        "Controle de bola": 58,
        Drible: 52,
        "Conducao firme": 50,
        Equilibrio: 62
      },
      Defesa: {
        "Talento defensivo": 55,
        Combatendo: 48,
        Agressividade: 60,
        "Contato fisico": 86
      },
      Atletismo: {
        Velocidade: 62,
        Aceleracao: 58,
        Impulsao: 84,
        Resistencia: 68
      },
      Goleiro: {
        Goleiro: 91,
        "Encaixe GR": 89,
        Reflexos: 90,
        Alcance: 88
      }
    },
    skills: ["Defesa de penalti", "Lancamento baixo", "Pegador de bolas altas", "Lideranca"],
    boosters: ["Goleiro +2"],
    notes: "Seguro para times que defendem em bloco medio ou baixo e sofrem muitos cruzamentos."
  }
];

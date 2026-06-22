export type EfhubStatKey =
  | "offensiveAwareness"
  | "ballControl"
  | "dribbling"
  | "tightPossession"
  | "lowPass"
  | "loftedPass"
  | "finishing"
  | "heading"
  | "setPieceTaking"
  | "curl"
  | "speed"
  | "acceleration"
  | "kickingPower"
  | "jump"
  | "physicalContact"
  | "balance"
  | "stamina"
  | "defensiveAwareness"
  | "ballWinning"
  | "trackingBack"
  | "aggression"
  | "gkAwareness"
  | "gkCatching"
  | "gkClearing"
  | "gkReflexes"
  | "gkReach";

export type EfhubStats = Record<EfhubStatKey, number>;

export type ProgressionSliderKey =
  | "shooting"
  | "passing"
  | "dribbling"
  | "dexterity"
  | "lowerBodyStrength"
  | "aerialStrength"
  | "defending"
  | "gk1"
  | "gk2"
  | "gk3";

export type ProgressionSliderValues = Record<ProgressionSliderKey, number>;

export type ManagerContext = {
  name: string;
  playstyle: string;
  skillValue: number;
  boosts: Array<{
    index: number;
    statKey: EfhubStatKey;
    label: string;
  }>;
};

export type PlayerBoostContext = {
  id: number;
  name: string;
  stats: Partial<Record<EfhubStatKey, number>>;
};

const progressionSliders: Array<{ key: ProgressionSliderKey; affectedStats: EfhubStatKey[] }> = [
  { key: "shooting", affectedStats: ["finishing", "setPieceTaking", "curl"] },
  { key: "passing", affectedStats: ["lowPass", "loftedPass"] },
  { key: "dribbling", affectedStats: ["ballControl", "dribbling", "tightPossession"] },
  { key: "dexterity", affectedStats: ["offensiveAwareness", "acceleration", "balance"] },
  { key: "lowerBodyStrength", affectedStats: ["speed", "kickingPower", "stamina"] },
  { key: "aerialStrength", affectedStats: ["heading", "jump", "physicalContact"] },
  { key: "defending", affectedStats: ["defensiveAwareness", "ballWinning", "aggression", "trackingBack"] },
  { key: "gk1", affectedStats: ["gkAwareness", "jump"] },
  { key: "gk2", affectedStats: ["gkClearing", "gkReach"] },
  { key: "gk3", affectedStats: ["gkCatching", "gkReflexes"] }
];

const managerSkillMultipliers = [
  0.65, 0.6675, 0.685, 0.7025, 0.72, 0.7375, 0.755, 0.7725, 0.79, 0.8075, 0.825,
  0.8425, 0.86, 0.8775, 0.895, 0.9125, 0.93, 0.9475, 0.965, 0.9825, 1, 1, 1.01163,
  1.01389, 1.015625, 1.01755, 1.01925, 1.02125, 1.02275, 1.0244, 1.026, 1.02725,
  1.029, 1.03, 1.03196, 1.03275, 1.03375, 1.034091, 1.0355, 1.036, 1.0365, 1.036,
  1.036, 1.036, 1.036, 1.036, 1.036, 1.036, 1.036, 1.036, 1.036
];

const abilityMap: Record<number, { statKey: EfhubStatKey; label: string }> = {
  0: { statKey: "offensiveAwareness", label: "Talento ofensivo" },
  1: { statKey: "ballControl", label: "Controle de bola" },
  2: { statKey: "tightPossession", label: "Conducao firme" },
  3: { statKey: "dribbling", label: "Drible" },
  4: { statKey: "lowPass", label: "Passe rasteiro" },
  5: { statKey: "loftedPass", label: "Passe alto" },
  6: { statKey: "finishing", label: "Finalizacao" },
  7: { statKey: "setPieceTaking", label: "Bola parada" },
  8: { statKey: "curl", label: "Curva" },
  9: { statKey: "heading", label: "Cabecada" },
  10: { statKey: "defensiveAwareness", label: "Talento defensivo" },
  11: { statKey: "ballWinning", label: "Combatendo" },
  12: { statKey: "trackingBack", label: "Envolvimento defensivo" },
  13: { statKey: "aggression", label: "Agressividade" },
  14: { statKey: "kickingPower", label: "Forca do chute" },
  15: { statKey: "speed", label: "Velocidade" },
  16: { statKey: "acceleration", label: "Aceleracao" },
  17: { statKey: "balance", label: "Equilibrio" },
  18: { statKey: "physicalContact", label: "Contato fisico" },
  19: { statKey: "jump", label: "Impulsao" },
  20: { statKey: "gkAwareness", label: "Goleiro" },
  21: { statKey: "gkCatching", label: "Encaixe GR" },
  22: { statKey: "gkClearing", label: "Espalmada GR" },
  23: { statKey: "gkReflexes", label: "Reflexos" },
  24: { statKey: "gkReach", label: "Alcance" },
  25: { statKey: "stamina", label: "Resistencia" }
};

export function getManagerBoosts(boostIndexes: number[]) {
  return boostIndexes
    .filter((index) => index !== -1)
    .map((index) => {
      const ability = abilityMap[index];

      if (!ability) {
        return null;
      }

      return {
        index,
        statKey: ability.statKey,
        label: `${ability.label} +1`
      };
    })
    .filter((boost): boost is NonNullable<typeof boost> => boost !== null);
}

const positionColumn: Record<string, number> = {
  GK: 0,
  CB: 1,
  LB: 2,
  RB: 3,
  DMF: 4,
  CMF: 5,
  LMF: 6,
  RMF: 7,
  AMF: 8,
  LWF: 9,
  RWF: 10,
  SS: 11,
  CF: 12
};

const overallWeights = [
  186, 136, 49, 49, 61, 37, 12, 12, 37, 49, 49, 62, 99, 0, 14, 61, 61, 61, 98,
  98, 98, 171, 159, 159, 173, 210, 13, 27, 86, 86, 122, 171, 171, 171, 196, 159,
  159, 210, 123, 0, 14, 61, 61, 37, 98, 110, 122, 122, 159, 159, 123, 62, 0, 0,
  37, 37, 24, 49, 73, 61, 73, 86, 86, 86, 37, 27, 41, 61, 61, 122, 208, 135, 135,
  196, 73, 73, 99, 37, 40, 68, 147, 147, 122, 159, 196, 196, 159, 98, 98, 74, 12,
  0, 27, 24, 24, 37, 73, 86, 86, 184, 159, 159, 284, 358, 0, 14, 24, 24, 12, 12,
  24, 24, 12, 12, 12, 12, 12, 0, 14, 24, 24, 12, 12, 24, 24, 12, 12, 12, 12, 12,
  0, 55, 24, 24, 61, 24, 12, 12, 24, 24, 24, 25, 62, 13, 286, 147, 147, 220, 86,
  49, 49, 24, 12, 12, 0, 0, 0, 191, 86, 86, 122, 86, 24, 24, 24, 12, 12, 12, 12,
  0, 82, 37, 37, 98, 37, 12, 12, 12, 12, 12, 12, 12, 53, 27, 24, 24, 49, 73, 24,
  24, 73, 61, 61, 99, 123, 13, 136, 220, 220, 61, 61, 196, 196, 98, 220, 220, 86,
  99, 40, 150, 184, 184, 61, 86, 159, 159, 86, 159, 159, 99, 123, 80, 204, 98, 98,
  122, 49, 24, 24, 24, 37, 37, 37, 86, 0, 0, 24, 24, 12, 24, 61, 61, 24, 73, 73,
  74, 86, 133, 109, 37, 37, 37, 12, 12, 12, 12, 24, 24, 37, 62, 279, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 226, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 226, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 173, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 173,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 68, 196, 196, 196, 196, 147, 147, 86,
  49, 49, 49, 37, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 0, 14, 24, 24, 24, 24,
  24, 24, 24, 24, 24, 12, 12
];

export function calculateMaxProgressionBuild(options: {
  stats: EfhubStats;
  position: string;
  height: number;
  weakFootAccuracy: number;
  levelCap: number;
  manager?: ManagerContext;
  playerBoosts?: PlayerBoostContext[];
}) {
  const totalPoints = availablePoints(options.levelCap);
  const sliders = computeMaxSliders(options, totalPoints);
  const progressionStats = applyProgression(options.stats, sliders);
  const stats = applyBuildEffects(progressionStats, options.manager, options.playerBoosts);
  const overall = computeOverallRating({
    position: options.position,
    height: options.height,
    weakFootAccuracy: options.weakFootAccuracy,
    stats
  });

  return {
    levelCap: options.levelCap,
    totalPoints,
    pointsUsed: totalPointsUsed(sliders),
    sliders,
    manager: options.manager,
    playerBoosts: options.playerBoosts ?? [],
    stats,
    overall
  };
}

export function computeOverallRating(options: {
  position: string;
  height: number;
  weakFootAccuracy: number;
  stats: EfhubStats;
}) {
  const score = computeOverallScore(options);

  if (score === null) {
    return 70;
  }

  return Math.max(40, Math.floor((score + 500) / 1000));
}

export function computePositionRatings(options: {
  height: number;
  weakFootAccuracy: number;
  stats: EfhubStats;
}) {
  return Object.fromEntries(
    Object.keys(positionColumn).map((position) => [
      position,
      computeOverallRating({
        ...options,
        position
      })
    ])
  );
}

function computeOverallRatingDecimal(options: {
  position: string;
  height: number;
  weakFootAccuracy: number;
  stats: EfhubStats;
}) {
  const score = computeOverallScore(options);

  if (score === null) {
    return 70;
  }

  return Math.round(100 * Math.max((score + 500) / 1000, 40)) / 100;
}

function computeOverallScore(options: {
  position: string;
  height: number;
  weakFootAccuracy: number;
  stats: EfhubStats;
}) {
  const column = positionColumn[options.position];

  if (column === undefined) {
    return null;
  }

  const weight = (rowOffset: number) => overallWeights[rowOffset + column] ?? 0;
  const value = (ability: number) => (ability > 25 ? ability - 25 : 0);
  const stats = options.stats;
  const weakFootValue = Math.floor((59 * options.weakFootAccuracy) / 3 + 40);

  return (
    weight(0) * value(options.height - 111) +
    weight(13) * value(stats.offensiveAwareness) +
    weight(26) * value(stats.ballControl) +
    weight(39) * value(stats.dribbling) +
    weight(52) * value(stats.tightPossession) +
    weight(65) * value(stats.lowPass) +
    weight(78) * value(stats.loftedPass) +
    weight(91) * value(stats.finishing) +
    weight(104) * value(stats.setPieceTaking) +
    weight(117) * value(stats.curl) +
    weight(130) * value(stats.heading) +
    weight(143) * value(stats.defensiveAwareness) +
    weight(156) * value(stats.ballWinning) +
    weight(169) * value(stats.aggression) +
    weight(182) * value(stats.kickingPower) +
    weight(195) * value(stats.speed) +
    weight(208) * value(stats.acceleration) +
    weight(221) * value(stats.physicalContact) +
    weight(234) * value(stats.balance) +
    weight(247) * value(stats.jump) +
    weight(260) * value(stats.gkAwareness) +
    weight(273) * value(stats.gkReach) +
    weight(286) * value(stats.gkCatching) +
    weight(299) * value(stats.gkClearing) +
    weight(312) * value(stats.gkReflexes) +
    weight(325) * value(stats.stamina) +
    weight(338) * value(weakFootValue) +
    weight(351) * value(stats.trackingBack)
  );
}

function computeMaxSliders(
  options: {
    stats: EfhubStats;
    position: string;
    height: number;
    weakFootAccuracy: number;
    manager?: ManagerContext;
    playerBoosts?: PlayerBoostContext[];
  },
  totalPoints: number
) {
  const sliders = getDefaultSliderValues();
  let remainingPoints = totalPoints;

  while (remainingPoints > 0) {
    let bestSlider: ProgressionSliderKey | null = null;
    let bestGainPerPoint = Number.NEGATIVE_INFINITY;
    const currentStats = applyBuildEffects(applyProgression(options.stats, sliders), options.manager, options.playerBoosts);
    const currentRating = computeOverallRatingDecimal({ ...options, stats: currentStats });

    for (const slider of progressionSliders) {
      const nextValue = sliders[slider.key] + 1;

      if (nextValue > 25) {
        continue;
      }

      const cost = sliderPointCost(nextValue);

      if (cost > remainingPoints) {
        continue;
      }

      const nextStats = applyBuildEffects(
        applyProgression(options.stats, {
          ...sliders,
          [slider.key]: nextValue
        }),
        options.manager,
        options.playerBoosts
      );
      const nextRating = computeOverallRatingDecimal({ ...options, stats: nextStats });
      const gainPerPoint = (nextRating - currentRating) / cost;

      if (gainPerPoint > bestGainPerPoint) {
        bestGainPerPoint = gainPerPoint;
        bestSlider = slider.key;
      }
    }

    if (bestSlider === null || bestGainPerPoint <= 0) {
      break;
    }

    sliders[bestSlider] += 1;
    remainingPoints -= sliderPointCost(sliders[bestSlider]);
  }

  if (remainingPoints > 0) {
    for (const slider of progressionSliders) {
      while (sliders[slider.key] < 25 && remainingPoints > 0) {
        const cost = sliderPointCost(sliders[slider.key] + 1);

        if (cost > remainingPoints) {
          break;
        }

        sliders[slider.key] += 1;
        remainingPoints -= cost;
      }

      if (remainingPoints === 0) {
        break;
      }
    }
  }

  return sliders;
}

function applyBuildEffects(stats: EfhubStats, manager?: ManagerContext, playerBoosts?: PlayerBoostContext[]) {
  return applyPlayerBoosts(applyManagerEffects(stats, manager), playerBoosts);
}

function applyManagerEffects(stats: EfhubStats, manager?: ManagerContext) {
  if (!manager) {
    return stats;
  }

  const skillAppliedStats = applyManagerSkill(stats, manager.skillValue);
  return applyManagerBoosts(skillAppliedStats, manager);
}

function applyManagerSkill(stats: EfhubStats, skillValue: number) {
  const multiplier = managerSkillMultiplier(skillValue);

  if (multiplier === 1) {
    return stats;
  }

  const updatedStats = { ...stats };

  for (const stat of Object.keys(updatedStats) as EfhubStatKey[]) {
    updatedStats[stat] = Math.min(99, updatedStats[stat] + Math.floor(updatedStats[stat] * (multiplier - 1)));
  }

  return updatedStats;
}

function managerSkillMultiplier(skillValue: number) {
  const index = Math.min(Math.max(skillValue >= 50 ? skillValue - 50 : 0, 0), managerSkillMultipliers.length - 1);
  return managerSkillMultipliers[index] ?? 1;
}

function applyManagerBoosts(stats: EfhubStats, manager: ManagerContext) {
  const updatedStats = { ...stats };

  for (const boost of manager.boosts) {
    updatedStats[boost.statKey] = (updatedStats[boost.statKey] ?? 0) + 1;
  }

  return updatedStats;
}

function applyPlayerBoosts(stats: EfhubStats, playerBoosts?: PlayerBoostContext[]) {
  if (!playerBoosts?.length) {
    return stats;
  }

  const updatedStats = { ...stats };

  for (const boost of playerBoosts) {
    for (const [stat, value] of Object.entries(boost.stats) as Array<[EfhubStatKey, number]>) {
      updatedStats[stat] = (updatedStats[stat] ?? 0) + value;
    }
  }

  return updatedStats;
}

function applyProgression(stats: EfhubStats, sliders: ProgressionSliderValues) {
  const updatedStats = { ...stats };

  for (const slider of progressionSliders) {
    const increase = sliders[slider.key];

    if (increase === 0) {
      continue;
    }

    for (const stat of slider.affectedStats) {
      updatedStats[stat] = Math.min(99, updatedStats[stat] + increase);
    }
  }

  return updatedStats;
}

function getDefaultSliderValues(): ProgressionSliderValues {
  return {
    shooting: 0,
    passing: 0,
    dribbling: 0,
    dexterity: 0,
    lowerBodyStrength: 0,
    aerialStrength: 0,
    defending: 0,
    gk1: 0,
    gk2: 0,
    gk3: 0
  };
}

function availablePoints(levelCap: number) {
  return Math.max(0, (levelCap - 1) * 2);
}

function sliderPointCost(value: number) {
  return Math.ceil(value / 4);
}

function totalSliderCost(value: number) {
  let total = 0;

  for (let index = 1; index <= value; index += 1) {
    total += sliderPointCost(index);
  }

  return total;
}

function totalPointsUsed(sliders: ProgressionSliderValues) {
  return Object.values(sliders).reduce((total, value) => total + totalSliderCost(value), 0);
}

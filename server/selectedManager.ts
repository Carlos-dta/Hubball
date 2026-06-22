import { getManagerBoosts, type ManagerContext } from "./progression.js";

export const selectedManager: ManagerContext = {
  name: "D. Stojkovic",
  playstyle: "QuickCounter",
  skillValue: 88,
  boosts: getManagerBoosts([14, -1])
};

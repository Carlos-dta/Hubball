import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { PlayerCard } from "./data/players.js";

export type PersistedMyCard = {
  id: string;
  playerId: string;
  nickname?: string;
  level?: number;
  customNotes?: string;
  addedAt: string;
};

export const playerCardsTable = sqliteTable("player_cards", {
  id: text("id").primaryKey(),
  data: text("data", { mode: "json" }).notNull().$type<PlayerCard>(),
  updatedAt: text("updated_at").notNull()
});

export const myCardsTable = sqliteTable("my_cards", {
  id: text("id").primaryKey(),
  playerId: text("player_id").notNull().unique(),
  nickname: text("nickname"),
  level: integer("level"),
  customNotes: text("custom_notes"),
  addedAt: text("added_at").notNull()
});

const dataDirectory = process.env.HUBBALL_DATA_DIR ?? path.join(process.cwd(), "server", "storage");
mkdirSync(dataDirectory, { recursive: true });

const sqlite = new Database(process.env.HUBBALL_DB_PATH ?? path.join(dataDirectory, "hubball.sqlite"));
sqlite.pragma("journal_mode = WAL");

sqlite.exec(`
CREATE TABLE IF NOT EXISTS player_cards (
  id TEXT PRIMARY KEY NOT NULL,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS my_cards (
  id TEXT PRIMARY KEY NOT NULL,
  player_id TEXT NOT NULL UNIQUE,
  nickname TEXT,
  level INTEGER,
  custom_notes TEXT,
  added_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_my_cards_added_at ON my_cards (added_at DESC);
`);

const db = drizzle(sqlite);

export function loadPersistedPlayers() {
  return db
    .select()
    .from(playerCardsTable)
    .all()
    .map((row) => row.data);
}

export function getStoredPlayer(playerId: string) {
  return db.select().from(playerCardsTable).where(eq(playerCardsTable.id, playerId)).get()?.data ?? null;
}

export function upsertPlayerCard(player: PlayerCard) {
  const updatedAt = new Date().toISOString();

  db.insert(playerCardsTable)
    .values({ id: player.id, data: player, updatedAt })
    .onConflictDoUpdate({
      target: playerCardsTable.id,
      set: { data: player, updatedAt }
    })
    .run();
}

export function loadMyCards(): PersistedMyCard[] {
  return db
    .select()
    .from(myCardsTable)
    .all()
    .sort((first, second) => second.addedAt.localeCompare(first.addedAt))
    .map(normalizeMyCardRow);
}

export function findMyCardByPlayerId(playerId: string) {
  const row = db.select().from(myCardsTable).where(eq(myCardsTable.playerId, playerId)).get();

  return row ? normalizeMyCardRow(row) : null;
}

export function saveMyCard(card: PersistedMyCard) {
  db.insert(myCardsTable)
    .values(toMyCardRow(card))
    .onConflictDoUpdate({
      target: myCardsTable.playerId,
      set: {
        nickname: card.nickname ?? null,
        level: card.level ?? null,
        customNotes: card.customNotes ?? null
      }
    })
    .run();
}

export function deleteMyCard(cardId: string) {
  const result = sqlite.prepare("DELETE FROM my_cards WHERE id = ?").run(cardId);

  return result.changes > 0;
}

function normalizeMyCardRow(row: typeof myCardsTable.$inferSelect): PersistedMyCard {
  return {
    id: row.id,
    playerId: row.playerId,
    ...(row.nickname ? { nickname: row.nickname } : {}),
    ...(row.level !== null ? { level: row.level } : {}),
    ...(row.customNotes ? { customNotes: row.customNotes } : {}),
    addedAt: row.addedAt
  };
}

function toMyCardRow(card: PersistedMyCard): typeof myCardsTable.$inferInsert {
  return {
    id: card.id,
    playerId: card.playerId,
    nickname: card.nickname ?? null,
    level: card.level ?? null,
    customNotes: card.customNotes ?? null,
    addedAt: card.addedAt
  };
}

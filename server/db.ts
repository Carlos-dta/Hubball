import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import pg from "pg";
import type { PlayerCard } from "./data/players.js";

const { Pool } = pg;

export type PersistedMyCard = {
  id: string;
  playerId: string;
  nickname?: string;
  level?: number;
  customNotes?: string;
  addedAt: string;
};

type MyCardRow = {
  id: string;
  playerId: string;
  nickname: string | null;
  level: number | null;
  customNotes: string | null;
  addedAt: string;
};

type CardStore = {
  kind: "postgres" | "sqlite";
  init: () => Promise<void>;
  loadPersistedPlayers: () => Promise<PlayerCard[]>;
  loadSavedPlayers: () => Promise<PlayerCard[]>;
  getStoredPlayer: (playerId: string) => Promise<PlayerCard | null>;
  upsertPlayerCard: (player: PlayerCard) => Promise<void>;
  savePlayerToLibrary: (playerId: string) => Promise<void>;
  loadMyCards: () => Promise<PersistedMyCard[]>;
  findMyCardByPlayerId: (playerId: string) => Promise<PersistedMyCard | null>;
  saveMyCard: (card: PersistedMyCard) => Promise<void>;
  deleteMyCard: (cardId: string) => Promise<boolean>;
  clearMyCards: () => Promise<void>;
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

export const savedCardsTable = sqliteTable("saved_cards", {
  playerId: text("player_id").primaryKey(),
  savedAt: text("saved_at").notNull()
});

const store = process.env.DATABASE_URL ? createPostgresStore(process.env.DATABASE_URL) : createSqliteStore();
export const databaseProvider = store.kind;

export function initDatabase() {
  return store.init();
}

export function loadPersistedPlayers() {
  return store.loadPersistedPlayers();
}

export function loadSavedPlayers() {
  return store.loadSavedPlayers();
}

export function getStoredPlayer(playerId: string) {
  return store.getStoredPlayer(playerId);
}

export function upsertPlayerCard(player: PlayerCard) {
  return store.upsertPlayerCard(player);
}

export function savePlayerToLibrary(playerId: string) {
  return store.savePlayerToLibrary(playerId);
}

export function loadMyCards() {
  return store.loadMyCards();
}

export function findMyCardByPlayerId(playerId: string) {
  return store.findMyCardByPlayerId(playerId);
}

export function saveMyCard(card: PersistedMyCard) {
  return store.saveMyCard(card);
}

export function deleteMyCard(cardId: string) {
  return store.deleteMyCard(cardId);
}

export function clearMyCards() {
  return store.clearMyCards();
}

function createSqliteStore(): CardStore {
  const dataDirectory = process.env.HUBBALL_DATA_DIR ?? path.join(process.cwd(), "server", "storage");
  mkdirSync(dataDirectory, { recursive: true });

  const sqlite = new Database(process.env.HUBBALL_DB_PATH ?? path.join(dataDirectory, "hubball.sqlite"));
  const db = drizzle(sqlite);

  return {
    kind: "sqlite",
    async init() {
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

CREATE TABLE IF NOT EXISTS saved_cards (
  player_id TEXT PRIMARY KEY NOT NULL,
  saved_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_my_cards_added_at ON my_cards (added_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_cards_saved_at ON saved_cards (saved_at DESC);

INSERT OR IGNORE INTO saved_cards (player_id, saved_at)
SELECT player_id, added_at FROM my_cards;
`);
    },
    async loadPersistedPlayers() {
      return db
        .select()
        .from(playerCardsTable)
        .all()
        .map((row) => row.data);
    },
    async loadSavedPlayers() {
      const rows = sqlite
        .prepare(
          `SELECT player_cards.data
           FROM saved_cards
           INNER JOIN player_cards ON player_cards.id = saved_cards.player_id
           ORDER BY saved_cards.saved_at DESC`
        )
        .all() as Array<{ data: PlayerCard | string }>;

      return rows.map((row) => parsePlayerData(row.data));
    },
    async getStoredPlayer(playerId: string) {
      return db.select().from(playerCardsTable).where(eq(playerCardsTable.id, playerId)).get()?.data ?? null;
    },
    async upsertPlayerCard(player: PlayerCard) {
      const updatedAt = new Date().toISOString();

      db.insert(playerCardsTable)
        .values({ id: player.id, data: player, updatedAt })
        .onConflictDoUpdate({
          target: playerCardsTable.id,
          set: { data: player, updatedAt }
        })
        .run();
    },
    async savePlayerToLibrary(playerId: string) {
      const savedAt = new Date().toISOString();

      db.insert(savedCardsTable)
        .values({ playerId, savedAt })
        .onConflictDoUpdate({
          target: savedCardsTable.playerId,
          set: { savedAt }
        })
        .run();
    },
    async loadMyCards() {
      return db
        .select()
        .from(myCardsTable)
        .all()
        .sort((first, second) => second.addedAt.localeCompare(first.addedAt))
        .map(normalizeSqliteMyCardRow);
    },
    async findMyCardByPlayerId(playerId: string) {
      const row = db.select().from(myCardsTable).where(eq(myCardsTable.playerId, playerId)).get();

      return row ? normalizeSqliteMyCardRow(row) : null;
    },
    async saveMyCard(card: PersistedMyCard) {
      db.insert(myCardsTable)
        .values(toSqliteMyCardRow(card))
        .onConflictDoUpdate({
          target: myCardsTable.playerId,
          set: {
            nickname: card.nickname ?? null,
            level: card.level ?? null,
            customNotes: card.customNotes ?? null
          }
        })
        .run();
    },
    async deleteMyCard(cardId: string) {
      const result = sqlite.prepare("DELETE FROM my_cards WHERE id = ?").run(cardId);

      return result.changes > 0;
    },
    async clearMyCards() {
      sqlite.prepare("DELETE FROM my_cards").run();
    }
  };
}

function createPostgresStore(connectionString: string): CardStore {
  const useSsl = process.env.PGSSLMODE !== "disable" && process.env.DATABASE_SSL !== "false";
  const pool = new Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : false
  });

  return {
    kind: "postgres",
    async init() {
      await pool.query(`
CREATE TABLE IF NOT EXISTS player_cards (
  id TEXT PRIMARY KEY NOT NULL,
  data JSONB NOT NULL,
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

CREATE TABLE IF NOT EXISTS saved_cards (
  player_id TEXT PRIMARY KEY NOT NULL,
  saved_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_my_cards_added_at ON my_cards (added_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_cards_saved_at ON saved_cards (saved_at DESC);

INSERT INTO saved_cards (player_id, saved_at)
SELECT player_id, added_at FROM my_cards
ON CONFLICT (player_id) DO NOTHING;
`);
    },
    async loadPersistedPlayers() {
      const result = await pool.query<{ data: PlayerCard | string }>(
        "SELECT data FROM player_cards ORDER BY updated_at DESC"
      );

      return result.rows.map((row) => parsePlayerData(row.data));
    },
    async loadSavedPlayers() {
      const result = await pool.query<{ data: PlayerCard | string }>(
        `SELECT player_cards.data
         FROM saved_cards
         INNER JOIN player_cards ON player_cards.id = saved_cards.player_id
         ORDER BY saved_cards.saved_at DESC`
      );

      return result.rows.map((row) => parsePlayerData(row.data));
    },
    async getStoredPlayer(playerId: string) {
      const result = await pool.query<{ data: PlayerCard | string }>(
        "SELECT data FROM player_cards WHERE id = $1 LIMIT 1",
        [playerId]
      );

      return result.rows[0] ? parsePlayerData(result.rows[0].data) : null;
    },
    async upsertPlayerCard(player: PlayerCard) {
      await pool.query(
        `INSERT INTO player_cards (id, data, updated_at)
         VALUES ($1, $2::jsonb, $3)
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`,
        [player.id, JSON.stringify(player), new Date().toISOString()]
      );
    },
    async savePlayerToLibrary(playerId: string) {
      await pool.query(
        `INSERT INTO saved_cards (player_id, saved_at)
         VALUES ($1, $2)
         ON CONFLICT (player_id) DO UPDATE SET saved_at = EXCLUDED.saved_at`,
        [playerId, new Date().toISOString()]
      );
    },
    async loadMyCards() {
      const result = await pool.query<PostgresMyCardRow>(
        `SELECT id, player_id, nickname, level, custom_notes, added_at
         FROM my_cards
         ORDER BY added_at DESC`
      );

      return result.rows.map(normalizePostgresMyCardRow);
    },
    async findMyCardByPlayerId(playerId: string) {
      const result = await pool.query<PostgresMyCardRow>(
        `SELECT id, player_id, nickname, level, custom_notes, added_at
         FROM my_cards
         WHERE player_id = $1
         LIMIT 1`,
        [playerId]
      );

      return result.rows[0] ? normalizePostgresMyCardRow(result.rows[0]) : null;
    },
    async saveMyCard(card: PersistedMyCard) {
      await pool.query(
        `INSERT INTO my_cards (id, player_id, nickname, level, custom_notes, added_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (player_id) DO UPDATE SET
           nickname = EXCLUDED.nickname,
           level = EXCLUDED.level,
           custom_notes = EXCLUDED.custom_notes`,
        [
          card.id,
          card.playerId,
          card.nickname ?? null,
          card.level ?? null,
          card.customNotes ?? null,
          card.addedAt
        ]
      );
    },
    async deleteMyCard(cardId: string) {
      const result = await pool.query("DELETE FROM my_cards WHERE id = $1", [cardId]);

      return (result.rowCount ?? 0) > 0;
    },
    async clearMyCards() {
      await pool.query("DELETE FROM my_cards");
    }
  };
}

type PostgresMyCardRow = {
  id: string;
  player_id: string;
  nickname: string | null;
  level: number | null;
  custom_notes: string | null;
  added_at: string;
};

function parsePlayerData(data: PlayerCard | string) {
  return typeof data === "string" ? (JSON.parse(data) as PlayerCard) : data;
}

function normalizePostgresMyCardRow(row: PostgresMyCardRow): PersistedMyCard {
  return normalizeMyCardRow({
    id: row.id,
    playerId: row.player_id,
    nickname: row.nickname,
    level: row.level,
    customNotes: row.custom_notes,
    addedAt: row.added_at
  });
}

function normalizeSqliteMyCardRow(row: typeof myCardsTable.$inferSelect): PersistedMyCard {
  return normalizeMyCardRow({
    id: row.id,
    playerId: row.playerId,
    nickname: row.nickname,
    level: row.level,
    customNotes: row.customNotes,
    addedAt: row.addedAt
  });
}

function normalizeMyCardRow(row: MyCardRow): PersistedMyCard {
  return {
    id: row.id,
    playerId: row.playerId,
    ...(row.nickname ? { nickname: row.nickname } : {}),
    ...(row.level !== null ? { level: row.level } : {}),
    ...(row.customNotes ? { customNotes: row.customNotes } : {}),
    addedAt: row.addedAt
  };
}

function toSqliteMyCardRow(card: PersistedMyCard): typeof myCardsTable.$inferInsert {
  return {
    id: card.id,
    playerId: card.playerId,
    nickname: card.nickname ?? null,
    level: card.level ?? null,
    customNotes: card.customNotes ?? null,
    addedAt: card.addedAt
  };
}

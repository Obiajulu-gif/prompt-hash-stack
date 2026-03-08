import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DraftRecord } from "@/lib/marketplace";

type DraftStore = {
  drafts: Record<string, DraftRecord>;
};

const DATA_DIR = path.join(process.cwd(), "data", "runtime");
const STORE_PATH = path.join(DATA_DIR, "drafts.json");

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function ensureStore() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(STORE_PATH, "utf8");
  } catch {
    const emptyStore: DraftStore = { drafts: {} };
    await writeFile(STORE_PATH, JSON.stringify(emptyStore, null, 2), "utf8");
  }
}

async function readStore() {
  await ensureStore();
  const raw = await readFile(STORE_PATH, "utf8");
  return JSON.parse(raw) as DraftStore;
}

async function writeStore(store: DraftStore) {
  await ensureStore();
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function listDrafts() {
  const store = await readStore();
  return Object.values(store.drafts).sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export async function listDraftsBySeller(seller: string) {
  const drafts = await listDrafts();
  return drafts.filter(draft => draft.seller.toLowerCase() === seller.toLowerCase());
}

export async function getDraft(slug: string) {
  const store = await readStore();
  return store.drafts[slug] ?? null;
}

export async function createDraft(input: {
  seller: string;
  title: string;
  summary: string;
  category: string;
  premiumContent: string;
}) {
  const store = await readStore();
  const slugBase = slugify(input.title) || "listing";
  const slug = `${slugBase}-${Date.now().toString(36)}`;
  const now = new Date().toISOString();

  const draft: DraftRecord = {
    slug,
    seller: input.seller,
    title: input.title,
    summary: input.summary,
    category: input.category,
    premiumContent: input.premiumContent,
    contractListingId: null,
    createTxId: null,
    publishTxId: null,
    createdAt: now,
    updatedAt: now,
  };

  store.drafts[slug] = draft;
  await writeStore(store);
  return draft;
}

export async function updateDraft(slug: string, patch: Partial<DraftRecord>) {
  const store = await readStore();
  const current = store.drafts[slug];
  if (!current) {
    throw new Error(`Draft ${slug} was not found.`);
  }

  const next: DraftRecord = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  store.drafts[slug] = next;
  await writeStore(store);
  return next;
}

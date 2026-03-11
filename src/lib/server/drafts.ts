import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { normalizeAsset, type DraftRecord } from "@/lib/marketplace";

type DraftStore = {
  drafts: Record<string, DraftRecord>;
};

function resolveDataDir() {
  const configured = process.env.DRAFTS_STORE_DIR?.trim();
  if (configured) {
    return path.resolve(configured);
  }

  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), "prompt-hash-x402", "runtime");
  }

  return path.join(process.cwd(), "data", "runtime");
}

const DATA_DIR = resolveDataDir();
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
  const parsed = JSON.parse(raw) as DraftStore;
  return {
    drafts: Object.fromEntries(
      Object.entries(parsed.drafts ?? {}).map(([slug, draft]) => [
        slug,
        {
          ...draft,
          priceAtomic:
            typeof draft.priceAtomic === "string" ? draft.priceAtomic : "0",
          asset: normalizeAsset(
            typeof draft.asset === "string" ? draft.asset : "STX",
          ),
          x402Enabled:
            typeof draft.x402Enabled === "boolean" ? draft.x402Enabled : true,
        } satisfies DraftRecord,
      ]),
    ),
  } satisfies DraftStore;
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
  priceAtomic: string;
  asset: DraftRecord["asset"];
  x402Enabled: boolean;
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
    priceAtomic: input.priceAtomic,
    asset: input.asset,
    x402Enabled: input.x402Enabled,
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
    priceAtomic:
      typeof patch.priceAtomic === "string" ? patch.priceAtomic : current.priceAtomic,
    asset: normalizeAsset(patch.asset ?? current.asset),
    x402Enabled:
      typeof patch.x402Enabled === "boolean"
        ? patch.x402Enabled
        : current.x402Enabled,
    updatedAt: new Date().toISOString(),
  };

  store.drafts[slug] = next;
  await writeStore(store);
  return next;
}

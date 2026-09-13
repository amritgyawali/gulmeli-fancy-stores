import { createId } from "./ids.ts";
import {
  configDiff,
  defaultConfig,
  restoreConfig,
  type StorefrontConfig,
} from "./config.ts";
import type { PublishStatus } from "./types.ts";

const MAX_VERSIONS = 30;

export interface ConfigVersion {
  id: string;
  createdAt: string;
  actorName: string;
  label: string;
  /** Dotted paths that changed against the version before it. */
  changedPaths: string[];
  config: StorefrontConfig;
}

/**
 * Draft and published copies of the storefront configuration, plus the version
 * history that makes "preview, publish, roll back" possible.
 */
export interface ConfigState {
  draft: StorefrontConfig;
  published: StorefrontConfig;
  publishedAt: string;
  /** When set, the draft is published automatically at or after this time. */
  scheduledFor: string | null;
  versions: ConfigVersion[];
}

export function initialConfigState(
  config: StorefrontConfig = defaultConfig,
): ConfigState {
  const timestamp = new Date().toISOString();
  return {
    draft: config,
    published: config,
    publishedAt: timestamp,
    scheduledFor: null,
    versions: [
      {
        id: createId("cfg"),
        createdAt: timestamp,
        actorName: "System",
        label: "Initial configuration",
        changedPaths: [],
        config,
      },
    ],
  };
}

/** Reads a persisted state back, repairing anything missing or malformed. */
export function restoreConfigState(value: unknown): ConfigState {
  if (!value || typeof value !== "object") return initialConfigState();
  const raw = value as Partial<ConfigState>;
  const published = restoreConfig(raw.published);
  const versions = Array.isArray(raw.versions)
    ? raw.versions
        .filter((entry): entry is ConfigVersion =>
          Boolean(entry && typeof entry === "object"),
        )
        .map((entry) => ({
          id: typeof entry.id === "string" ? entry.id : createId("cfg"),
          createdAt:
            typeof entry.createdAt === "string"
              ? entry.createdAt
              : new Date().toISOString(),
          actorName:
            typeof entry.actorName === "string" ? entry.actorName : "System",
          label: typeof entry.label === "string" ? entry.label : "Version",
          changedPaths: Array.isArray(entry.changedPaths)
            ? entry.changedPaths.map(String)
            : [],
          config: restoreConfig(entry.config),
        }))
        .slice(0, MAX_VERSIONS)
    : [];
  return {
    draft: restoreConfig(raw.draft ?? raw.published),
    published,
    publishedAt:
      typeof raw.publishedAt === "string"
        ? raw.publishedAt
        : new Date().toISOString(),
    scheduledFor:
      typeof raw.scheduledFor === "string" && raw.scheduledFor
        ? raw.scheduledFor
        : null,
    versions: versions.length
      ? versions
      : initialConfigState(published).versions,
  };
}

export function hasUnpublishedChanges(state: ConfigState): boolean {
  return configDiff(state.published, state.draft).length > 0;
}

export function draftChanges(state: ConfigState): string[] {
  return configDiff(state.published, state.draft);
}

/** Edits the draft. Nothing reaches the storefront until it is published. */
export function updateDraft(
  state: ConfigState,
  draft: StorefrontConfig,
): ConfigState {
  return { ...state, draft };
}

export function discardDraft(state: ConfigState): ConfigState {
  return { ...state, draft: state.published, scheduledFor: null };
}

/** Publishes the draft and records a restorable version. */
export function publishDraft(
  state: ConfigState,
  actorName: string,
  label?: string,
): ConfigState {
  const changedPaths = configDiff(state.published, state.draft);
  const timestamp = new Date().toISOString();
  const published: StorefrontConfig = {
    ...state.draft,
    version: state.published.version + 1,
  };
  const version: ConfigVersion = {
    id: createId("cfg"),
    createdAt: timestamp,
    actorName,
    label: label ?? `Published ${changedPaths.length} change(s)`,
    changedPaths,
    config: published,
  };
  return {
    draft: published,
    published,
    publishedAt: timestamp,
    scheduledFor: null,
    versions: [version, ...state.versions].slice(0, MAX_VERSIONS),
  };
}

export function schedulePublish(state: ConfigState, when: string): ConfigState {
  return { ...state, scheduledFor: when };
}

/** Publishes a scheduled draft once its time has come. */
export function applyScheduledPublish(
  state: ConfigState,
  now = new Date(),
): ConfigState {
  if (!state.scheduledFor) return state;
  if (Date.parse(state.scheduledFor) > now.getTime()) return state;
  return publishDraft(state, "Scheduled publish", "Scheduled publish");
}

/** Loads an earlier version back into the draft, ready to preview and publish. */
export function rollbackTo(state: ConfigState, versionId: string): ConfigState {
  const version = state.versions.find((entry) => entry.id === versionId);
  if (!version) return state;
  return {
    ...state,
    draft: { ...version.config, version: state.published.version },
  };
}

/**
 * Whether a schedulable record should currently be visible to customers.
 * Draft and archived records never are; scheduled ones respect their window.
 */
export interface Schedulable {
  status?: PublishStatus | string;
  publishAt?: string | null;
  unpublishAt?: string | null;
  [key: string]: unknown;
}

export function isLive(record: Schedulable, now = new Date()): boolean {
  const status = record.status ?? "published";
  if (status === "draft" || status === "archived") return false;
  const time = now.getTime();
  if (record.publishAt && Date.parse(record.publishAt) > time) return false;
  if (record.unpublishAt && Date.parse(record.unpublishAt) <= time)
    return false;
  return status === "published" || status === "scheduled";
}

/** The status a scheduled record should show, given the clock. */
export function effectiveStatus(
  record: Schedulable,
  now = new Date(),
): PublishStatus {
  const status = (record.status ?? "published") as PublishStatus;
  if (status === "draft" || status === "archived") return status;
  const time = now.getTime();
  if (record.publishAt && Date.parse(record.publishAt) > time)
    return "scheduled";
  if (record.unpublishAt && Date.parse(record.unpublishAt) <= time)
    return "archived";
  return "published";
}

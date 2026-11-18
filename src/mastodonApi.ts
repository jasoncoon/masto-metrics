import { type MastodonAccount, parseNextMaxId, sleep } from "@social-metrics/web-core";

export interface MastodonStatus {
  id: string;
  created_at: string;
  url: string | null;
  uri: string;
  content: string;
  spoiler_text: string;
  favourites_count: number;
  reblogs_count: number;
  replies_count: number;
}

/** Pages through a Mastodon list endpoint, handing each page to `onPage`. */
async function pageThrough<T>(
  url: (maxId?: string) => string,
  onPage: (items: T[]) => void,
  signal: AbortSignal,
  nextMaxId: (response: Response, items: T[]) => string | undefined,
  delayMs: number
) {
  let maxId: string | undefined;
  while (!signal.aborted) {
    const response = await fetch(url(maxId), { signal });
    if (!response.ok) throw new Error(`HTTP ${response.status} from ${response.url}`);
    const items = (await response.json()) as T[];
    onPage(items);
    const next = nextMaxId(response, items);
    if (!next || next === maxId || !items.length) return;
    maxId = next;
    await sleep(delayMs);
  }
}

const linkMaxId = (response: Response) => parseNextMaxId(response.headers.get("link"));

export function getFollowers(
  server: string,
  accountId: string,
  onPage: (accounts: MastodonAccount[]) => void,
  signal: AbortSignal
) {
  return pageThrough<MastodonAccount>(
    (maxId) => `https://${server}/api/v1/accounts/${accountId}/followers?limit=80${maxId ? `&max_id=${maxId}` : ""}`,
    onPage,
    signal,
    linkMaxId,
    500
  );
}

export async function getAllFollowing(server: string, accountId: string, signal: AbortSignal) {
  const all: MastodonAccount[] = [];
  await pageThrough<MastodonAccount>(
    (maxId) => `https://${server}/api/v1/accounts/${accountId}/following?limit=80${maxId ? `&max_id=${maxId}` : ""}`,
    (page) => all.push(...page),
    signal,
    linkMaxId,
    500
  );
  return all;
}

export function getStatuses(
  server: string,
  accountId: string,
  onPage: (statuses: MastodonStatus[]) => void,
  signal: AbortSignal
) {
  return pageThrough<MastodonStatus>(
    (maxId) =>
      `https://${server}/api/v1/accounts/${accountId}/statuses?limit=40&exclude_replies=true&exclude_reblogs=true${maxId ? `&max_id=${maxId}` : ""}`,
    onPage,
    signal,
    (response, items) => linkMaxId(response) ?? items.at(-1)?.id,
    1000
  );
}

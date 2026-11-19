import { SwapOutlined } from "@ant-design/icons";
import {
  AppShell,
  formatCount,
  HandleSearch,
  type MastodonAccount,
  mastodon,
  PageTitle,
  ProfileHeader,
  sanitizeHtml,
  TrackedProfiles,
  useIsMobile,
  useUrlParams,
} from "@social-metrics/web-core";
import { Alert, Avatar, Button, Card, Flex, Spin, Table, type TableColumnsType, Tooltip, Typography } from "antd";
import { type CSSProperties, useMemo } from "react";
import { getAllFollowing, getFollowers } from "./mastodonApi";
import { useAccountList } from "./useAccountList";

interface Row extends MastodonAccount {
  mutual: boolean;
}

const pageHref = (h: string) => `./followers.html?handle=${encodeURIComponent(h)}`;

async function loadFollowers(
  server: string,
  account: MastodonAccount,
  push: (rows: Row[]) => void,
  setStatus: (s: string) => void,
  signal: AbortSignal
) {
  setStatus("Getting accounts they follow (to find mutuals)…");
  const following = new Set((await getAllFollowing(server, account.id, signal)).map((a) => a.id));
  let count = 0;
  await getFollowers(
    server,
    account.id,
    (page) => {
      count += page.length;
      setStatus(`Getting followers… ${formatCount(count)} of ${formatCount(account.followers_count)}`);
      push(page.map((a) => ({ ...a, mutual: following.has(a.id) })));
    },
    signal
  );
}

const ratio = (r: Row) => (r.following_count ? r.followers_count / r.following_count : undefined);

const ellipsis: CSSProperties = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

type RankedRow = Row & { rank: number };
type Column = TableColumnsType<RankedRow>[number];

/**
 * On phones the name is pinned (and narrow), and the counts come right after it
 * so they're on screen; mutual and rank move further along.
 */
const getColumns = (mobile: boolean): TableColumnsType<RankedRow> => {
  const rank: Column = { title: "#", dataIndex: "rank", width: 56, align: "right" };
  const name: Column = {
    title: "Name",
    key: "name",
    fixed: mobile ? "start" : undefined,
    sorter: (a, b) => (a.display_name || a.username).localeCompare(b.display_name || b.username),
    render: (_, r) => (
      <Flex gap={mobile ? 6 : 8} align="center" style={mobile ? { width: "min(40vw, 190px)" } : { minWidth: 220 }}>
        <Avatar src={r.avatar_static} size={mobile ? 24 : 32} style={{ flex: "none" }} />
        <Flex vertical style={{ minWidth: 0, lineHeight: 1.25 }}>
          <a href={r.url} target="_blank" rel="noopener noreferrer" style={mobile ? ellipsis : undefined}>
            {r.display_name || r.username}
          </a>
          <Typography.Text type="secondary" style={{ fontSize: 12, ...(mobile && ellipsis) }}>
            @{r.acct}
          </Typography.Text>
        </Flex>
      </Flex>
    ),
  };
  const [mutual, followers, following, fpf, posts, joined, bio] = dataColumns(mobile);
  return mobile
    ? [name, followers, following, fpf, posts, mutual, rank, joined, bio]
    : [rank, name, mutual, followers, following, fpf, posts, joined, bio];
};

/** Mutual, Followers, Following, FPF, Posts, Joined, Bio. */
const dataColumns = (mobile: boolean): [Column, Column, Column, Column, Column, Column, Column] => [
  {
    title: "Mutual",
    key: "mutual",
    align: "center",
    filters: [
      { text: "Mutuals", value: true },
      { text: "Not mutual", value: false },
    ],
    onFilter: (value, r) => r.mutual === value,
    sorter: (a, b) => Number(a.mutual) - Number(b.mutual),
    render: (_, r) =>
      r.mutual ? (
        <Tooltip title="Mutual: they follow each other">
          <SwapOutlined aria-label="Mutual" />
        </Tooltip>
      ) : null,
  },
  {
    title: "Followers",
    dataIndex: "followers_count",
    align: "right",
    defaultSortOrder: "descend",
    sorter: (a, b) => a.followers_count - b.followers_count,
    render: formatCount,
  },
  {
    title: "Following",
    dataIndex: "following_count",
    align: "right",
    sorter: (a, b) => a.following_count - b.following_count,
    render: formatCount,
  },
  {
    title: <Tooltip title="Followers per follow">FPF</Tooltip>,
    key: "fpf",
    align: "right",
    sorter: (a, b) => (ratio(a) ?? -1) - (ratio(b) ?? -1),
    render: (_, r) => ratio(r)?.toFixed(1) ?? "–",
  },
  {
    title: "Posts",
    dataIndex: "statuses_count",
    align: "right",
    sorter: (a, b) => a.statuses_count - b.statuses_count,
    render: formatCount,
  },
  {
    title: "Joined",
    dataIndex: "created_at",
    sorter: (a, b) => a.created_at.localeCompare(b.created_at),
    render: (d: string) => new Date(d).toLocaleDateString(),
  },
  {
    title: "Bio",
    dataIndex: "note",
    render: (note: string) => (
      <div
        style={{ maxWidth: "min(480px, 70vw)", maxHeight: mobile ? 54 : 96, overflow: "auto", fontSize: 12 }}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(note) }}
      />
    ),
  },
];

export function FollowersPage() {
  const [params, update] = useUrlParams();
  const handle = mastodon.normalizeHandle(params.get("handle") ?? "");
  const state = useAccountList<Row>(handle, loadFollowers);

  // Rank by follower count, independent of the table's current sort.
  const rows = useMemo(
    () =>
      [...state.items]
        .sort((a, b) => b.followers_count - a.followers_count)
        .map((r, i) => ({ ...r, rank: i + 1 })),
    [state.items]
  );
  const mutuals = rows.filter((r) => r.mutual).length;
  const mobile = useIsMobile();
  const columns = useMemo(() => getColumns(mobile), [mobile]);

  const progress = state.loading && (
    <Flex gap={12} align="center" wrap>
      <Spin size="small" />
      <Typography.Text type="secondary">{state.status}</Typography.Text>
      <Button size="small" onClick={state.stop}>
        Stop
      </Button>
    </Flex>
  );

  return (
    <AppShell platform={mastodon} current="followers" title={`${state.profile?.displayName ?? handle} followers`}>
      <PageTitle>Followers</PageTitle>
      <HandleSearch platform={mastodon} handle={handle} onSearch={(h) => update({ handle: h }, { push: true })} />

      {!handle ? (
        <TrackedProfiles platform={mastodon} hrefFor={pageHref} />
      ) : state.profile === null ? (
        <Alert type="error" showIcon title={`Couldn't find ${handle}`} />
      ) : (
        <>
          {state.profile && <ProfileHeader profile={state.profile} />}
          {state.error && <Alert type="error" showIcon title={state.error} style={{ marginBottom: 16 }} />}
          <Card
            title={`${formatCount(rows.length)} followers · ${formatCount(mutuals)} mutual`}
            // No room beside the title on phones; show progress above the table instead.
            extra={!mobile && progress}
          >
            {mobile && progress && <div style={{ marginBottom: 12 }}>{progress}</div>}
            <Table
              rowKey="id"
              size="small"
              columns={columns}
              dataSource={rows}
              sticky={{ offsetHeader: 64 }}
              scroll={{ x: "max-content" }}
              pagination={{ defaultPageSize: 100, showSizeChanger: true, pageSizeOptions: [50, 100, 250, 500] }}
              showSorterTooltip={false}
            />
          </Card>
        </>
      )}
    </AppShell>
  );
}

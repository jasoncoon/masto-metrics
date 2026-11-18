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
  useUrlParams,
} from "@social-metrics/web-core";
import { Alert, Button, Card, Flex, Spin, Table, type TableColumnsType, Typography } from "antd";
import { useMemo } from "react";
import { getStatuses, type MastodonStatus } from "./mastodonApi";
import { useAccountList } from "./useAccountList";

const pageHref = (h: string) => `./posts.html?handle=${encodeURIComponent(h)}`;

async function loadPosts(
  server: string,
  account: MastodonAccount,
  push: (posts: MastodonStatus[]) => void,
  setStatus: (s: string) => void,
  signal: AbortSignal
) {
  let count = 0;
  setStatus("Getting posts…");
  await getStatuses(
    server,
    account.id,
    (page) => {
      count += page.length;
      setStatus(`Getting posts… ${formatCount(count)} so far`);
      push(page);
    },
    signal
  );
}

const columns: TableColumnsType<MastodonStatus & { rank: number }> = [
  { title: "#", dataIndex: "rank", width: 56, align: "right" },
  {
    title: "Date",
    dataIndex: "created_at",
    sorter: (a, b) => a.created_at.localeCompare(b.created_at),
    render: (d: string, r) => (
      <a href={r.url ?? r.uri} target="_blank" rel="noopener noreferrer" style={{ whiteSpace: "nowrap" }}>
        {new Date(d).toLocaleString()}
      </a>
    ),
  },
  {
    title: "Favorites",
    dataIndex: "favourites_count",
    align: "right",
    defaultSortOrder: "descend",
    sorter: (a, b) => a.favourites_count - b.favourites_count,
    render: formatCount,
  },
  {
    title: "Boosts",
    dataIndex: "reblogs_count",
    align: "right",
    sorter: (a, b) => a.reblogs_count - b.reblogs_count,
    render: formatCount,
  },
  {
    title: "Replies",
    dataIndex: "replies_count",
    align: "right",
    sorter: (a, b) => a.replies_count - b.replies_count,
    render: formatCount,
  },
  {
    title: "Content",
    dataIndex: "content",
    render: (content: string, r) => (
      <div style={{ maxWidth: 720 }}>
        {r.spoiler_text && <Typography.Text type="warning">CW: {r.spoiler_text}</Typography.Text>}
        <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />
      </div>
    ),
  },
];

export function PostsPage() {
  const [params, update] = useUrlParams();
  const handle = mastodon.normalizeHandle(params.get("handle") ?? "");
  const state = useAccountList<MastodonStatus>(handle, loadPosts);

  // Rank by favorites, independent of the table's current sort.
  const rows = useMemo(
    () =>
      [...state.items]
        .sort((a, b) => b.favourites_count - a.favourites_count)
        .map((r, i) => ({ ...r, rank: i + 1 })),
    [state.items]
  );

  return (
    <AppShell platform={mastodon} current="posts" title={`${state.profile?.displayName ?? handle} top posts`}>
      <PageTitle>Top posts</PageTitle>
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
            title={`${formatCount(rows.length)} posts (excluding replies and boosts)`}
            extra={
              state.loading && (
                <Flex gap={12} align="center">
                  <Spin size="small" />
                  <Typography.Text type="secondary">{state.status}</Typography.Text>
                  <Button size="small" onClick={state.stop}>
                    Stop
                  </Button>
                </Flex>
              )
            }
          >
            <Table
              rowKey="id"
              size="small"
              columns={columns}
              dataSource={rows}
              sticky={{ offsetHeader: 64 }}
              scroll={{ x: "max-content" }}
              pagination={{ defaultPageSize: 50, showSizeChanger: true }}
              showSorterTooltip={false}
            />
          </Card>
        </>
      )}
    </AppShell>
  );
}

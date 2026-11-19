import { MessageOutlined, RetweetOutlined, StarOutlined } from "@ant-design/icons";
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
import { Alert, Button, Card, Flex, Spin, Table, type TableColumnsType, Tooltip, Typography } from "antd";
import { type ReactNode, useMemo } from "react";
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

type RankedStatus = MastodonStatus & { rank: number };
type Column = TableColumnsType<RankedStatus>[number];

const countColumn = (
  title: string,
  icon: ReactNode,
  key: "favourites_count" | "reblogs_count" | "replies_count",
  mobile: boolean
): Column => ({
  // Icons instead of words on phones, so three count columns fit beside the post.
  title: mobile ? <Tooltip title={title}><span aria-label={title}>{icon}</span></Tooltip> : title,
  dataIndex: key,
  align: "right",
  sorter: (a, b) => a[key] - b[key],
  render: formatCount,
  ...(key === "favourites_count" && { defaultSortOrder: "descend" as const }),
});

const postLink = (r: RankedStatus, label: string) => (
  <a href={r.url ?? r.uri} target="_blank" rel="noopener noreferrer" style={{ whiteSpace: "nowrap" }}>
    {label}
  </a>
);

const postBody = (r: RankedStatus) => (
  <>
    {r.spoiler_text && <Typography.Text type="warning">CW: {r.spoiler_text}</Typography.Text>}
    <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(r.content) }} />
  </>
);

/**
 * Desktop: rank, date, counts, then the post. Phones: the post (with its date)
 * first, sized to fill the screen, and narrow icon-headed counts beside it,
 * so posts read without scrolling sideways.
 */
const getColumns = (mobile: boolean): TableColumnsType<RankedStatus> => {
  const counts = [
    countColumn("Favorites", <StarOutlined />, "favourites_count", mobile),
    countColumn("Boosts", <RetweetOutlined />, "reblogs_count", mobile),
    countColumn("Replies", <MessageOutlined />, "replies_count", mobile),
  ];
  if (mobile) {
    return [
      {
        title: "Post",
        key: "post",
        sorter: (a, b) => a.created_at.localeCompare(b.created_at),
        render: (_, r) => (
          <div style={{ width: "max(160px, calc(100vw - 210px))", overflowWrap: "anywhere" }}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              #{r.rank} · {postLink(r, new Date(r.created_at).toLocaleDateString())}
            </Typography.Text>
            {postBody(r)}
          </div>
        ),
      },
      ...counts,
    ];
  }
  return [
    { title: "#", dataIndex: "rank", width: 56, align: "right" },
    {
      title: "Date",
      dataIndex: "created_at",
      sorter: (a, b) => a.created_at.localeCompare(b.created_at),
      render: (d: string, r) => postLink(r, new Date(d).toLocaleString()),
    },
    ...counts,
    {
      title: "Content",
      dataIndex: "content",
      render: (_, r) => <div style={{ maxWidth: 720 }}>{postBody(r)}</div>,
    },
  ];
};

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
              pagination={{ defaultPageSize: 50, showSizeChanger: true }}
              showSorterTooltip={false}
            />
          </Card>
        </>
      )}
    </AppShell>
  );
}

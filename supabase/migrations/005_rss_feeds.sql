-- RSS feed subscriptions per user
create table user_feeds (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  feed_url text not null,
  title text,
  last_polled_at timestamptz,
  error_count int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  unique (user_id, feed_url)
);

create index idx_user_feeds_user_id on user_feeds (user_id);

-- Tracks seen RSS items for deduplication
create table feed_items (
  id uuid primary key default gen_random_uuid(),
  feed_id uuid not null references user_feeds (id) on delete cascade,
  guid text not null,
  link text not null,
  title text,
  published_at timestamptz,
  article_id uuid references articles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (feed_id, guid)
);

create index idx_feed_items_feed_id on feed_items (feed_id);
create index idx_feed_items_link on feed_items (link);

alter table articles
  add column if not exists last_analyzed_at timestamptz;

create table if not exists article_word_matches (
  id serial primary key,
  article_id uuid not null references articles(id) on delete cascade,
  user_id text not null,
  source text not null check (source in ('topik', 'custom')),
  topik_word_id int references topik_words(id),
  custom_word_id int references user_custom_words(id),
  surface_form text not null,
  normalized_form text not null,
  base_form text not null,
  match_confidence text not null check (match_confidence in ('exact', 'derived')),
  created_at timestamptz not null default now(),
  check ((topik_word_id is not null) <> (custom_word_id is not null))
);

create unique index if not exists article_word_matches_unique_topik
  on article_word_matches (article_id, topik_word_id)
  where source = 'topik' and topik_word_id is not null;

create unique index if not exists article_word_matches_unique_custom
  on article_word_matches (article_id, custom_word_id)
  where source = 'custom' and custom_word_id is not null;

create index if not exists article_word_matches_article_idx
  on article_word_matches (article_id);

create index if not exists article_word_matches_user_created_idx
  on article_word_matches (user_id, created_at desc);

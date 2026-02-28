create extension if not exists "uuid-ossp";

-- User preferences
create table user_settings (
  user_id    text primary key,
  topik_level int not null default 2 check (topik_level between 1 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Global TOPIK dictionary (~2,300 words, pre-seeded once)
create table topik_words (
  id           serial primary key,
  korean       text not null,
  english      text,
  romanization text,
  topik_level  smallint not null check (topik_level between 1 and 6)
);

-- Per-user mastery: row created on first encounter (mastery starts at 0)
create table user_word_mastery (
  id            serial primary key,
  user_id       text not null,
  word_id       int not null references topik_words(id),
  mastery       smallint not null default 0 check (mastery between 0 and 100),
  times_correct int not null default 0,
  times_seen    int not null default 0,
  unique (user_id, word_id)
);

-- User-added custom words (non-TOPIK vocabulary)
create table user_custom_words (
  id           serial primary key,
  user_id      text not null,
  korean       text not null,
  english      text,
  romanization text,
  mastery      smallint not null default 0 check (mastery between 0 and 100),
  added_at     timestamptz not null default now()
);

-- Articles — adapted_korean is a JSONB Segment[] array
create table articles (
  id                      uuid primary key default uuid_generate_v4(),
  user_id                 text not null,
  source_url              text not null,
  title                   text not null,
  adapted_korean          jsonb not null default '[]',
  original_english        text not null,
  topik_level_at_time     int not null,
  status                  text not null default 'unread'
                            check (status in ('unread', 'reading', 'completed')),
  word_quiz_score         int not null default 0,
  comprehension_score     int not null default 0,
  total_score             int not null default 0,
  comprehension_questions jsonb not null default '[]',
  created_at              timestamptz not null default now(),
  completed_at            timestamptz
);

create index on topik_words (korean);
create index on topik_words (topik_level);
create index on user_word_mastery (user_id);
create index on user_word_mastery (user_id, word_id);
create index on user_custom_words (user_id);
create index on articles (user_id, status);
create index on articles (user_id, created_at desc);

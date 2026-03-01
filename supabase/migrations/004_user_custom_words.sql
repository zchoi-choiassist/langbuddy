-- Custom words added by users via the reading view tap-to-lookup feature
create table if not exists user_custom_words (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  korean text not null,
  english text not null,
  romanization text not null,
  created_at timestamptz default now() not null,
  constraint user_custom_words_unique unique (user_id, korean)
);

-- Index for fast lookup by user
create index if not exists idx_user_custom_words_user_id on user_custom_words (user_id);

-- RLS
alter table user_custom_words enable row level security;

create policy "Users can read their own custom words"
  on user_custom_words for select
  using (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

create policy "Users can insert their own custom words"
  on user_custom_words for insert
  with check (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

create policy "Users can delete their own custom words"
  on user_custom_words for delete
  using (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

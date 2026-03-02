alter table user_custom_words
  add column if not exists topik_level smallint not null default 3
  check (topik_level between 1 and 6);

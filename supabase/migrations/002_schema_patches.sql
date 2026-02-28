-- Auto-update updated_at on user_settings modifications
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_settings_updated_at
before update on user_settings
for each row execute procedure set_updated_at();

-- Enforce topik_level_at_time range consistent with other level columns
alter table articles
  add constraint articles_topik_level_at_time_range
  check (topik_level_at_time between 1 and 6);

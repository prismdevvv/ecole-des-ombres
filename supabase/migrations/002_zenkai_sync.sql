-- Synchronisation autonome dans Supabase, sans clé secrète dans GitHub.
create extension if not exists http with schema extensions;
create extension if not exists pg_cron;

create or replace function public.sync_school_zenkai()
returns integer language plpgsql security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  payload jsonb;
  response extensions.http_response;
  page_number integer := 1;
  page_count integer := 1;
  total integer := 0;
begin
  perform pg_advisory_xact_lock(78120415);
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '20000');
  create temporary table school_zenkai_stage
    (char_key text primary key, discord_id text, name text not null,
     last_played_at timestamptz, divisions jsonb not null) on commit drop;
  while page_number <= page_count loop
    select * into response from extensions.http_get(
      'https://db.builtbyloris.dev/api/characters?hidden=all&limit=500&page=' || page_number);
    if response.status <> 200 then
      raise exception 'Zenkai HTTP %', response.status;
    end if;
    payload := response.content::jsonb;
    if payload->>'success' <> 'true' or jsonb_typeof(payload->'data') <> 'array' then
      raise exception 'Réponse Zenkai invalide';
    end if;
    page_count := coalesce((payload->>'pages')::integer, 1);
    if page_count > 100 then raise exception 'Pagination Zenkai inattendue'; end if;
    insert into school_zenkai_stage
    select c->>'charKey', nullif(c->>'discordId', ''), c->>'name',
      nullif(c->>'lastPlayedAt', '')::timestamptz, coalesce(c->'divisions', '[]'::jsonb)
    from jsonb_array_elements(payload->'data') c
    where nullif(c->>'charKey','') is not null and nullif(c->>'name','') is not null
    on conflict(char_key) do update set discord_id=excluded.discord_id,
      name=excluded.name,last_played_at=excluded.last_played_at,divisions=excluded.divisions;
    page_number := page_number + 1;
  end loop;
  select count(*) into total from school_zenkai_stage;
  if total = 0 then raise exception 'Synchronisation vide refusée'; end if;
  insert into public.zenkai_characters
    select * from school_zenkai_stage
    on conflict(char_key) do update set discord_id=excluded.discord_id,
      name=excluded.name,last_played_at=excluded.last_played_at,divisions=excluded.divisions;
  update public.zenkai_characters z set discord_id=null
    where z.discord_id is not null
      and not exists(select 1 from school_zenkai_stage s where s.char_key=z.char_key);
  return total;
end;
$$;
revoke all on function public.sync_school_zenkai() from public, anon, authenticated;

select cron.schedule('school-zenkai-sync', '*/30 * * * *', 'select public.sync_school_zenkai();');
select public.sync_school_zenkai();

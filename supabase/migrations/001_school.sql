-- Apply in Supabase SQL Editor. No browser access: only the authenticated Edge Function.
create table public.school_state(id integer primary key check(id=1), data jsonb not null, version bigint not null default 0);
create table public.zenkai_characters(char_key text primary key, discord_id text, name text not null, last_played_at timestamptz, divisions jsonb not null default '[]');
create index on public.zenkai_characters(discord_id);
create table public.rtc_messages(id bigint generated always as identity primary key, sender text not null, name text not null, data jsonb not null, created_at timestamptz not null default now());
create index on public.rtc_messages(created_at);
alter table public.school_state enable row level security;
alter table public.zenkai_characters enable row level security;
alter table public.rtc_messages enable row level security;
revoke all on public.school_state, public.zenkai_characters, public.rtc_messages from anon, authenticated;
grant all on public.school_state, public.zenkai_characters, public.rtc_messages to service_role;
grant usage, select on sequence public.rtc_messages_id_seq to service_role;
insert into public.school_state(id,data) values(1,'{"users": {}, "sessions": {}, "cours": [], "rapports": [], "parties": [], "game": null}'::jsonb);

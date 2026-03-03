-- ============================================================
-- AI Node View — Supabase Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Conversations ─────────────────────────────────────────────
create table if not exists conversations (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  title      text not null default 'New Conversation',
  created_at timestamptz default now()
);

alter table conversations enable row level security;

create policy "Users can view own conversations"
  on conversations for select
  using (auth.uid() = user_id);

create policy "Users can insert own conversations"
  on conversations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own conversations"
  on conversations for update
  using (auth.uid() = user_id);

create policy "Users can delete own conversations"
  on conversations for delete
  using (auth.uid() = user_id);

-- ── Nodes ─────────────────────────────────────────────────────
create table if not exists nodes (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid references conversations(id) on delete cascade not null,
  parent_id       uuid references nodes(id) on delete cascade,
  prompt          text not null,
  response        text not null default '',
  pos_x           float not null default 0,
  pos_y           float not null default 0,
  created_at      timestamptz default now()
);

alter table nodes enable row level security;

create policy "Users can view own nodes"
  on nodes for select
  using (
    exists (
      select 1 from conversations c
      where c.id = nodes.conversation_id
        and c.user_id = auth.uid()
    )
  );

create policy "Users can insert own nodes"
  on nodes for insert
  with check (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
        and c.user_id = auth.uid()
    )
  );

create policy "Users can update own nodes"
  on nodes for update
  using (
    exists (
      select 1 from conversations c
      where c.id = nodes.conversation_id
        and c.user_id = auth.uid()
    )
  );

create policy "Users can delete own nodes"
  on nodes for delete
  using (
    exists (
      select 1 from conversations c
      where c.id = nodes.conversation_id
        and c.user_id = auth.uid()
    )
  );

-- ── Indexes ───────────────────────────────────────────────────
create index if not exists idx_conversations_user_id on conversations(user_id);
create index if not exists idx_nodes_conversation_id on nodes(conversation_id);
create index if not exists idx_nodes_parent_id on nodes(parent_id);

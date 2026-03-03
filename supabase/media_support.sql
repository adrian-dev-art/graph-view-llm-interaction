-- ============================================================
-- Add Media Support
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add columns to nodes table
alter table nodes add column if not exists media_url text;
alter table nodes add column if not exists media_type text; -- 'image' or 'video'

-- Setup Storage Bucket
-- Note: Manual bucket creation via dashboard is recommended, 
-- but these policies work if the bucket 'node-media' is created.

-- 1. Create the bucket
insert into storage.buckets (id, name, public) values ('node-media', 'node-media', true)
on conflict (id) do nothing;

-- 2. RLS Policies for Storage
-- Allow authenticated users to upload to their own folder (user_id)
create policy "Allow authenticated uploads"
on storage.objects for insert
with check (
  bucket_id = 'node-media' AND
  auth.role() = 'authenticated'
);

create policy "Allow public read access"
on storage.objects for select
using ( bucket_id = 'node-media' );

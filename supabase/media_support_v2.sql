-- Add media_items column for multiple media support
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS media_items JSONB DEFAULT '[]'::jsonb;

-- Add is_collapsed column for branch visibility management
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS is_collapsed BOOLEAN DEFAULT false;

-- Migrate existing single media to media_items array (optional but good practice)
UPDATE nodes 
SET media_items = jsonb_build_array(
    jsonb_build_object(
        'url', media_url,
        'type', media_type,
        'name', 'Legacy Media'
    )
)
WHERE media_url IS NOT NULL AND (media_items IS NULL OR media_items = '[]'::jsonb);

-- Migrate existing single media to media_items array (optional but good practice)
UPDATE nodes 
SET media_items = jsonb_build_array(
    jsonb_build_object(
        'url', media_url,
        'type', media_type,
        'name', 'Legacy Media'
    )
)
WHERE media_url IS NOT NULL AND (media_items IS NULL OR media_items = '[]'::jsonb);

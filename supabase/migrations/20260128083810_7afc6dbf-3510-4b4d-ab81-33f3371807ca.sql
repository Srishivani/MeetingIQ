-- Add new columns to meeting_items table for enhanced intelligence
ALTER TABLE public.meeting_items 
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS due_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS raw_phrase text;

-- Add check constraint for priority values
ALTER TABLE public.meeting_items 
ADD CONSTRAINT meeting_items_priority_check 
CHECK (priority IN ('high', 'medium', 'low'));

-- Add check constraint for status values
ALTER TABLE public.meeting_items 
ADD CONSTRAINT meeting_items_status_check 
CHECK (status IN ('pending', 'confirmed', 'dismissed'));

-- Create index for filtering by status and priority
CREATE INDEX IF NOT EXISTS idx_meeting_items_status ON public.meeting_items(status);
CREATE INDEX IF NOT EXISTS idx_meeting_items_priority ON public.meeting_items(priority);
-- Create meeting_items table for real-time phrase detection
CREATE TABLE public.meeting_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  device_key TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('deferred', 'action_item', 'decision', 'question')),
  content TEXT NOT NULL,
  context TEXT, -- surrounding transcript context
  owner TEXT, -- detected owner/assignee for action items
  timestamp_ms INTEGER NOT NULL DEFAULT 0,
  trigger_phrase TEXT, -- the phrase that triggered detection
  is_ai_enhanced BOOLEAN NOT NULL DEFAULT false, -- true if post-processed by AI
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meeting_items ENABLE ROW LEVEL SECURITY;

-- RLS policies (device-scoped like other tables)
CREATE POLICY "Users can view their own meeting items"
  ON public.meeting_items FOR SELECT
  USING (device_key = current_setting('request.headers', true)::json->>'x-device-key');

CREATE POLICY "Users can create their own meeting items"
  ON public.meeting_items FOR INSERT
  WITH CHECK (device_key = current_setting('request.headers', true)::json->>'x-device-key');

CREATE POLICY "Users can update their own meeting items"
  ON public.meeting_items FOR UPDATE
  USING (device_key = current_setting('request.headers', true)::json->>'x-device-key');

CREATE POLICY "Users can delete their own meeting items"
  ON public.meeting_items FOR DELETE
  USING (device_key = current_setting('request.headers', true)::json->>'x-device-key');

-- Index for fast lookups
CREATE INDEX idx_meeting_items_conversation ON public.meeting_items(conversation_id);
CREATE INDEX idx_meeting_items_type ON public.meeting_items(item_type);
-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Conversations table
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_key TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  duration_ms INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'local' CHECK (status IN ('local', 'uploading', 'transcribing', 'ready')),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Storage bucket for audio
INSERT INTO storage.buckets (id, name, public) 
VALUES ('conversation-audio', 'conversation-audio', false);

-- RLS policies for conversations table (device-scoped)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Device can read own conversations"
  ON public.conversations
  FOR SELECT
  USING (device_key = current_setting('request.headers')::json->>'x-device-key');

CREATE POLICY "Device can insert own conversations"
  ON public.conversations
  FOR INSERT
  WITH CHECK (device_key = current_setting('request.headers')::json->>'x-device-key');

CREATE POLICY "Device can update own conversations"
  ON public.conversations
  FOR UPDATE
  USING (device_key = current_setting('request.headers')::json->>'x-device-key');

CREATE POLICY "Device can delete own conversations"
  ON public.conversations
  FOR DELETE
  USING (device_key = current_setting('request.headers')::json->>'x-device-key');

-- RLS policies for conversation-audio bucket (device-scoped)
CREATE POLICY "Device can read own audio"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'conversation-audio' AND (storage.foldername(name))[1] = (current_setting('request.headers')::json->>'x-device-key'));

CREATE POLICY "Device can insert own audio"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'conversation-audio' AND (storage.foldername(name))[1] = (current_setting('request.headers')::json->>'x-device-key'));

CREATE POLICY "Device can delete own audio"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'conversation-audio' AND (storage.foldername(name))[1] = (current_setting('request.headers')::json->>'x-device-key'));

-- Transcript chunks table
CREATE TABLE public.transcript_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  start_ms INTEGER NOT NULL,
  end_ms INTEGER NOT NULL,
  speaker TEXT,
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_transcript_chunks_conversation ON public.transcript_chunks(conversation_id);

ALTER TABLE public.transcript_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Device can read transcript via conversation"
  ON public.transcript_chunks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = transcript_chunks.conversation_id
        AND c.device_key = current_setting('request.headers')::json->>'x-device-key'
    )
  );

-- Summaries table
CREATE TABLE public.summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL UNIQUE REFERENCES public.conversations(id) ON DELETE CASCADE,
  key_points TEXT[],
  decisions TEXT[],
  action_items TEXT[],
  open_questions TEXT[],
  notable_quotes JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Device can read summary via conversation"
  ON public.summaries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = summaries.conversation_id
        AND c.device_key = current_setting('request.headers')::json->>'x-device-key'
    )
  );

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
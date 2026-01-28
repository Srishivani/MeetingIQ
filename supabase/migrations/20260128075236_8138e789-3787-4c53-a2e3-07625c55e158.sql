-- Create update timestamp function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create meeting types table
CREATE TABLE public.meeting_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  icon TEXT NOT NULL DEFAULT 'Users',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default meeting types
INSERT INTO public.meeting_types (name, color, icon) VALUES
  ('Team Standup', '#3b82f6', 'Users'),
  ('Sprint Planning', '#8b5cf6', 'Layout'),
  ('One-on-One', '#10b981', 'UserCheck'),
  ('Design Review', '#f59e0b', 'Palette'),
  ('Retrospective', '#ec4899', 'MessageCircle'),
  ('Client Call', '#06b6d4', 'Phone'),
  ('Brainstorm', '#f97316', 'Lightbulb'),
  ('All Hands', '#6366f1', 'Building');

-- Create meetings table (scheduled meetings)
CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  meeting_type_id UUID REFERENCES public.meeting_types(id),
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  location TEXT,
  location_type TEXT NOT NULL DEFAULT 'in-person' CHECK (location_type IN ('in-person', 'virtual', 'hybrid')),
  agenda JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in-progress', 'completed', 'cancelled')),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create participants table
CREATE TABLE public.meeting_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  device_key TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'attendee' CHECK (role IN ('organizer', 'attendee', 'optional')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'tentative')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meeting_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;

-- Meeting types are public (read-only for all)
CREATE POLICY "Anyone can view meeting types"
  ON public.meeting_types FOR SELECT
  USING (true);

-- Meetings policies (device-scoped)
CREATE POLICY "Device can view own meetings"
  ON public.meetings FOR SELECT
  USING (device_key = (current_setting('request.headers', true)::json->>'x-device-key'));

CREATE POLICY "Device can create own meetings"
  ON public.meetings FOR INSERT
  WITH CHECK (device_key = (current_setting('request.headers', true)::json->>'x-device-key'));

CREATE POLICY "Device can update own meetings"
  ON public.meetings FOR UPDATE
  USING (device_key = (current_setting('request.headers', true)::json->>'x-device-key'));

CREATE POLICY "Device can delete own meetings"
  ON public.meetings FOR DELETE
  USING (device_key = (current_setting('request.headers', true)::json->>'x-device-key'));

-- Participants policies (via meeting ownership)
CREATE POLICY "Device can view participants of own meetings"
  ON public.meeting_participants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.meetings m 
    WHERE m.id = meeting_participants.meeting_id 
    AND m.device_key = (current_setting('request.headers', true)::json->>'x-device-key')
  ));

CREATE POLICY "Device can add participants to own meetings"
  ON public.meeting_participants FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.meetings m 
    WHERE m.id = meeting_participants.meeting_id 
    AND m.device_key = (current_setting('request.headers', true)::json->>'x-device-key')
  ));

CREATE POLICY "Device can update participants of own meetings"
  ON public.meeting_participants FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.meetings m 
    WHERE m.id = meeting_participants.meeting_id 
    AND m.device_key = (current_setting('request.headers', true)::json->>'x-device-key')
  ));

CREATE POLICY "Device can remove participants from own meetings"
  ON public.meeting_participants FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.meetings m 
    WHERE m.id = meeting_participants.meeting_id 
    AND m.device_key = (current_setting('request.headers', true)::json->>'x-device-key')
  ));

-- Indexes
CREATE INDEX idx_meetings_device_key ON public.meetings(device_key);
CREATE INDEX idx_meetings_scheduled_at ON public.meetings(scheduled_at);
CREATE INDEX idx_meetings_status ON public.meetings(status);
CREATE INDEX idx_participants_meeting ON public.meeting_participants(meeting_id);
CREATE INDEX idx_participants_email ON public.meeting_participants(email);

-- Update timestamp trigger
CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
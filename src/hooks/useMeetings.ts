import * as React from "react";
import { supabaseDevice } from "@/integrations/supabase/clientDevice";
import { getDeviceKey } from "@/lib/deviceKey";

export interface MeetingType {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface Participant {
  id: string;
  meetingId: string;
  name: string;
  email: string | null;
  role: "organizer" | "attendee" | "optional";
  status: "pending" | "accepted" | "declined" | "tentative";
}

export interface AgendaItem {
  id: string;
  title: string;
  duration?: number;
  completed?: boolean;
}

export interface Meeting {
  id: string;
  title: string;
  description: string | null;
  meetingTypeId: string | null;
  meetingType?: MeetingType;
  scheduledAt: Date;
  durationMinutes: number;
  location: string | null;
  locationType: "in-person" | "virtual" | "hybrid";
  agenda: AgendaItem[];
  status: "scheduled" | "in-progress" | "completed" | "cancelled";
  conversationId: string | null;
  participants?: Participant[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMeetingInput {
  title: string;
  description?: string;
  meetingTypeId?: string;
  scheduledAt: Date;
  durationMinutes: number;
  location?: string;
  locationType: "in-person" | "virtual" | "hybrid";
  agenda?: AgendaItem[];
  participants?: Array<{ name: string; email?: string; role?: "organizer" | "attendee" | "optional" }>;
}

export function useMeetings() {
  const [meetings, setMeetings] = React.useState<Meeting[]>([]);
  const [meetingTypes, setMeetingTypes] = React.useState<MeetingType[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch meeting types
  const fetchMeetingTypes = React.useCallback(async () => {
    const { data, error: fetchError } = await supabaseDevice
      .from("meeting_types")
      .select("*")
      .order("name");

    if (fetchError) {
      console.error("[useMeetings] Failed to fetch types:", fetchError);
      return;
    }

    setMeetingTypes(
      (data ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        icon: t.icon,
      }))
    );
  }, []);

  // Fetch meetings
  const fetchMeetings = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabaseDevice
        .from("meetings")
        .select(`
          *,
          meeting_types (id, name, color, icon),
          meeting_participants (id, name, email, role, status)
        `)
        .order("scheduled_at", { ascending: true });

      if (fetchError) throw fetchError;

      setMeetings(
        (data ?? []).map((m) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          meetingTypeId: m.meeting_type_id,
          meetingType: m.meeting_types ? {
            id: m.meeting_types.id,
            name: m.meeting_types.name,
            color: m.meeting_types.color,
            icon: m.meeting_types.icon,
          } : undefined,
          scheduledAt: new Date(m.scheduled_at),
          durationMinutes: m.duration_minutes,
          location: m.location,
          locationType: m.location_type as Meeting["locationType"],
          agenda: (Array.isArray(m.agenda) ? m.agenda : []) as unknown as AgendaItem[],
          status: m.status as Meeting["status"],
          conversationId: m.conversation_id,
          participants: (m.meeting_participants ?? []).map((p: any) => ({
            id: p.id,
            meetingId: m.id,
            name: p.name,
            email: p.email,
            role: p.role,
            status: p.status,
          })),
          createdAt: new Date(m.created_at),
          updatedAt: new Date(m.updated_at),
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load meetings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create meeting
  const createMeeting = React.useCallback(async (input: CreateMeetingInput): Promise<string | null> => {
    const deviceKey = getDeviceKey();

    try {
      const { data: meeting, error: insertError } = await supabaseDevice
        .from("meetings")
        .insert({
          device_key: deviceKey,
          title: input.title,
          description: input.description || null,
          meeting_type_id: input.meetingTypeId || null,
          scheduled_at: input.scheduledAt.toISOString(),
          duration_minutes: input.durationMinutes,
          location: input.location || null,
          location_type: input.locationType,
          agenda: JSON.parse(JSON.stringify(input.agenda || [])),
          status: "scheduled",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Add participants
      if (input.participants && input.participants.length > 0) {
        const participantsData = input.participants.map((p) => ({
          meeting_id: meeting.id,
          device_key: deviceKey,
          name: p.name,
          email: p.email || null,
          role: p.role || "attendee",
          status: "pending",
        }));

        const { error: participantsError } = await supabaseDevice
          .from("meeting_participants")
          .insert(participantsData);

        if (participantsError) {
          console.error("[useMeetings] Failed to add participants:", participantsError);
        }
      }

      await fetchMeetings();
      return meeting.id;
    } catch (err) {
      console.error("[useMeetings] Create failed:", err);
      return null;
    }
  }, [fetchMeetings]);

  // Update meeting
  const updateMeeting = React.useCallback(async (
    id: string, 
    updates: Partial<Omit<CreateMeetingInput, "participants">>
  ) => {
    try {
      const { error: updateError } = await supabaseDevice
        .from("meetings")
        .update({
          title: updates.title,
          description: updates.description,
          meeting_type_id: updates.meetingTypeId,
          scheduled_at: updates.scheduledAt?.toISOString(),
          duration_minutes: updates.durationMinutes,
          location: updates.location,
          location_type: updates.locationType,
          agenda: updates.agenda ? JSON.parse(JSON.stringify(updates.agenda)) : undefined,
        })
        .eq("id", id);

      if (updateError) throw updateError;
      await fetchMeetings();
    } catch (err) {
      console.error("[useMeetings] Update failed:", err);
    }
  }, [fetchMeetings]);

  // Delete meeting
  const deleteMeeting = React.useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await supabaseDevice
        .from("meetings")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;
      setMeetings((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error("[useMeetings] Delete failed:", err);
    }
  }, []);

  // Start meeting (change status and link to conversation)
  const startMeeting = React.useCallback(async (id: string, conversationId?: string) => {
    try {
      const { error: updateError } = await supabaseDevice
        .from("meetings")
        .update({
          status: "in-progress",
          conversation_id: conversationId || null,
        })
        .eq("id", id);

      if (updateError) throw updateError;
      await fetchMeetings();
    } catch (err) {
      console.error("[useMeetings] Start failed:", err);
    }
  }, [fetchMeetings]);

  // Complete meeting
  const completeMeeting = React.useCallback(async (id: string) => {
    try {
      const { error: updateError } = await supabaseDevice
        .from("meetings")
        .update({ status: "completed" })
        .eq("id", id);

      if (updateError) throw updateError;
      await fetchMeetings();
    } catch (err) {
      console.error("[useMeetings] Complete failed:", err);
    }
  }, [fetchMeetings]);

  // Add participant
  const addParticipant = React.useCallback(async (
    meetingId: string,
    participant: { name: string; email?: string; role?: "organizer" | "attendee" | "optional" }
  ) => {
    const deviceKey = getDeviceKey();

    try {
      const { error: insertError } = await supabaseDevice
        .from("meeting_participants")
        .insert({
          meeting_id: meetingId,
          device_key: deviceKey,
          name: participant.name,
          email: participant.email || null,
          role: participant.role || "attendee",
          status: "pending",
        });

      if (insertError) throw insertError;
      await fetchMeetings();
    } catch (err) {
      console.error("[useMeetings] Add participant failed:", err);
    }
  }, [fetchMeetings]);

  // Remove participant
  const removeParticipant = React.useCallback(async (participantId: string) => {
    try {
      const { error: deleteError } = await supabaseDevice
        .from("meeting_participants")
        .delete()
        .eq("id", participantId);

      if (deleteError) throw deleteError;
      await fetchMeetings();
    } catch (err) {
      console.error("[useMeetings] Remove participant failed:", err);
    }
  }, [fetchMeetings]);

  // Update participant (e.g., add/change email)
  const updateParticipant = React.useCallback(async (
    participantId: string,
    updates: { name?: string; email?: string | null; role?: "organizer" | "attendee" | "optional" }
  ) => {
    try {
      const { error: updateError } = await supabaseDevice
        .from("meeting_participants")
        .update({
          name: updates.name,
          email: updates.email,
          role: updates.role,
        })
        .eq("id", participantId);

      if (updateError) throw updateError;
      await fetchMeetings();
    } catch (err) {
      console.error("[useMeetings] Update participant failed:", err);
    }
  }, [fetchMeetings]);

  // Initial fetch
  React.useEffect(() => {
    void fetchMeetingTypes();
    void fetchMeetings();
  }, [fetchMeetingTypes, fetchMeetings]);

  // Computed: grouped by status
  const grouped = React.useMemo(() => ({
    upcoming: meetings.filter((m) => m.status === "scheduled" && m.scheduledAt >= new Date()),
    inProgress: meetings.filter((m) => m.status === "in-progress"),
    completed: meetings.filter((m) => m.status === "completed"),
    past: meetings.filter((m) => m.status === "scheduled" && m.scheduledAt < new Date()),
  }), [meetings]);

  return {
    meetings,
    meetingTypes,
    grouped,
    isLoading,
    error,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    startMeeting,
    completeMeeting,
    addParticipant,
    removeParticipant,
    updateParticipant,
    refetch: fetchMeetings,
  };
}

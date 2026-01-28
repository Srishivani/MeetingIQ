import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Calendar, Clock, MapPin, Users, Video, Building, UserPlus, Trash2 } from "lucide-react";
import type { Meeting, MeetingType, AgendaItem, Participant } from "@/hooks/useMeetings";

interface EditMeetingDialogProps {
  meeting: Meeting;
  meetingTypes: MeetingType[];
  onUpdateMeeting: (id: string, updates: Partial<{
    title: string;
    description?: string;
    meetingTypeId?: string;
    scheduledAt: Date;
    durationMinutes: number;
    location?: string;
    locationType: "in-person" | "virtual" | "hybrid";
    agenda?: AgendaItem[];
  }>) => Promise<void>;
  onAddParticipant: (meetingId: string, participant: { name: string; email?: string; role?: "organizer" | "attendee" | "optional" }) => Promise<void>;
  onRemoveParticipant: (participantId: string) => Promise<void>;
  onUpdateParticipant: (participantId: string, updates: { name?: string; email?: string | null; role?: "organizer" | "attendee" | "optional" }) => Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditMeetingDialog({
  meeting,
  meetingTypes,
  onUpdateMeeting,
  onAddParticipant,
  onRemoveParticipant,
  onUpdateParticipant,
  open,
  onOpenChange,
}: EditMeetingDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form state
  const [title, setTitle] = React.useState(meeting.title);
  const [description, setDescription] = React.useState(meeting.description || "");
  const [meetingTypeId, setMeetingTypeId] = React.useState(meeting.meetingTypeId || "");
  const [date, setDate] = React.useState(meeting.scheduledAt.toISOString().split("T")[0]);
  const [time, setTime] = React.useState(
    meeting.scheduledAt.toTimeString().slice(0, 5)
  );
  const [durationMinutes, setDurationMinutes] = React.useState(meeting.durationMinutes);
  const [location, setLocation] = React.useState(meeting.location || "");
  const [locationType, setLocationType] = React.useState(meeting.locationType);
  const [agenda, setAgenda] = React.useState<AgendaItem[]>(meeting.agenda || []);
  const [newAgendaItem, setNewAgendaItem] = React.useState("");
  
  // Participants state
  const [participants, setParticipants] = React.useState<Participant[]>(meeting.participants || []);
  const [newParticipantName, setNewParticipantName] = React.useState("");
  const [newParticipantEmail, setNewParticipantEmail] = React.useState("");

  // Reset form when meeting changes
  React.useEffect(() => {
    if (open) {
      setTitle(meeting.title);
      setDescription(meeting.description || "");
      setMeetingTypeId(meeting.meetingTypeId || "");
      setDate(meeting.scheduledAt.toISOString().split("T")[0]);
      setTime(meeting.scheduledAt.toTimeString().slice(0, 5));
      setDurationMinutes(meeting.durationMinutes);
      setLocation(meeting.location || "");
      setLocationType(meeting.locationType);
      setAgenda(meeting.agenda || []);
      setParticipants(meeting.participants || []);
      setNewAgendaItem("");
      setNewParticipantName("");
      setNewParticipantEmail("");
    }
  }, [open, meeting]);

  const handleAddAgendaItem = () => {
    if (!newAgendaItem.trim()) return;
    setAgenda((prev) => [...prev, { id: crypto.randomUUID(), title: newAgendaItem.trim() }]);
    setNewAgendaItem("");
  };

  const handleRemoveAgendaItem = (id: string) => {
    setAgenda((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddParticipant = async () => {
    if (!newParticipantName.trim()) return;
    await onAddParticipant(meeting.id, {
      name: newParticipantName.trim(),
      email: newParticipantEmail.trim() || undefined,
      role: "attendee",
    });
    setNewParticipantName("");
    setNewParticipantEmail("");
  };

  const handleRemoveParticipant = async (participantId: string) => {
    await onRemoveParticipant(participantId);
    setParticipants((prev) => prev.filter((p) => p.id !== participantId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date || !time) return;

    setIsSubmitting(true);
    try {
      const scheduledAt = new Date(`${date}T${time}`);

      await onUpdateMeeting(meeting.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        meetingTypeId: meetingTypeId || undefined,
        scheduledAt,
        durationMinutes,
        location: location.trim() || undefined,
        locationType,
        agenda,
      });

      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const locationIcons = {
    "in-person": Building,
    "virtual": Video,
    "hybrid": Users,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Meeting</DialogTitle>
            <DialogDescription>
              Update meeting details, participants, and agenda.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="edit-title">Meeting Title *</Label>
              <Input
                id="edit-title"
                placeholder="Weekly Team Standup"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Meeting Type */}
            <div className="space-y-2">
              <Label>Meeting Type</Label>
              <Select value={meetingTypeId} onValueChange={setMeetingTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {meetingTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: type.color }}
                        />
                        {type.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-date" className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Date *
                </Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-time" className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Time *
                </Label>
                <Input
                  id="edit-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select value={String(durationMinutes)} onValueChange={(v) => setDurationMinutes(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Location Type & Location */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                Location
              </Label>
              <div className="flex gap-2">
                {(["in-person", "virtual", "hybrid"] as const).map((type) => {
                  const Icon = locationIcons[type];
                  return (
                    <Button
                      key={type}
                      type="button"
                      variant={locationType === type ? "default" : "outline"}
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => setLocationType(type)}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {type === "in-person" ? "In-Person" : type === "virtual" ? "Virtual" : "Hybrid"}
                    </Button>
                  );
                })}
              </div>
              <Input
                placeholder={locationType === "virtual" ? "Meeting link..." : "Room / Address..."}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Meeting objectives and notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            {/* Agenda */}
            <div className="space-y-2">
              <Label>Agenda</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add agenda item..."
                  value={newAgendaItem}
                  onChange={(e) => setNewAgendaItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddAgendaItem();
                    }
                  }}
                />
                <Button type="button" variant="outline" size="icon" onClick={handleAddAgendaItem}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {agenda.length > 0 && (
                <ul className="space-y-1">
                  {agenda.map((item, i) => (
                    <li key={item.id} className="flex items-center gap-2 rounded border bg-muted/50 px-2 py-1 text-sm">
                      <span className="text-muted-foreground">{i + 1}.</span>
                      <span className="flex-1">{item.title}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => handleRemoveAgendaItem(item.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Participants */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <UserPlus className="h-3.5 w-3.5" />
                Participants
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Name"
                  value={newParticipantName}
                  onChange={(e) => setNewParticipantName(e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Email (optional)"
                  type="email"
                  value={newParticipantEmail}
                  onChange={(e) => setNewParticipantEmail(e.target.value)}
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="icon" onClick={handleAddParticipant}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {participants.length > 0 && (
                <ul className="space-y-1">
                  {participants.map((p) => (
                    <li key={p.id} className="flex items-center gap-2 rounded border bg-muted/50 px-2 py-1.5 text-sm">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{p.name}</div>
                        {p.email && (
                          <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {p.role}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => handleRemoveParticipant(p.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

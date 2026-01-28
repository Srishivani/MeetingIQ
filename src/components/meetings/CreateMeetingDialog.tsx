import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Calendar, Clock, MapPin, Users, Video, Building, UserPlus, Mail, CheckCircle2 } from "lucide-react";
import type { MeetingType, CreateMeetingInput, AgendaItem } from "@/hooks/useMeetings";
import { buildMailtoLink, openMailtoLink } from "@/lib/meetingInvite";
import { AddToCalendarButtons } from "@/components/meetings/AddToCalendarButtons";
import { buildCalendarEvent } from "@/lib/calendarIntegration";

interface InitialMeetingValues {
  title?: string;
  description?: string;
  agenda?: string[];
  participants?: Array<{ name: string; email?: string }>;
}

interface CreateMeetingDialogProps {
  meetingTypes: MeetingType[];
  onCreateMeeting: (input: CreateMeetingInput) => Promise<string | null>;
  trigger?: React.ReactNode;
  initialValues?: InitialMeetingValues;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateMeetingDialog({ 
  meetingTypes, 
  onCreateMeeting, 
  trigger,
  initialValues,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: CreateMeetingDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  
  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange ?? (() => {})) : setInternalOpen;
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [createdMeeting, setCreatedMeeting] = React.useState<{
    title: string;
    description?: string;
    scheduledAt: Date;
    durationMinutes: number;
    location?: string;
    locationType: "in-person" | "virtual" | "hybrid";
    agenda: AgendaItem[];
    participants: Array<{ name: string; email: string }>;
  } | null>(null);

  // Form state
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [meetingTypeId, setMeetingTypeId] = React.useState<string>("");
  const [date, setDate] = React.useState("");
  const [time, setTime] = React.useState("");
  const [durationMinutes, setDurationMinutes] = React.useState(30);
  const [location, setLocation] = React.useState("");
  const [locationType, setLocationType] = React.useState<"in-person" | "virtual" | "hybrid">("in-person");
  const [agenda, setAgenda] = React.useState<AgendaItem[]>([]);
  const [newAgendaItem, setNewAgendaItem] = React.useState("");
  const [participants, setParticipants] = React.useState<Array<{ name: string; email: string }>>([]);
  const [newParticipantName, setNewParticipantName] = React.useState("");
  const [newParticipantEmail, setNewParticipantEmail] = React.useState("");

  const resetForm = React.useCallback(() => {
    setTitle(initialValues?.title ?? "");
    setDescription(initialValues?.description ?? "");
    setMeetingTypeId("");
    setDate("");
    setTime("");
    setDurationMinutes(30);
    setLocation("");
    setLocationType("in-person");
    setAgenda(
      initialValues?.agenda?.map((item) => ({ id: crypto.randomUUID(), title: item })) ?? []
    );
    setNewAgendaItem("");
    setParticipants(
      initialValues?.participants?.map((p) => ({ name: p.name, email: p.email ?? "" })) ?? []
    );
    setNewParticipantName("");
    setNewParticipantEmail("");
    setCreatedMeeting(null);
  }, [initialValues]);

  // Apply initial values when dialog opens or initialValues change
  React.useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, resetForm]);

  const handleClose = () => {
    resetForm();
    setOpen(false);
  };

  const handleAddAgendaItem = () => {
    if (!newAgendaItem.trim()) return;
    setAgenda((prev) => [...prev, { id: crypto.randomUUID(), title: newAgendaItem.trim() }]);
    setNewAgendaItem("");
  };

  const handleRemoveAgendaItem = (id: string) => {
    setAgenda((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddParticipant = () => {
    if (!newParticipantName.trim()) return;
    setParticipants((prev) => [...prev, { name: newParticipantName.trim(), email: newParticipantEmail.trim() }]);
    setNewParticipantName("");
    setNewParticipantEmail("");
  };

  const handleRemoveParticipant = (index: number) => {
    setParticipants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date || !time) return;

    setIsSubmitting(true);
    try {
      const scheduledAt = new Date(`${date}T${time}`);
      
      const result = await onCreateMeeting({
        title: title.trim(),
        description: description.trim() || undefined,
        meetingTypeId: meetingTypeId || undefined,
        scheduledAt,
        durationMinutes,
        location: location.trim() || undefined,
        locationType,
        agenda,
        participants: participants.map((p) => ({ name: p.name, email: p.email || undefined })),
      });

      if (result) {
        // Store meeting data for invite flow
        const participantsWithEmail = participants.filter((p) => p.email);
        if (participantsWithEmail.length > 0) {
          setCreatedMeeting({
            title: title.trim(),
            description: description.trim() || undefined,
            scheduledAt,
            durationMinutes,
            location: location.trim() || undefined,
            locationType,
            agenda,
            participants,
          });
        } else {
          resetForm();
          setOpen(false);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendInvite = (email: string, name: string) => {
    if (!createdMeeting) return;
    openMailtoLink(buildMailtoLink({
      ...createdMeeting,
      recipientEmail: email,
      recipientName: name,
    }));
  };

  const handleSendAllInvites = () => {
    if (!createdMeeting) return;
    const emails = createdMeeting.participants
      .filter((p) => p.email)
      .map((p) => p.email)
      .join(",");
    openMailtoLink(buildMailtoLink({
      ...createdMeeting,
      recipientEmail: emails,
    }));
  };

  const locationIcons = {
    "in-person": Building,
    "virtual": Video,
    "hybrid": Users,
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else setOpen(true);
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Schedule Meeting
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {createdMeeting ? (
          // Success state - Send Invites
          <div className="py-4">
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-primary/10 p-3">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">Meeting Scheduled!</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                "{createdMeeting.title}" has been created successfully.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5 text-sm font-medium">
                  <Mail className="h-4 w-4" />
                  Send Invitations
                </Label>
                {createdMeeting.participants.filter((p) => p.email).length > 1 && (
                  <Button size="sm" variant="outline" onClick={handleSendAllInvites}>
                    Send to All
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                {createdMeeting.participants.filter((p) => p.email).map((p, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border bg-muted/50 px-3 py-2">
                    <div>
                      <div className="text-sm font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.email}</div>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => handleSendInvite(p.email, p.name)}>
                      <Mail className="mr-1.5 h-3.5 w-3.5" />
                      Send
                    </Button>
                  </div>
                ))}
              </div>

              {createdMeeting.participants.filter((p) => !p.email).length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {createdMeeting.participants.filter((p) => !p.email).length} participant(s) have no email address.
                </p>
              )}
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5 text-sm font-medium">
                  <Calendar className="h-4 w-4" />
                  Add to Your Calendar
                </Label>
              </div>
              <AddToCalendarButtons
                event={buildCalendarEvent({
                  title: createdMeeting.title,
                  description: createdMeeting.description,
                  location: createdMeeting.location,
                  scheduledAt: createdMeeting.scheduledAt,
                  durationMinutes: createdMeeting.durationMinutes,
                  agenda: createdMeeting.agenda,
                })}
                variant="secondary"
                className="w-full justify-center"
              />
            </div>

            <DialogFooter className="mt-6">
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          // Form state
          <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Schedule a Meeting</DialogTitle>
            <DialogDescription>
              Create a new meeting with participants, agenda, and location details.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Meeting Title *</Label>
              <Input
                id="title"
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
                <Label htmlFor="date" className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Date *
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time" className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Time *
                </Label>
                <Input
                  id="time"
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
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
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
                <div className="flex flex-wrap gap-2">
                  {participants.map((p, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 pr-1">
                      {p.name}
                      {p.email && <span className="text-xs text-muted-foreground">({p.email})</span>}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 hover:bg-destructive/20"
                        onClick={() => handleRemoveParticipant(i)}
                      >
                        <X className="h-2.5 w-2.5" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !title.trim() || !date || !time}>
              {isSubmitting ? "Creating..." : "Schedule Meeting"}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Users, Mail, User, Pencil, Check, X, ChevronDown, Send } from "lucide-react";
import { toast } from "sonner";
import type { Participant } from "@/hooks/useMeetings";

interface ParticipantsPanelProps {
  participants: Participant[];
  speakerStats?: Record<string, { segments: number; durationMs: number }>;
  onUpdateParticipant?: (participantId: string, updates: { email?: string | null }) => Promise<void>;
  meetingTitle?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const ROLE_COLORS: Record<string, string> = {
  organizer: "bg-primary/10 text-primary",
  attendee: "bg-muted text-muted-foreground",
  optional: "bg-muted/50 text-muted-foreground",
};

const STATUS_STYLES: Record<string, string> = {
  accepted: "border-green-500 bg-green-500/10",
  pending: "border-amber-500 bg-amber-500/10",
  declined: "border-destructive bg-destructive/10",
  tentative: "border-muted-foreground bg-muted",
};

export function ParticipantsPanel({ participants, speakerStats, onUpdateParticipant, meetingTitle }: ParticipantsPanelProps) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editEmail, setEditEmail] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

  const participantsWithEmail = React.useMemo(
    () => participants.filter((p) => p.email),
    [participants]
  );

  const toggleParticipant = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(participantsWithEmail.map((p) => p.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleSendEmail = () => {
    const selectedParticipants = participantsWithEmail.filter((p) => selectedIds.has(p.id));
    if (selectedParticipants.length === 0) {
      toast.error("No participants selected");
      return;
    }

    const emails = selectedParticipants.map((p) => p.email).join(",");
    const subject = encodeURIComponent(meetingTitle ? `Follow-up: ${meetingTitle}` : "Meeting Follow-up");
    const body = encodeURIComponent(`Hi ${selectedParticipants.map((p) => p.name.split(" ")[0]).join(", ")},\n\nFollowing up on our meeting.\n\nBest regards`);
    
    window.open(`mailto:${emails}?subject=${subject}&body=${body}`, "_blank");
    setIsDropdownOpen(false);
    toast.success(`Opening email to ${selectedParticipants.length} recipient(s)`);
  };

  const handleEditClick = (participant: Participant) => {
    setEditingId(participant.id);
    setEditEmail(participant.email || "");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditEmail("");
  };

  const handleSaveEmail = async (participantId: string) => {
    if (!onUpdateParticipant) return;
    
    setIsSaving(true);
    try {
      await onUpdateParticipant(participantId, { 
        email: editEmail.trim() || null 
      });
      toast.success("Email updated");
      setEditingId(null);
      setEditEmail("");
    } catch (err) {
      toast.error("Failed to update email");
    } finally {
      setIsSaving(false);
    }
  };

  if (participants.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Participants
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <User className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">No participants added</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const participantsWithoutEmail = participants.filter((p) => !p.email);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Participants
          </CardTitle>
          
          {participantsWithEmail.length > 0 && (
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Mail className="h-4 w-4" />
                  Email
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 bg-popover">
                <div className="p-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Select recipients</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={selectAll}
                      >
                        All
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={clearSelection}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {participantsWithEmail.map((p) => (
                      <label
                        key={p.id}
                        className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedIds.has(p.id)}
                          onCheckedChange={() => toggleParticipant(p.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{p.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                
                <DropdownMenuSeparator />
                
                <div className="p-2">
                  <Button
                    size="sm"
                    className="w-full gap-1.5"
                    onClick={handleSendEmail}
                    disabled={selectedIds.size === 0}
                  >
                    <Send className="h-3.5 w-3.5" />
                    Send to {selectedIds.size} recipient{selectedIds.size !== 1 ? "s" : ""}
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <CardDescription>
          {participants.length} participant{participants.length > 1 ? "s" : ""} • 
          {participantsWithEmail.length} with email
          {participantsWithoutEmail.length > 0 && (
            <span className="text-amber-600 ml-1">
              ({participantsWithoutEmail.length} missing)
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {participants.map((participant) => {
            const stats = speakerStats?.[participant.name];
            const isEditing = editingId === participant.id;
            
            return (
              <div
                key={participant.id}
                className={`flex items-center gap-3 rounded-lg border p-3 ${STATUS_STYLES[participant.status] || ""}`}
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="text-sm font-medium">
                    {getInitials(participant.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{participant.name}</span>
                    <Badge variant="outline" className={`text-xs ${ROLE_COLORS[participant.role]}`}>
                      {participant.role}
                    </Badge>
                  </div>
                  
                  {isEditing ? (
                    <div className="flex items-center gap-2 mt-1.5">
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="h-7 text-xs"
                        disabled={isSaving}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            void handleSaveEmail(participant.id);
                          } else if (e.key === "Escape") {
                            handleCancelEdit();
                          }
                        }}
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleSaveEmail(participant.id)}
                        disabled={isSaving}
                      >
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : participant.email ? (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 group">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{participant.email}</span>
                      {onUpdateParticipant && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleEditClick(participant)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ) : onUpdateParticipant ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-amber-600 hover:text-amber-700 mt-0.5 -ml-2"
                      onClick={() => handleEditClick(participant)}
                    >
                      <Mail className="h-3 w-3 mr-1" />
                      Add email
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground/50 mt-0.5">
                      <Mail className="h-3 w-3" />
                      <span>No email</span>
                    </div>
                  )}

                  {stats && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {stats.segments} speaking segments
                    </div>
                  )}
                </div>

                <Badge 
                  variant="outline" 
                  className={`capitalize text-xs shrink-0 ${
                    participant.status === "accepted" ? "text-green-600 border-green-500" :
                    participant.status === "declined" ? "text-destructive border-destructive" :
                    "text-muted-foreground"
                  }`}
                >
                  {participant.status}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Mail, User } from "lucide-react";
import type { Participant } from "@/hooks/useMeetings";

interface ParticipantsPanelProps {
  participants: Participant[];
  speakerStats?: Record<string, { segments: number; durationMs: number }>;
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

export function ParticipantsPanel({ participants, speakerStats }: ParticipantsPanelProps) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Participants
        </CardTitle>
        <CardDescription>
          {participants.length} participant{participants.length > 1 ? "s" : ""} in this meeting
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {participants.map((participant) => {
            const stats = speakerStats?.[participant.name];
            
            return (
              <div
                key={participant.id}
                className={`flex items-center gap-3 rounded-lg border p-3 ${STATUS_STYLES[participant.status] || ""}`}
              >
                <Avatar className="h-10 w-10">
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
                  
                  {participant.email && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{participant.email}</span>
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
                  className={`capitalize text-xs ${
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

import * as React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, Clock, MapPin, Users, Video, Building, 
  Play, MoreHorizontal, Trash2, ExternalLink, CheckCircle2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Meeting } from "@/hooks/useMeetings";

interface MeetingCardProps {
  meeting: Meeting;
  onStart?: (id: string) => void;
  onDelete?: (id: string) => void;
  onComplete?: (id: string) => void;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function formatDate(date: Date) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return "Tomorrow";
  }
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

const locationIcons = {
  "in-person": Building,
  "virtual": Video,
  "hybrid": Users,
};

const statusStyles: Record<string, string> = {
  "scheduled": "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  "in-progress": "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 animate-pulse",
  "completed": "bg-muted text-muted-foreground border-muted",
  "cancelled": "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};

export function MeetingCard({ meeting, onStart, onDelete, onComplete }: MeetingCardProps) {
  const LocationIcon = locationIcons[meeting.locationType];
  const isUpcoming = meeting.status === "scheduled" && meeting.scheduledAt >= new Date();
  const isPast = meeting.status === "scheduled" && meeting.scheduledAt < new Date();

  return (
    <Card className={`overflow-hidden transition-all hover:shadow-md ${isPast ? "opacity-60" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Left: Meeting Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {meeting.meetingType && (
                <div 
                  className="h-3 w-3 rounded-full shrink-0" 
                  style={{ backgroundColor: meeting.meetingType.color }} 
                />
              )}
              <h3 className="truncate font-semibold text-foreground">{meeting.title}</h3>
            </div>

            {/* Date/Time */}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(meeting.scheduledAt)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatTime(meeting.scheduledAt)} ({meeting.durationMinutes}m)
              </span>
            </div>

            {/* Location */}
            {meeting.location && (
              <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <LocationIcon className="h-3.5 w-3.5" />
                <span className="truncate">{meeting.location}</span>
              </div>
            )}

            {/* Participants */}
            {meeting.participants && meeting.participants.length > 0 && (
              <div className="mt-2 flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="flex flex-wrap gap-1">
                  {meeting.participants.slice(0, 3).map((p) => (
                    <Badge key={p.id} variant="secondary" className="text-xs">
                      {p.name}
                    </Badge>
                  ))}
                  {meeting.participants.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{meeting.participants.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Type badge */}
            {meeting.meetingType && (
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">
                  {meeting.meetingType.name}
                </Badge>
              </div>
            )}
          </div>

          {/* Right: Status & Actions */}
          <div className="flex flex-col items-end gap-2">
            <Badge variant="outline" className={statusStyles[meeting.status]}>
              {meeting.status === "in-progress" ? "Live" : 
               meeting.status === "scheduled" ? (isPast ? "Missed" : "Upcoming") :
               meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
            </Badge>

            <div className="flex items-center gap-1">
              {/* Start Recording */}
              {isUpcoming && onStart && (
                <Button size="sm" className="gap-1" onClick={() => onStart(meeting.id)}>
                  <Play className="h-3.5 w-3.5" />
                  Start
                </Button>
              )}

              {/* In Progress Actions */}
              {meeting.status === "in-progress" && (
                <>
                  {meeting.conversationId ? (
                    <Button asChild size="sm" variant="default">
                      <Link to={`/c/${meeting.conversationId}`}>
                        <ExternalLink className="mr-1 h-3.5 w-3.5" />
                        View
                      </Link>
                    </Button>
                  ) : onStart && (
                    <Button size="sm" className="gap-1" onClick={() => onStart(meeting.id)}>
                      <Play className="h-3.5 w-3.5" />
                      Record
                    </Button>
                  )}
                  {onComplete && (
                    <Button size="sm" variant="outline" onClick={() => onComplete(meeting.id)}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </>
              )}

              {/* Completed: View Notes */}
              {meeting.status === "completed" && meeting.conversationId && (
                <Button asChild size="sm" variant="secondary">
                  <Link to={`/c/${meeting.conversationId}`}>
                    View Notes
                  </Link>
                </Button>
              )}

              {/* Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {meeting.conversationId && (
                    <DropdownMenuItem asChild>
                      <Link to={`/c/${meeting.conversationId}`}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Recording
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem 
                      className="text-destructive focus:text-destructive"
                      onClick={() => onDelete(meeting.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Agenda Preview */}
        {meeting.agenda && meeting.agenda.length > 0 && (
          <div className="mt-3 border-t pt-3">
            <div className="text-xs font-medium text-muted-foreground mb-1">Agenda</div>
            <ul className="space-y-0.5 text-sm">
              {meeting.agenda.slice(0, 3).map((item, i) => (
                <li key={item.id} className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-xs">{i + 1}.</span>
                  <span className="truncate">{item.title}</span>
                </li>
              ))}
              {meeting.agenda.length > 3 && (
                <li className="text-xs text-muted-foreground">
                  +{meeting.agenda.length - 3} more items
                </li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

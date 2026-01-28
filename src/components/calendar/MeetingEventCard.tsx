import * as React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Clock, MapPin, Users, Video, Building } from "lucide-react";
import { format } from "date-fns";
import type { Meeting } from "@/hooks/useMeetings";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";

interface MeetingEventCardProps {
  meeting: Meeting;
  compact?: boolean;
  showTime?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const locationIcons = {
  "in-person": Building,
  "virtual": Video,
  "hybrid": Users,
};

const statusStyles: Record<string, string> = {
  "scheduled": "border-l-primary bg-primary/10",
  "in-progress": "border-l-green-500 bg-green-500/10 animate-pulse",
  "completed": "border-l-muted-foreground bg-muted",
  "cancelled": "border-l-destructive bg-destructive/10",
};

export function MeetingEventCard({ 
  meeting, 
  compact = false, 
  showTime = true,
  className,
  style,
}: MeetingEventCardProps) {
  const LocationIcon = locationIcons[meeting.locationType];
  const typeColor = meeting.meetingType?.color || "hsl(var(--primary))";

  const content = (
    <div
      className={cn(
        "rounded-md border-l-4 px-2 py-1.5 text-xs cursor-pointer transition-all hover:shadow-md overflow-hidden",
        statusStyles[meeting.status] || statusStyles.scheduled,
        className
      )}
      style={{ 
        borderLeftColor: typeColor,
        ...style 
      }}
    >
      <div className="font-medium truncate">{meeting.title}</div>
      {showTime && !compact && (
        <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
          <Clock className="h-3 w-3 shrink-0" />
          <span>{format(meeting.scheduledAt, "h:mm a")}</span>
          <span className="text-muted-foreground/60">({meeting.durationMinutes}m)</span>
        </div>
      )}
      {compact && (
        <div className="text-muted-foreground mt-0.5">
          {format(meeting.scheduledAt, "h:mm a")}
        </div>
      )}
    </div>
  );

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <Link 
          to={meeting.conversationId ? `/c/${meeting.conversationId}` : "#"}
          className="block"
        >
          {content}
        </Link>
      </HoverCardTrigger>
      <HoverCardContent className="w-72" align="start">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="font-semibold">{meeting.title}</div>
            {meeting.meetingType && (
              <Badge 
                variant="outline" 
                className="text-xs shrink-0"
                style={{ borderColor: meeting.meetingType.color, color: meeting.meetingType.color }}
              >
                {meeting.meetingType.name}
              </Badge>
            )}
          </div>
          
          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              <span>
                {format(meeting.scheduledAt, "EEE, MMM d 'at' h:mm a")} ({meeting.durationMinutes}m)
              </span>
            </div>
            
            {meeting.location && (
              <div className="flex items-center gap-2">
                <LocationIcon className="h-3.5 w-3.5" />
                <span className="truncate">{meeting.location}</span>
              </div>
            )}
            
            {meeting.participants && meeting.participants.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5" />
                <span>{meeting.participants.length} participant(s)</span>
              </div>
            )}
          </div>

          {meeting.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 pt-1 border-t">
              {meeting.description}
            </p>
          )}

          {meeting.status === "in-progress" && (
            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
              Live Now
            </Badge>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

import * as React from "react";
import { cn } from "@/lib/utils";
import { format, isSameDay, getHours, getMinutes, startOfDay, addMinutes } from "date-fns";
import type { Meeting } from "@/hooks/useMeetings";
import { MeetingEventCard } from "./MeetingEventCard";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DayViewProps {
  date: Date;
  meetings: Meeting[];
}

const HOUR_HEIGHT = 60; // pixels per hour
const START_HOUR = 6; // 6 AM
const END_HOUR = 22; // 10 PM

export function DayView({ date, meetings }: DayViewProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  
  // Filter meetings for this day
  const dayMeetings = meetings.filter((m) => isSameDay(m.scheduledAt, date));

  // Scroll to current time on mount
  React.useEffect(() => {
    const now = new Date();
    if (isSameDay(now, date) && scrollRef.current) {
      const currentHour = getHours(now);
      const scrollPosition = (currentHour - START_HOUR) * HOUR_HEIGHT - 100;
      scrollRef.current.scrollTop = Math.max(0, scrollPosition);
    }
  }, [date]);

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  // Calculate position and height for a meeting
  const getMeetingStyle = (meeting: Meeting) => {
    const startHour = getHours(meeting.scheduledAt);
    const startMinute = getMinutes(meeting.scheduledAt);
    const top = ((startHour - START_HOUR) * 60 + startMinute) * (HOUR_HEIGHT / 60);
    const height = meeting.durationMinutes * (HOUR_HEIGHT / 60);
    return { top, height: Math.max(height, 24) }; // minimum height of 24px
  };

  // Current time indicator
  const now = new Date();
  const isToday = isSameDay(now, date);
  const currentTimeTop = isToday 
    ? ((getHours(now) - START_HOUR) * 60 + getMinutes(now)) * (HOUR_HEIGHT / 60)
    : null;

  return (
    <div className="h-full flex flex-col border rounded-lg bg-card overflow-hidden">
      {/* Day header */}
      <div className="border-b px-4 py-3 bg-muted/30">
        <div className={cn(
          "text-center",
          isToday && "text-primary"
        )}>
          <div className="text-sm text-muted-foreground">{format(date, "EEEE")}</div>
          <div className={cn(
            "text-2xl font-bold",
            isToday && "bg-primary text-primary-foreground rounded-full w-10 h-10 flex items-center justify-center mx-auto"
          )}>
            {format(date, "d")}
          </div>
        </div>
      </div>

      {/* Time grid */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="relative" style={{ height: `${(END_HOUR - START_HOUR) * HOUR_HEIGHT}px` }}>
          {/* Hour lines */}
          {hours.map((hour) => (
            <div
              key={hour}
              className="absolute w-full border-t border-border/50"
              style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT}px` }}
            >
              <span className="absolute -top-3 left-2 text-xs text-muted-foreground bg-card px-1">
                {format(new Date().setHours(hour, 0), "h a")}
              </span>
            </div>
          ))}

          {/* Current time indicator */}
          {currentTimeTop !== null && currentTimeTop >= 0 && (
            <div
              className="absolute left-0 right-0 z-20 pointer-events-none"
              style={{ top: `${currentTimeTop}px` }}
            >
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-destructive" />
                <div className="flex-1 h-0.5 bg-destructive" />
              </div>
            </div>
          )}

          {/* Meetings */}
          <div className="absolute left-16 right-4">
            {dayMeetings.map((meeting) => {
              const { top, height } = getMeetingStyle(meeting);
              return (
                <MeetingEventCard
                  key={meeting.id}
                  meeting={meeting}
                  compact={height < 40}
                  showTime={height >= 40}
                  className="absolute left-0 right-0"
                  style={{ top: `${top}px`, height: `${height}px` }}
                />
              );
            })}
          </div>
        </div>
      </ScrollArea>

      {/* Empty state */}
      {dayMeetings.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-muted-foreground text-sm">No meetings scheduled</p>
        </div>
      )}
    </div>
  );
}

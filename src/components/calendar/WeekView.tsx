import * as React from "react";
import { cn } from "@/lib/utils";
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  getHours, 
  getMinutes,
  isToday as checkIsToday,
} from "date-fns";
import type { Meeting } from "@/hooks/useMeetings";
import { MeetingEventCard } from "./MeetingEventCard";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WeekViewProps {
  date: Date;
  meetings: Meeting[];
}

const HOUR_HEIGHT = 48; // pixels per hour
const START_HOUR = 6;
const END_HOUR = 22;

export function WeekView({ date, meetings }: WeekViewProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Scroll to current time on mount
  React.useEffect(() => {
    const now = new Date();
    if (scrollRef.current) {
      const currentHour = getHours(now);
      const scrollPosition = (currentHour - START_HOUR) * HOUR_HEIGHT - 100;
      scrollRef.current.scrollTop = Math.max(0, scrollPosition);
    }
  }, []);

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  // Group meetings by day
  const meetingsByDay = React.useMemo(() => {
    const grouped: Record<string, Meeting[]> = {};
    days.forEach((day) => {
      const key = format(day, "yyyy-MM-dd");
      grouped[key] = meetings.filter((m) => isSameDay(m.scheduledAt, day));
    });
    return grouped;
  }, [meetings, days]);

  // Calculate position and height for a meeting
  const getMeetingStyle = (meeting: Meeting) => {
    const startHour = getHours(meeting.scheduledAt);
    const startMinute = getMinutes(meeting.scheduledAt);
    const top = ((startHour - START_HOUR) * 60 + startMinute) * (HOUR_HEIGHT / 60);
    const height = meeting.durationMinutes * (HOUR_HEIGHT / 60);
    return { top, height: Math.max(height, 20) };
  };

  // Current time indicator
  const now = new Date();
  const currentTimeTop = ((getHours(now) - START_HOUR) * 60 + getMinutes(now)) * (HOUR_HEIGHT / 60);

  return (
    <div className="h-full flex flex-col border rounded-lg bg-card overflow-hidden">
      {/* Header with day names */}
      <div className="flex border-b bg-muted/30 shrink-0">
        <div className="w-16 shrink-0" /> {/* Time column spacer */}
        {days.map((day) => {
          const isToday = checkIsToday(day);
          return (
            <div 
              key={day.toISOString()} 
              className={cn(
                "flex-1 text-center py-2 border-l first:border-l-0",
                isToday && "bg-primary/5"
              )}
            >
              <div className="text-xs text-muted-foreground">{format(day, "EEE")}</div>
              <div className={cn(
                "text-lg font-semibold",
                isToday && "bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto"
              )}>
                {format(day, "d")}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="flex" style={{ height: `${(END_HOUR - START_HOUR) * HOUR_HEIGHT}px` }}>
          {/* Time column */}
          <div className="w-16 shrink-0 relative">
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute w-full text-right pr-2"
                style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT}px` }}
              >
                <span className="text-xs text-muted-foreground -translate-y-2 inline-block">
                  {format(new Date().setHours(hour, 0), "h a")}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const dayMeetings = meetingsByDay[dayKey] || [];
            const isToday = checkIsToday(day);

            return (
              <div 
                key={dayKey} 
                className={cn(
                  "flex-1 relative border-l",
                  isToday && "bg-primary/5"
                )}
              >
                {/* Hour lines */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="absolute w-full border-t border-border/50"
                    style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT}px` }}
                  />
                ))}

                {/* Current time indicator */}
                {isToday && currentTimeTop >= 0 && (
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
                <div className="absolute inset-x-1">
                  {dayMeetings.map((meeting) => {
                    const { top, height } = getMeetingStyle(meeting);
                    return (
                      <MeetingEventCard
                        key={meeting.id}
                        meeting={meeting}
                        compact
                        showTime={false}
                        className="absolute left-0 right-0"
                        style={{ top: `${top}px`, height: `${height}px` }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

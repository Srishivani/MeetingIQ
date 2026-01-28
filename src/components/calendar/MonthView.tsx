import * as React from "react";
import { cn } from "@/lib/utils";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  isSameMonth,
  isToday as checkIsToday,
} from "date-fns";
import type { Meeting } from "@/hooks/useMeetings";
import { MeetingEventCard } from "./MeetingEventCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface MonthViewProps {
  date: Date;
  meetings: Meeting[];
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthView({ date, meetings }: MonthViewProps) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Group meetings by day
  const meetingsByDay = React.useMemo(() => {
    const grouped: Record<string, Meeting[]> = {};
    days.forEach((day) => {
      const key = format(day, "yyyy-MM-dd");
      grouped[key] = meetings.filter((m) => isSameDay(m.scheduledAt, day));
    });
    return grouped;
  }, [meetings, days]);

  // Split days into weeks
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className="h-full flex flex-col border rounded-lg bg-card overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b bg-muted/30 shrink-0">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center py-2 text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 grid grid-rows-[repeat(auto-fill,minmax(0,1fr))]" style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-b last:border-b-0">
            {week.map((day) => {
              const dayKey = format(day, "yyyy-MM-dd");
              const dayMeetings = meetingsByDay[dayKey] || [];
              const isCurrentMonth = isSameMonth(day, date);
              const isToday = checkIsToday(day);
              const visibleMeetings = dayMeetings.slice(0, 3);
              const hiddenCount = dayMeetings.length - visibleMeetings.length;

              return (
                <div
                  key={dayKey}
                  className={cn(
                    "border-r last:border-r-0 p-1 min-h-[100px] flex flex-col",
                    !isCurrentMonth && "bg-muted/30",
                    isToday && "bg-primary/5"
                  )}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={cn(
                        "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                        !isCurrentMonth && "text-muted-foreground",
                        isToday && "bg-primary text-primary-foreground"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    {dayMeetings.length > 0 && (
                      <Badge variant="secondary" className="text-xs h-5 px-1.5">
                        {dayMeetings.length}
                      </Badge>
                    )}
                  </div>

                  {/* Meetings */}
                  <ScrollArea className="flex-1">
                    <div className="space-y-0.5">
                      {visibleMeetings.map((meeting) => (
                        <MeetingEventCard
                          key={meeting.id}
                          meeting={meeting}
                          compact
                          showTime={false}
                        />
                      ))}
                      {hiddenCount > 0 && (
                        <div className="text-xs text-muted-foreground text-center py-0.5">
                          +{hiddenCount} more
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

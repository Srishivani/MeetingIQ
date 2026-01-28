import * as React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, ChevronLeft, ChevronRight, Home, Calendar as CalendarIcon,
  Clock, MapPin, Users, Video, Building
} from "lucide-react";
import { useMeetings, Meeting } from "@/hooks/useMeetings";
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isSameMonth, 
  addDays, 
  addWeeks, 
  addMonths, 
  subDays, 
  subWeeks, 
  subMonths,
  startOfDay,
  endOfDay,
  isToday,
  getHours,
  getMinutes,
} from "date-fns";
import { cn } from "@/lib/utils";
import { MeetingEventCard } from "@/components/calendar/MeetingEventCard";
import { DayView } from "@/components/calendar/DayView";
import { WeekView } from "@/components/calendar/WeekView";
import { MonthView } from "@/components/calendar/MonthView";

type ViewType = "day" | "week" | "month";

const CalendarView = () => {
  const { meetings, isLoading } = useMeetings();
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [view, setView] = React.useState<ViewType>("week");

  const navigatePrev = () => {
    if (view === "day") setCurrentDate((d) => subDays(d, 1));
    else if (view === "week") setCurrentDate((d) => subWeeks(d, 1));
    else setCurrentDate((d) => subMonths(d, 1));
  };

  const navigateNext = () => {
    if (view === "day") setCurrentDate((d) => addDays(d, 1));
    else if (view === "week") setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addMonths(d, 1));
  };

  const goToToday = () => setCurrentDate(new Date());

  const getHeaderTitle = () => {
    if (view === "day") return format(currentDate, "EEEE, MMMM d, yyyy");
    if (view === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      if (start.getMonth() === end.getMonth()) {
        return `${format(start, "MMMM d")} - ${format(end, "d, yyyy")}`;
      }
      return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
    }
    return format(currentDate, "MMMM yyyy");
  };

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card shrink-0">
        <div className="mx-auto w-full max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
                <Brain className="h-5 w-5" />
                <span className="text-sm font-semibold tracking-wide uppercase">MeetingIQ</span>
              </Link>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                <h1 className="text-lg font-semibold">Calendar</h1>
              </div>
            </div>

            <Button asChild variant="outline" size="sm">
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="border-b bg-card/50 shrink-0">
        <div className="mx-auto w-full max-w-7xl px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Navigation */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <div className="flex items-center">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navigatePrev}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navigateNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <h2 className="text-lg font-semibold min-w-[200px]">{getHeaderTitle()}</h2>
            </div>

            {/* View Toggle */}
            <Tabs value={view} onValueChange={(v) => setView(v as ViewType)}>
              <TabsList>
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 overflow-hidden">
        <div className="mx-auto w-full max-w-7xl h-full px-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <>
              {view === "day" && <DayView date={currentDate} meetings={meetings} />}
              {view === "week" && <WeekView date={currentDate} meetings={meetings} />}
              {view === "month" && <MonthView date={currentDate} meetings={meetings} />}
            </>
          )}
        </div>
      </div>
    </main>
  );
};

export default CalendarView;

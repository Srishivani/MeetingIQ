import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, Download, ChevronDown } from "lucide-react";
import {
  CalendarEvent,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  generateOffice365CalendarUrl,
  downloadICSFile,
  openCalendarUrl,
} from "@/lib/calendarIntegration";
import { toast } from "sonner";

interface AddToCalendarButtonsProps {
  event: CalendarEvent;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function AddToCalendarButtons({
  event,
  variant = "outline",
  size = "sm",
  className,
}: AddToCalendarButtonsProps) {
  const handleGoogleCalendar = () => {
    const url = generateGoogleCalendarUrl(event);
    openCalendarUrl(url);
    toast.success("Opening Google Calendar...");
  };

  const handleOutlook = () => {
    const url = generateOutlookCalendarUrl(event);
    openCalendarUrl(url);
    toast.success("Opening Outlook Calendar...");
  };

  const handleOffice365 = () => {
    const url = generateOffice365CalendarUrl(event);
    openCalendarUrl(url);
    toast.success("Opening Office 365 Calendar...");
  };

  const handleDownloadICS = () => {
    downloadICSFile(event);
    toast.success("Calendar file downloaded");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Calendar className="h-4 w-4 mr-1.5" />
          Add to Calendar
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleGoogleCalendar}>
          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.5 3.5h-15A2 2 0 002.5 5.5v13a2 2 0 002 2h15a2 2 0 002-2v-13a2 2 0 00-2-2zm-15 15v-10h15v10h-15z" />
          </svg>
          Google Calendar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOutlook}>
          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          Outlook.com
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOffice365}>
          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z" />
          </svg>
          Office 365
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownloadICS}>
          <Download className="h-4 w-4 mr-2" />
          Download .ics file
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

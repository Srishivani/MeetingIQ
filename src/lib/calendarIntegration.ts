/**
 * Calendar Integration Utilities
 * Generates URLs for Google Calendar, Outlook, and ICS files
 */

export interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
}

/**
 * Format date for Google Calendar URL (YYYYMMDDTHHMMSSZ format)
 */
function formatGoogleDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Format date for Outlook URL (ISO format)
 */
function formatOutlookDate(date: Date): string {
  return date.toISOString();
}

/**
 * Format date for ICS file (YYYYMMDDTHHMMSSZ format)
 */
function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Generate Google Calendar URL
 * Opens Google Calendar with pre-filled event details
 */
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${formatGoogleDate(event.startDate)}/${formatGoogleDate(event.endDate)}`,
  });

  if (event.description) {
    params.set("details", event.description);
  }

  if (event.location) {
    params.set("location", event.location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate Outlook Calendar URL (Office 365 / Outlook.com)
 * Opens Outlook with pre-filled event details
 */
export function generateOutlookCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: formatOutlookDate(event.startDate),
    enddt: formatOutlookDate(event.endDate),
  });

  if (event.description) {
    params.set("body", event.description);
  }

  if (event.location) {
    params.set("location", event.location);
  }

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generate Office 365 Calendar URL (for work/school accounts)
 */
export function generateOffice365CalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: formatOutlookDate(event.startDate),
    enddt: formatOutlookDate(event.endDate),
  });

  if (event.description) {
    params.set("body", event.description);
  }

  if (event.location) {
    params.set("location", event.location);
  }

  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generate ICS file content
 * Creates a downloadable .ics file compatible with most calendar apps
 */
export function generateICSContent(event: CalendarEvent): string {
  const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@meetingiq`;
  const now = formatICSDate(new Date());

  // Escape special characters in text fields
  const escapeText = (text: string) =>
    text.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MeetingIQ//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${formatICSDate(event.startDate)}`,
    `DTEND:${formatICSDate(event.endDate)}`,
    `SUMMARY:${escapeText(event.title)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeText(event.location)}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.join("\r\n");
}

/**
 * Download ICS file
 */
export function downloadICSFile(event: CalendarEvent): void {
  const content = generateICSContent(event);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${event.title.replace(/[^a-z0-9]/gi, "_")}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Open calendar URL in new tab
 */
export function openCalendarUrl(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Build CalendarEvent from meeting data
 */
export function buildCalendarEvent(params: {
  title: string;
  description?: string;
  location?: string;
  scheduledAt: Date;
  durationMinutes: number;
  agenda?: Array<{ title: string }>;
}): CalendarEvent {
  const { title, description, location, scheduledAt, durationMinutes, agenda } = params;

  const endDate = new Date(scheduledAt.getTime() + durationMinutes * 60 * 1000);

  // Build description with agenda if provided
  let fullDescription = description || "";
  if (agenda && agenda.length > 0) {
    if (fullDescription) fullDescription += "\n\n";
    fullDescription += "Agenda:\n";
    agenda.forEach((item, i) => {
      fullDescription += `${i + 1}. ${item.title}\n`;
    });
  }

  return {
    title,
    description: fullDescription || undefined,
    location,
    startDate: scheduledAt,
    endDate,
  };
}

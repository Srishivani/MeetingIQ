import type { Meeting, AgendaItem } from "@/hooks/useMeetings";

interface InviteParams {
  title: string;
  description?: string | null;
  scheduledAt: Date;
  durationMinutes: number;
  location?: string | null;
  locationType: "in-person" | "virtual" | "hybrid";
  agenda?: AgendaItem[];
  recipientEmail?: string;
  recipientName?: string;
}

function formatDateTime(date: Date): string {
  return date.toLocaleString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours} hour${hours > 1 ? "s" : ""}`;
}

function getLocationTypeLabel(type: "in-person" | "virtual" | "hybrid"): string {
  return type === "in-person" ? "In-Person" : type === "virtual" ? "Virtual" : "Hybrid";
}

export function buildMeetingInviteBody(params: InviteParams): string {
  const { title, description, scheduledAt, durationMinutes, location, locationType, agenda, recipientName } = params;

  const lines: string[] = [];

  if (recipientName) {
    lines.push(`Hi ${recipientName},`);
    lines.push("");
  }

  lines.push(`You're invited to: ${title}`);
  lines.push("");
  lines.push("📅 MEETING DETAILS");
  lines.push(`Date & Time: ${formatDateTime(scheduledAt)}`);
  lines.push(`Duration: ${formatDuration(durationMinutes)}`);
  lines.push(`Type: ${getLocationTypeLabel(locationType)}`);

  if (location) {
    lines.push(`Location: ${location}`);
  }

  if (description) {
    lines.push("");
    lines.push("📝 DESCRIPTION");
    lines.push(description);
  }

  if (agenda && agenda.length > 0) {
    lines.push("");
    lines.push("📋 AGENDA");
    agenda.forEach((item, i) => {
      lines.push(`${i + 1}. ${item.title}`);
    });
  }

  lines.push("");
  lines.push("---");
  lines.push("Sent via MeetingIQ");

  return lines.join("\n");
}

export function buildMailtoLink(params: InviteParams): string {
  const subject = encodeURIComponent(`Meeting Invitation: ${params.title}`);
  const body = encodeURIComponent(buildMeetingInviteBody(params));
  const to = params.recipientEmail ? encodeURIComponent(params.recipientEmail) : "";

  return `mailto:${to}?subject=${subject}&body=${body}`;
}

export function buildMailtoLinkFromMeeting(
  meeting: Pick<Meeting, "title" | "description" | "scheduledAt" | "durationMinutes" | "location" | "locationType" | "agenda">,
  recipientEmail?: string,
  recipientName?: string
): string {
  return buildMailtoLink({
    title: meeting.title,
    description: meeting.description,
    scheduledAt: meeting.scheduledAt,
    durationMinutes: meeting.durationMinutes,
    location: meeting.location,
    locationType: meeting.locationType,
    agenda: meeting.agenda,
    recipientEmail,
    recipientName,
  });
}

export function buildBulkMailtoLink(
  meeting: Pick<Meeting, "title" | "description" | "scheduledAt" | "durationMinutes" | "location" | "locationType" | "agenda">,
  recipients: Array<{ email?: string | null; name: string }>
): string {
  const emails = recipients
    .filter((r) => r.email)
    .map((r) => r.email!)
    .join(",");

  return buildMailtoLink({
    title: meeting.title,
    description: meeting.description,
    scheduledAt: meeting.scheduledAt,
    durationMinutes: meeting.durationMinutes,
    location: meeting.location,
    locationType: meeting.locationType,
    agenda: meeting.agenda,
    recipientEmail: emails,
  });
}

export function openMailtoLink(url: string): void {
  window.location.href = url;
}

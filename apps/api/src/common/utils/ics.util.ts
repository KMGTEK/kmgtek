import { randomUUID } from 'node:crypto';

export interface IcsAttendee {
  email: string;
  name?: string;
}

export interface IcsEventInput {
  uid?: string;
  title: string;
  description?: string;
  location?: string;
  /** Meeting/join URL, included in the description and as an ICS `URL` property. */
  url?: string;
  start: Date;
  durationMinutes: number;
  organizer: { name: string; email: string };
  attendees: IcsAttendee[];
}

const foldLine = (line: string): string => {
  // RFC5545 §3.1: lines longer than 75 octets must be folded with a leading space.
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    chunks.push(rest.slice(0, 75));
    rest = ` ${rest.slice(75)}`;
  }
  chunks.push(rest);
  return chunks.join('\r\n');
};

const escapeText = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

const toUtcStamp = (date: Date): string => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

/**
 * Minimal RFC5545 (iCalendar) VEVENT generator — no dependency needed for a
 * single meeting invite with a handful of attendees.
 */
export function buildIcsEvent(input: IcsEventInput): string {
  const uid = input.uid ?? `${randomUUID()}@kmgtek.com`;
  const dtStart = toUtcStamp(input.start);
  const dtEnd = toUtcStamp(new Date(input.start.getTime() + input.durationMinutes * 60_000));
  const now = toUtcStamp(new Date());

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KMG Technologies//Recruitment//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeText(input.title)}`,
    ...(input.description ? [`DESCRIPTION:${escapeText(input.description)}`] : []),
    ...(input.location ? [`LOCATION:${escapeText(input.location)}`] : []),
    ...(input.url ? [`URL:${input.url}`] : []),
    `ORGANIZER;CN=${escapeText(input.organizer.name)}:mailto:${input.organizer.email}`,
    ...input.attendees.map(
      (attendee) =>
        `ATTENDEE;CN=${escapeText(attendee.name ?? attendee.email)};RSVP=TRUE:mailto:${attendee.email}`,
    ),
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.map(foldLine).join('\r\n') + '\r\n';
}

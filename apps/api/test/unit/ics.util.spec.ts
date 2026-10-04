import { buildIcsEvent } from '../../src/common/utils/ics.util';

describe('buildIcsEvent', () => {
  const start = new Date('2026-03-10T14:30:00.000Z');

  it('produces a well-formed RFC5545 VEVENT with attendees, times and a URL', () => {
    const ics = buildIcsEvent({
      title: 'Technical interview — Senior DevOps Engineer',
      description: 'Please join a few minutes early.',
      location: 'Google Meet',
      url: 'https://meet.jit.si/kmg-abc1234567',
      start,
      durationMinutes: 45,
      organizer: { name: 'KMG Talent Team', email: 'recruiting@kmgtek.com' },
      attendees: [
        { email: 'candidate@example.com', name: 'Jane Candidate' },
        { email: 'interviewer@kmgtek.com', name: 'Alex Interviewer' },
      ],
    });

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('DTSTART:20260310T143000Z');
    // 45 minutes later.
    expect(ics).toContain('DTEND:20260310T151500Z');
    expect(ics).toContain('SUMMARY:Technical interview — Senior DevOps Engineer');
    expect(ics).toContain('ORGANIZER;CN=KMG Talent Team:mailto:recruiting@kmgtek.com');
    expect(ics).toContain('ATTENDEE;CN=Jane Candidate;RSVP=TRUE:mailto:candidate@example.com');
    expect(ics).toContain('ATTENDEE;CN=Alex Interviewer;RSVP=TRUE:mailto:interviewer@kmgtek.com');
    expect(ics).toContain('URL:https://meet.jit.si/kmg-abc1234567');
    // Every line must be CRLF-terminated per RFC5545.
    expect(ics.includes('\r\n')).toBe(true);
    expect(ics).not.toMatch(/[^\r]\n/);
  });

  it('escapes commas, semicolons and newlines in free-text fields', () => {
    const ics = buildIcsEvent({
      title: 'Round 1; Screening, intro',
      description: 'Line one\nLine two',
      start,
      durationMinutes: 30,
      organizer: { name: 'KMG', email: 'recruiting@kmgtek.com' },
      attendees: [{ email: 'candidate@example.com' }],
    });

    expect(ics).toContain('SUMMARY:Round 1\\; Screening\\, intro');
    expect(ics).toContain('DESCRIPTION:Line one\\nLine two');
    // No name given — falls back to the email for CN.
    expect(ics).toContain('ATTENDEE;CN=candidate@example.com;RSVP=TRUE:mailto:candidate@example.com');
  });

  it('folds lines longer than 75 octets with a leading space continuation', () => {
    const longTitle = 'A'.repeat(120);
    const ics = buildIcsEvent({
      title: longTitle,
      start,
      durationMinutes: 30,
      organizer: { name: 'KMG', email: 'recruiting@kmgtek.com' },
      attendees: [],
    });

    const summaryLine = ics.split('\r\n').find((line) => line.startsWith('SUMMARY:'));
    expect(summaryLine).toBeDefined();
    expect(summaryLine!.length).toBeLessThanOrEqual(75);
    // The folded continuation begins with a single space.
    const lines = ics.split('\r\n');
    const idx = lines.indexOf(summaryLine!);
    expect(lines[idx + 1].startsWith(' ')).toBe(true);
  });

  it('generates a unique UID per event when none is supplied', () => {
    const a = buildIcsEvent({ title: 'A', start, durationMinutes: 30, organizer: { name: 'KMG', email: 'a@kmgtek.com' }, attendees: [] });
    const b = buildIcsEvent({ title: 'B', start, durationMinutes: 30, organizer: { name: 'KMG', email: 'a@kmgtek.com' }, attendees: [] });
    const uidOf = (ics: string) => ics.split('\r\n').find((line) => line.startsWith('UID:'));
    expect(uidOf(a)).not.toBe(uidOf(b));
  });
});

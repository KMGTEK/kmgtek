import type { ApplicationStatus } from '@kmg/shared';

/** In-process domain events (see docs/API_CONTRACT.md → Events). */
export const EVENTS = {
  APPLICATION_CREATED: 'application.created',
  APPLICATION_STATUS_CHANGED: 'application.status_changed',
  INTERVIEW_SCHEDULED: 'interview.scheduled',
  LEAD_CREATED: 'lead.created',
  LEAD_ASSIGNED: 'lead.assigned',
  USER_PASSWORD_RESET_REQUESTED: 'user.password_reset_requested',
  USER_REGISTERED: 'user.registered',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

export interface ApplicationCreatedPayload {
  applicationId: string;
}
export interface ApplicationStatusChangedPayload {
  applicationId: string;
  from: ApplicationStatus | null;
  to: ApplicationStatus;
  note?: string | null;
  notifyCandidate?: boolean;
}
export interface InterviewScheduledPayload {
  interviewId: string;
}
export interface LeadCreatedPayload {
  leadId: string;
}
export interface LeadAssignedPayload {
  leadId: string;
  assigneeId: string;
}
export interface PasswordResetRequestedPayload {
  userId: string;
  /** Plain (un-hashed) token — only ever leaves the process inside the email. */
  token: string;
}
export interface UserRegisteredPayload {
  userId: string;
}

/** Maps every event name to its payload so emitting/handling stays type-safe. */
export interface EventPayloads {
  [EVENTS.APPLICATION_CREATED]: ApplicationCreatedPayload;
  [EVENTS.APPLICATION_STATUS_CHANGED]: ApplicationStatusChangedPayload;
  [EVENTS.INTERVIEW_SCHEDULED]: InterviewScheduledPayload;
  [EVENTS.LEAD_CREATED]: LeadCreatedPayload;
  [EVENTS.LEAD_ASSIGNED]: LeadAssignedPayload;
  [EVENTS.USER_PASSWORD_RESET_REQUESTED]: PasswordResetRequestedPayload;
  [EVENTS.USER_REGISTERED]: UserRegisteredPayload;
}

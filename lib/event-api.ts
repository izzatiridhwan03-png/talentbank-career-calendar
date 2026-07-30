import { EVENT_STATUS } from "./constants";

export type EventCreatePayload = {
  title: string;
  description?: string;
  location: string;
  venue: string;
  startDateTime: string;
  endDateTime: string;
  employerCapacity: number | string;
  status?: string;
};

export type EventUpdatePayload = Partial<EventCreatePayload>;

function parseDateTime(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be an ISO date string`);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} must be a valid ISO date string`);
  }

  return parsed.toISOString();
}

function parseCapacity(value: unknown): number {
  const capacity = typeof value === "string" ? Number(value) : value;
  if (typeof capacity !== "number" || Number.isNaN(capacity) || !Number.isInteger(capacity)) {
    throw new Error("employerCapacity must be an integer");
  }
  if (capacity < 1) {
    throw new Error("employerCapacity must be at least 1");
  }
  return capacity;
}

function validateStatus(value: unknown): string {
  if (value === undefined || value === null) {
    return EVENT_STATUS.SCHEDULED;
  }

  if (typeof value !== "string") {
    throw new Error("status must be a string");
  }

  const normalized = value.toUpperCase();

  if (!Object.values(EVENT_STATUS).includes(normalized as typeof EVENT_STATUS[keyof typeof EVENT_STATUS])) {
    throw new Error(`status must be one of: ${Object.values(EVENT_STATUS).join(", ")}`);
  }

  return normalized;
}

export function isEventCompleted(endDateTime: Date | string) {
  return new Date() > new Date(endDateTime);
}

export function getEventDisplayStatus(event: {
  status: string;
  endDateTime: Date | string;
  employerCapacity?: number;
  employerRegistrations?: Array<unknown>;
  employerRegistrationCount?: number;
}) {
  if (event.status === EVENT_STATUS.CANCELLED) {
    return EVENT_STATUS.CANCELLED;
  }

  if (isEventCompleted(event.endDateTime)) {
    return EVENT_STATUS.COMPLETED;
  }

  if (event.employerCapacity !== undefined) {
    const employerCount =
      event.employerRegistrationCount ?? event.employerRegistrations?.length ?? 0;
    return employerCount >= event.employerCapacity ? EVENT_STATUS.FULL : EVENT_STATUS.SCHEDULED;
  }

  return event.status;
}

function validatePlainString(value: unknown, fieldName: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} is required and must be a non-empty string.`);
  }
  return value.trim();
}

function validateEmail(value: unknown) {
  const email = validatePlainString(value, "email");
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    throw new Error("email must be a valid email address.");
  }
  return email.toLowerCase();
}

export function validateCandidateRegistrationPayload(
  payload: unknown
): { valid: true; data: Record<string, unknown> } | { valid: false; error: string } {
  if (typeof payload !== "object" || payload === null) {
    return { valid: false, error: "Request body must be a JSON object." };
  }

  const body = payload as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  try {
    data.eventId = validatePlainString(body.eventId, "eventId");
    data.name = validatePlainString(body.name, "name");
    data.email = validateEmail(body.email);
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : "Invalid candidate registration payload." };
  }

  return { valid: true, data };
}

export function validateEmployerRegistrationPayload(
  payload: unknown
): { valid: true; data: Record<string, unknown> } | { valid: false; error: string } {
  if (typeof payload !== "object" || payload === null) {
    return { valid: false, error: "Request body must be a JSON object." };
  }

  const body = payload as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  try {
    data.eventId = validatePlainString(body.eventId, "eventId");
    data.companyName = validatePlainString(body.companyName, "companyName");
    data.contactPerson = validatePlainString(body.contactPerson, "contactPerson");
    data.email = validateEmail(body.email);
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : "Invalid employer registration payload." };
  }

  return { valid: true, data };
}

export function validateEventPayload(
  payload: unknown,
  mode: "create" | "update" = "create"
): { valid: true; data: Record<string, unknown> } | { valid: false; error: string } {
  if (typeof payload !== "object" || payload === null) {
    return { valid: false, error: "Request body must be a JSON object." };
  }

  const body = payload as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  if (mode === "create") {
    if (!body.title || typeof body.title !== "string") {
      return { valid: false, error: "title is required and must be a string." };
    }
    if (!body.location || typeof body.location !== "string") {
      return { valid: false, error: "location is required and must be a string." };
    }
    if (!body.venue || typeof body.venue !== "string") {
      return { valid: false, error: "venue is required and must be a string." };
    }
    if (body.employerCapacity === undefined) {
      return { valid: false, error: "employerCapacity is required." };
    }
  }

  if (body.title !== undefined) {
    if (typeof body.title !== "string") {
      return { valid: false, error: "title must be a string." };
    }
    data.title = body.title.trim();
  }

  if (body.description !== undefined) {
    if (body.description !== null && typeof body.description !== "string") {
      return { valid: false, error: "description must be a string." };
    }
    data.description = body.description ? (body.description as string).trim() : null;
  }

  if (body.location !== undefined) {
    if (typeof body.location !== "string") {
      return { valid: false, error: "location must be a string." };
    }
    data.location = body.location.trim();
  }

  if (body.venue !== undefined) {
    if (typeof body.venue !== "string") {
      return { valid: false, error: "venue must be a string." };
    }
    data.venue = body.venue.trim();
  }

  if (body.startDateTime !== undefined) {
    try {
      data.startDateTime = parseDateTime(body.startDateTime, "startDateTime");
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : "Invalid startDateTime." };
    }
  }

  if (body.endDateTime !== undefined) {
    try {
      data.endDateTime = parseDateTime(body.endDateTime, "endDateTime");
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : "Invalid endDateTime." };
    }
  }

  if (body.employerCapacity !== undefined) {
    try {
      data.employerCapacity = parseCapacity(body.employerCapacity);
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : "Invalid employerCapacity." };
    }
  }

  if (body.status !== undefined) {
    try {
      data.status = validateStatus(body.status);
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : "Invalid status." };
    }
  }

  if (mode === "create") {
    const start = data.startDateTime as string | undefined;
    const end = data.endDateTime as string | undefined;
    if (!start || !end) {
      return { valid: false, error: "startDateTime and endDateTime are required." };
    }
    if (new Date(start) >= new Date(end)) {
      return { valid: false, error: "startDateTime must be before endDateTime." };
    }
  }

  if (mode === "update") {
    if (data.startDateTime && data.endDateTime) {
      if (new Date(data.startDateTime as string) >= new Date(data.endDateTime as string)) {
        return { valid: false, error: "startDateTime must be before endDateTime." };
      }
    }
  }

  return { valid: true, data };
}

export function buildOverlapFilter(
  startDateTime: string,
  endDateTime: string,
  excludeEventId?: string
) {
  return {
    AND: [
      { startDateTime: { lt: endDateTime } },
      { endDateTime: { gt: startDateTime } },
      { status: { not: EVENT_STATUS.CANCELLED } },
    ],
    ...(excludeEventId ? { NOT: { id: excludeEventId } } : {}),
  };
}

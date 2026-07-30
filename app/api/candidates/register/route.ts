import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { validateCandidateRegistrationPayload, isEventCompleted } from "../../../../lib/event-api";
import { EVENT_STATUS } from "../../../../lib/constants";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = validateCandidateRegistrationPayload(body);
  if (!result.valid) {
    return NextResponse.json({ message: result.error }, { status: 400 });
  }

  const { eventId, name, email } = result.data as {
    eventId: string;
    name: string;
    email: string;
  };

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return NextResponse.json({ message: "Event not found." }, { status: 404 });
  }

  if (isEventCompleted(event.endDateTime)) {
    return NextResponse.json(
      { message: "Registration is closed because the event has already completed." },
      { status: 409 }
    );
  }

  if (event.status !== EVENT_STATUS.SCHEDULED) {
    return NextResponse.json(
      { message: "Registration is only allowed for scheduled events." },
      { status: 409 }
    );
  }

  const existingRegistration = await prisma.candidateRegistration.findUnique({
    where: {
      eventId_email: {
        eventId,
        email,
      },
    },
  });

  if (existingRegistration) {
    return NextResponse.json(
      { message: "This email is already registered for the event." },
      { status: 409 }
    );
  }

  const registration = await prisma.candidateRegistration.create({
    data: {
      eventId,
      name,
      email,
    },
  });

  return NextResponse.json(registration, { status: 201 });
}

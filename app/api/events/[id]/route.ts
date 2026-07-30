import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getEventDisplayStatus, validateEventPayload, buildOverlapFilter } from "../../../../lib/event-api";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      candidateRegistrations: true,
      employerRegistrations: true,
    },
  });

  if (!event) {
    return NextResponse.json({ message: "Event not found." }, { status: 404 });
  }

  return NextResponse.json({
    ...event,
    displayStatus: getEventDisplayStatus(event),
  });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const body = await request.json().catch(() => null);
  const result = validateEventPayload(body, "update");

  if (!result.valid) {
    return NextResponse.json({ message: result.error }, { status: 400 });
  }

  const { id } = await context.params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    return NextResponse.json({ message: "Event not found." }, { status: 404 });
  }

  if (getEventDisplayStatus(event) === "COMPLETED") {
    return NextResponse.json(
      { message: "Completed events cannot be edited." },
      { status: 409 }
    );
  }

  const data = result.data as Record<string, unknown>;

  if (data.employerCapacity !== undefined) {
    const currentEmployerCount = await prisma.employerRegistration.count({
      where: { eventId: id },
    });
    if (Number(data.employerCapacity) < currentEmployerCount) {
      return NextResponse.json(
        {
          message:
            "employerCapacity cannot be lower than the current number of registered employers.",
        },
        { status: 400 }
      );
    }
  }

  if (data.startDateTime || data.endDateTime || data.venue) {
    const start = data.startDateTime
      ? new Date(data.startDateTime as string)
      : event.startDateTime;
    const end = data.endDateTime
      ? new Date(data.endDateTime as string)
      : event.endDateTime;

    const overlap = await prisma.event.findFirst({
      where: buildOverlapFilter(start.toISOString(), end.toISOString(), id),
    });

    if (overlap) {
      return NextResponse.json(
        {
          message:
            "Another event is already scheduled during the selected period. Talentbank only allows one active event at a time.",
        },
        { status: 409 }
      );
    }
  }

  const updated = await prisma.event.update({
    where: { id },
    data: {
      title: data.title as string | undefined,
      description: data.description as string | null,
      location: data.location as string | undefined,
      venue: data.venue as string | undefined,
      startDateTime: data.startDateTime ? new Date(data.startDateTime as string) : undefined,
      endDateTime: data.endDateTime ? new Date(data.endDateTime as string) : undefined,
      employerCapacity:
        data.employerCapacity !== undefined
          ? Number(data.employerCapacity)
          : undefined,
      status: data.status as string | undefined,
    },
  });

  return NextResponse.json(updated);
}
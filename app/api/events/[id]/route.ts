import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { EVENT_STATUS } from "../../../../lib/constants";
import { validateEventPayload, buildOverlapFilter } from "../../../../lib/event-api";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: {
      candidateRegistrations: true,
      employerRegistrations: true,
    },
  });

  if (!event) {
    return NextResponse.json({ message: "Event not found." }, { status: 404 });
  }

  return NextResponse.json(event);
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json().catch(() => null);
  const result = validateEventPayload(body, "update");

  if (!result.valid) {
    return NextResponse.json({ message: result.error }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event) {
    return NextResponse.json({ message: "Event not found." }, { status: 404 });
  }

  const data = result.data as Record<string, unknown>;

  if (data.employerCapacity !== undefined) {
    const currentEmployerCount = await prisma.employerRegistration.count({
      where: { eventId: params.id },
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
    const venue = (data.venue as string) ?? event.venue;

    const overlap = await prisma.event.findFirst({
      where: buildOverlapFilter(venue, start.toISOString(), end.toISOString(), params.id),
    });

    if (overlap) {
      return NextResponse.json(
        { message: "Event timing conflicts with an existing event at the same venue." },
        { status: 409 }
      );
    }
  }

  const updated = await prisma.event.update({
    where: { id: params.id },
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

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event) {
    return NextResponse.json({ message: "Event not found." }, { status: 404 });
  }

  if (event.status === EVENT_STATUS.CANCELLED) {
    return new NextResponse(null, { status: 204 });
  }

  await prisma.event.update({
    where: { id: params.id },
    data: { status: EVENT_STATUS.CANCELLED },
  });

  return new NextResponse(null, { status: 204 });
}

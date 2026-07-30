import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { EVENT_STATUS } from "../../../lib/constants";
import { getEventDisplayStatus, validateEventPayload, buildOverlapFilter } from "../../../lib/event-api";

export async function GET() {
  const events = await prisma.event.findMany({
    orderBy: { startDateTime: "asc" },
  });

  const response = events.map((event) => ({
    ...event,
    displayStatus: getEventDisplayStatus(event),
  }));

  return NextResponse.json(response);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = validateEventPayload(body, "create");

  if (!result.valid) {
    return NextResponse.json({ message: result.error }, { status: 400 });
  }

  const data = result.data as Record<string, unknown>;

  const overlap = await prisma.event.findFirst({
    where: buildOverlapFilter(
      new Date(data.startDateTime as string).toISOString(),
      new Date(data.endDateTime as string).toISOString()
    ),
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

  const created = await prisma.event.create({
    data: {
      title: data.title as string,
      description: data.description as string | null,
      location: data.location as string,
      venue: data.venue as string,
      startDateTime: new Date(data.startDateTime as string),
      endDateTime: new Date(data.endDateTime as string),
      employerCapacity: Number(data.employerCapacity),
      status: (data.status as string) ?? EVENT_STATUS.SCHEDULED,
    },
  });

  return NextResponse.json(created, { status: 201 });
}

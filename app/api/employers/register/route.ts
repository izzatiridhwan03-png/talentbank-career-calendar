import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { validateEmployerRegistrationPayload } from "../../../../lib/event-api";
import { EVENT_STATUS } from "../../../../lib/constants";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = validateEmployerRegistrationPayload(body);
  if (!result.valid) {
    return NextResponse.json({ message: result.error }, { status: 400 });
  }

  const { eventId, companyName, contactPerson, email } = result.data as {
    eventId: string;
    companyName: string;
    contactPerson: string;
    email: string;
  };

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return NextResponse.json({ message: "Event not found." }, { status: 404 });
  }

  if (
    event.status !== EVENT_STATUS.SCHEDULED &&
    event.status !== EVENT_STATUS.FULL
  ) {
    return NextResponse.json(
      { message: "Registration is only allowed for active scheduled events." },
      { status: 409 }
    );
  }

  if (event.status === EVENT_STATUS.FULL) {
    return NextResponse.json(
      { message: "Employer registration capacity has been reached for this event." },
      { status: 400 }
    );
  }

  const existingRegistration = await prisma.employerRegistration.findUnique({
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

  const registration = await prisma.$transaction(async (tx) => {
    const currentEmployerCount = await tx.employerRegistration.count({
      where: { eventId },
    });

    if (currentEmployerCount >= event.employerCapacity) {
      throw new Error("Employer registration capacity has been reached for this event.");
    }

    const created = await tx.employerRegistration.create({
      data: {
        eventId,
        companyName,
        contactPerson,
        email,
      },
    });

    if (currentEmployerCount + 1 >= event.employerCapacity) {
      await tx.event.update({
        where: { id: eventId },
        data: { status: EVENT_STATUS.FULL },
      });
    }

    return created;
  });

  if (existingRegistration) {
    return NextResponse.json(
      { message: "This email is already registered for the event." },
      { status: 409 }
    );
  }

  let registration;

  try {
    registration = await prisma.$transaction(async (tx) => {
      const currentEmployerCount = await tx.employerRegistration.count({
        where: { eventId },
      });

      if (currentEmployerCount >= event.employerCapacity) {
        throw new Error("Employer registration capacity has been reached for this event.");
      }

      const created = await tx.employerRegistration.create({
        data: {
          eventId,
          companyName,
          contactPerson,
          email,
        },
      });

      if (currentEmployerCount + 1 >= event.employerCapacity) {
        await tx.event.update({
          where: { id: eventId },
          data: { status: EVENT_STATUS.FULL },
        });
      }

      return created;
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to complete registration." },
      { status: 400 }
    );
  }

  return NextResponse.json(registration, { status: 201 });
}

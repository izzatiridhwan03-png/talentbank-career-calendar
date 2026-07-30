import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Params) {
  const { id } = await context.params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: { employerRegistrations: true },
  });

  if (!event) {
    return NextResponse.json({ message: "Event not found." }, { status: 404 });
  }

  return NextResponse.json(event.employerRegistrations);
}

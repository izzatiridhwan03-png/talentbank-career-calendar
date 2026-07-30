"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, X, Briefcase, CircleDashed } from "lucide-react";
import { EVENT_STATUS } from "../lib/constants";

type EventItem = {
  id: string;
  title: string;
  description?: string | null;
  venue: string;
  location?: string | null;
  startDateTime: string;
  endDateTime: string;
  status: string;
  employerCapacity: number;
  candidateRegistrations: Array<{ id: string }>;
  employerRegistrations: Array<{ id: string }>;
  displayStatus?: string;
};

type RegistrationType = "candidate" | "employer" | null;

const STATUS_COLOR: Record<string, string> = {
  [EVENT_STATUS.SCHEDULED]: "bg-blue-100 text-blue-800",
  [EVENT_STATUS.FULL]: "bg-orange-100 text-orange-800",
  [EVENT_STATUS.COMPLETED]: "bg-emerald-100 text-emerald-800",
  [EVENT_STATUS.CANCELLED]: "bg-red-100 text-red-800",
};

const STATUS_LABEL: Record<string, string> = {
  [EVENT_STATUS.SCHEDULED]: "Upcoming",
  [EVENT_STATUS.FULL]: "Full",
  [EVENT_STATUS.COMPLETED]: "Completed",
  [EVENT_STATUS.CANCELLED]: "Cancelled",
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  return date.toLocaleString("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDateRange = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const sameDay =
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getDate() === endDate.getDate();

  const startLabel = startDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
  const endLabel = endDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });

  return sameDay ? startLabel : `${startLabel} – ${endLabel}`;
};

const getEventStatus = (event: EventItem) => event.displayStatus ?? event.status;

export default function HomePage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeEvent, setActiveEvent] = useState<EventItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [registrationType, setRegistrationType] = useState<RegistrationType>(null);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [candidateForm, setCandidateForm] = useState({ name: "", email: "" });
  const [employerForm, setEmployerForm] = useState({ companyName: "", contactPerson: "", email: "" });

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/events");
      if (!response.ok) throw new Error("Unable to load events.");
      const data = (await response.json()) as EventItem[];
      setEvents(data);
    } catch (err) {
      setError((err as Error).message || "Unable to load events.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const visibleEvents = useMemo(() => {
    return events
      .filter((event) => {
        const status = getEventStatus(event);
        return status !== EVENT_STATUS.CANCELLED && status !== EVENT_STATUS.COMPLETED;
      })
      .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());
  }, [events]);

  const groupedEvents = useMemo(() => {
    const groups = new Map<string, EventItem[]>();
    visibleEvents.forEach((event) => {
      const date = new Date(event.startDateTime);
      const key = date.toLocaleString("en-GB", { month: "long", year: "numeric" });
      const existing = groups.get(key) ?? [];
      existing.push(event);
      groups.set(key, existing);
    });
    return Array.from(groups.entries()).map(([month, items]) => ({ month, items }));
  }, [visibleEvents]);

  const openEventDrawer = async (eventId: string) => {
    setDrawerOpen(true);
    setDetailsLoading(true);
    setActiveEvent(null);
    setRegistrationType(null);
    setRegisterError(null);
    try {
      const response = await fetch(`/api/events/${eventId}`);
      if (!response.ok) throw new Error("Unable to load event details.");
      const data = (await response.json()) as EventItem;
      setActiveEvent(data);
    } catch (err) {
      setRegisterError((err as Error).message || "Unable to load event details.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const refreshEventDetail = async (eventId: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}`);
      if (!response.ok) throw new Error("Unable to refresh event details.");
      const data = (await response.json()) as EventItem;
      setActiveEvent(data);
    } catch {
      // ignore
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setActiveEvent(null);
    setRegistrationType(null);
    setRegisterError(null);
  };

  const showToast = (message: string) => {
    setToast(message);
    window.clearTimeout((window as Window & { _publicToastTimeout?: number })._publicToastTimeout);
    (window as Window & { _publicToastTimeout?: number })._publicToastTimeout = window.setTimeout(() => setToast(null), 3600);
  };

  const submitRegistration = async () => {
    if (!activeEvent) return;
    setRegisterError(null);
    setRegisterLoading(true);
    try {
      const payload =
        registrationType === "candidate"
          ? {
              eventId: activeEvent.id,
              name: candidateForm.name.trim(),
              email: candidateForm.email.trim(),
            }
          : {
              eventId: activeEvent.id,
              companyName: employerForm.companyName.trim(),
              contactPerson: employerForm.contactPerson.trim(),
              email: employerForm.email.trim(),
            };

      const url = registrationType === "candidate" ? "/api/candidates/register" : "/api/employers/register";
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || "Registration failed.");
      }

      showToast(
        registrationType === "candidate"
          ? "Candidate registration successful."
          : "Employer registration successful."
      );
      setCandidateForm({ name: "", email: "" });
      setEmployerForm({ companyName: "", contactPerson: "", email: "" });
      setRegistrationType(null);
      await fetchEvents();
      await refreshEventDetail(activeEvent.id);
    } catch (err) {
      setRegisterError((err as Error).message || "Registration failed.");
    } finally {
      setRegisterLoading(false);
    }
  };

  const eventStatus = activeEvent ? getEventStatus(activeEvent) : undefined;
  const employerCount = activeEvent?.employerRegistrations?.length ?? 0;
  const candidateCount = activeEvent?.candidateRegistrations?.length ?? 0;
  const remainingCapacity = activeEvent ? Math.max(activeEvent.employerCapacity - employerCount, 0) : 0;
  const employerRegistrationDisabled =
    !activeEvent ||
    eventStatus === EVENT_STATUS.CANCELLED ||
    eventStatus === EVENT_STATUS.COMPLETED ||
    eventStatus === EVENT_STATUS.FULL;
  const candidateRegistrationDisabled =
    !activeEvent ||
    eventStatus === EVENT_STATUS.CANCELLED ||
    eventStatus === EVENT_STATUS.COMPLETED;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Talentbank Career Events</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Explore upcoming career fairs for candidates and employers.
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
              Browse events, view details, and register without leaving the page.
            </p>
          </div>
          <div className="flex items-center justify-end">
            <a
              href="/admin"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              <Briefcase className="h-4 w-4" />
              Admin Login
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {loading ? (
          <div className="grid min-h-[320px] place-items-center rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="inline-flex items-center gap-3 rounded-full bg-slate-100 px-4 py-3 text-slate-700 shadow-sm">
              <CircleDashed className="h-5 w-5 animate-spin" />
              Loading available events...
            </div>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-red-900 shadow-sm">
            <p className="text-lg font-semibold">Could not load events.</p>
            <p className="mt-2 text-sm">{error}</p>
            <button
              type="button"
              onClick={fetchEvents}
              className="mt-6 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Retry
            </button>
          </div>
        ) : visibleEvents.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-xl font-semibold text-slate-900">No upcoming events available.</p>
            <p className="mt-2 text-sm text-slate-600">Check back later for new career fairs.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedEvents.map(({ month, items }) => (
              <section key={month} className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold text-slate-900">{month}</span>
                  <span className="h-px flex-1 bg-slate-200" />
                </div>
                <div className="space-y-4">
                  {items.map((event) => (
                    <article
                      key={event.id}
                      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <h2 className="text-xl font-semibold text-slate-900">{event.title}</h2>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLOR[getEventStatus(event)]}`}>
                              {STATUS_LABEL[getEventStatus(event)]}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600">{formatDateRange(event.startDateTime, event.endDateTime)}</p>
                          <p className="text-sm text-slate-600">{event.venue}{event.location ? ` · ${event.location}` : ""}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openEventDrawer(event.id)}
                          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                          View Details
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <div className={`fixed inset-y-0 right-0 z-30 w-full max-w-xl transform border-l border-slate-200 bg-white shadow-2xl transition duration-300 ${drawerOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Event details</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">{activeEvent?.title ?? "Loading..."}</h2>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            className="rounded-full bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="h-full overflow-y-auto p-6">
          {detailsLoading ? (
            <div className="grid min-h-[280px] place-items-center">
              <div className="inline-flex items-center gap-3 rounded-full bg-slate-100 px-4 py-3 text-slate-700 shadow-sm">
                <CircleDashed className="h-5 w-5 animate-spin" /> Loading event details...
              </div>
            </div>
          ) : activeEvent ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">When</p>
                  <p className="text-sm text-slate-600">{formatDateRange(activeEvent.startDateTime, activeEvent.endDateTime)}</p>
                  <p className="text-sm text-slate-600">{formatDateTime(activeEvent.startDateTime)} – {formatDateTime(activeEvent.endDateTime)}</p>
                </div>
                <div className="space-y-2 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Where</p>
                  <p className="text-sm text-slate-600">{activeEvent.venue}</p>
                  {activeEvent.location ? <p className="text-sm text-slate-600">{activeEvent.location}</p> : null}
                </div>
              </div>

              <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Status</p>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLOR[getEventStatus(activeEvent)]}`}>
                    {STATUS_LABEL[getEventStatus(activeEvent)]}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Employer capacity</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{activeEvent.employerCapacity}</p>
                  </div>
                  <div className="rounded-3xl bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Registered employers</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{employerCount}</p>
                  </div>
                </div>
                <div className="rounded-3xl bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Remaining capacity</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{remainingCapacity}</p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-lg font-semibold text-slate-900">Event summary</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{activeEvent.description || "No description provided for this event."}</p>
              </div>

              {eventStatus === EVENT_STATUS.CANCELLED ? (
                <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">
                  This event has been cancelled.
                </div>
              ) : eventStatus === EVENT_STATUS.COMPLETED ? (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
                  This event has already ended.
                </div>
              ) : eventStatus === EVENT_STATUS.FULL ? (
                <div className="rounded-3xl border border-orange-200 bg-orange-50 p-5 text-sm text-orange-900">
                  Employer registration has closed because maximum employer capacity has been reached. Candidate registration remains available.
                </div>
              ) : null}

              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setRegistrationType("candidate")}
                  disabled={candidateRegistrationDisabled}
                  className={`w-full rounded-3xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition ${
                    candidateRegistrationDisabled
                      ? "cursor-not-allowed bg-slate-300 text-slate-600"
                      : "bg-slate-900 hover:bg-slate-800"
                  }`}
                >
                  Register as Candidate
                </button>
                <button
                  type="button"
                  onClick={() => setRegistrationType("employer")}
                  disabled={employerRegistrationDisabled}
                  className={`w-full rounded-3xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition ${
                    employerRegistrationDisabled
                      ? "cursor-not-allowed bg-slate-300 text-slate-600"
                      : "bg-orange-500 hover:bg-orange-400"
                  }`}
                >
                  Register as Employer
                </button>
              </div>

              {registrationType ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {registrationType === "candidate" ? "Candidate Registration" : "Employer Registration"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {registrationType === "candidate"
                          ? "Enter your details to reserve your spot."
                          : "Submit your company details to register for this event."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRegistrationType(null);
                        setRegisterError(null);
                      }}
                      className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <form
                    className="mt-6 space-y-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      submitRegistration();
                    }}
                  >
                    {registrationType === "candidate" ? (
                      <>
                        <label className="block">
                          <span className="text-sm font-medium text-slate-700">Full Name</span>
                          <input
                            required
                            value={candidateForm.name}
                            onChange={(event) => setCandidateForm((current) => ({ ...current, name: event.target.value }))}
                            className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                          />
                        </label>
                        <label className="block">
                          <span className="text-sm font-medium text-slate-700">Email</span>
                          <input
                            required
                            type="email"
                            value={candidateForm.email}
                            onChange={(event) => setCandidateForm((current) => ({ ...current, email: event.target.value }))}
                            className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                          />
                        </label>
                      </>
                    ) : (
                      <>
                        <label className="block">
                          <span className="text-sm font-medium text-slate-700">Company Name</span>
                          <input
                            required
                            value={employerForm.companyName}
                            onChange={(event) => setEmployerForm((current) => ({ ...current, companyName: event.target.value }))}
                            className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                          />
                        </label>
                        <label className="block">
                          <span className="text-sm font-medium text-slate-700">Contact Person</span>
                          <input
                            required
                            value={employerForm.contactPerson}
                            onChange={(event) => setEmployerForm((current) => ({ ...current, contactPerson: event.target.value }))}
                            className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                          />
                        </label>
                        <label className="block">
                          <span className="text-sm font-medium text-slate-700">Email</span>
                          <input
                            required
                            type="email"
                            value={employerForm.email}
                            onChange={(event) => setEmployerForm((current) => ({ ...current, email: event.target.value }))}
                            className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                          />
                        </label>
                      </>
                    )}

                    {registerError ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                        {registerError}
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="submit"
                        disabled={registerLoading}
                        className="inline-flex min-w-[160px] items-center justify-center rounded-3xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {registerLoading ? "Submitting..." : "Submit Registration"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegistrationType(null)}
                        className="inline-flex min-w-[160px] items-center justify-center rounded-3xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid min-h-[240px] place-items-center text-slate-500">No event selected.</div>
          )}
        </div>
      </div>

      {toast ? (
        <div className="fixed bottom-6 right-6 z-50 rounded-3xl bg-slate-900 px-5 py-3 text-sm text-white shadow-2xl">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

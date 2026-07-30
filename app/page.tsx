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
  [EVENT_STATUS.SCHEDULED]: "bg-brand-blue text-brand-brown",
  [EVENT_STATUS.FULL]: "bg-brand-blue text-brand-brown",
  [EVENT_STATUS.COMPLETED]: "bg-brand-sage text-brand-brown",
  [EVENT_STATUS.CANCELLED]: "bg-red-100 text-red-800",
};

const STATUS_LABEL: Record<string, string> = {
  [EVENT_STATUS.SCHEDULED]: "Upcoming",
  [EVENT_STATUS.FULL]: "Upcoming",
  [EVENT_STATUS.COMPLETED]: "Completed",
  [EVENT_STATUS.CANCELLED]: "Cancelled",
};

const getCountdownInfo = (startDateTime: string) => {
  const now = new Date();
  const start = new Date(startDateTime);

  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());

  const diffTime = startDate.getTime() - nowDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return null;

  let label = "";
  let colorClass = "";

  if (diffDays === 0) {
    label = "Happening today";
    colorClass = "bg-red-100 text-red-800 font-bold";
  } else if (diffDays === 1) {
    label = "Happening tomorrow";
    colorClass = "bg-red-50 text-red-600 font-semibold";
  } else if (diffDays <= 10) {
    label = `Happening in ${diffDays} days`;
    colorClass = "bg-red-50 text-red-700";
  } else {
    label = `Happening in ${diffDays} days`;
    colorClass = "bg-stone-100 text-stone-600";
  }

  return { label, colorClass };
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
    <div className="min-h-screen bg-brand-cream text-brand-brown">
      <header className="border-b border-brand-sage/60 bg-brand-cream/90 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-baseline gap-2 text-xs uppercase tracking-[0.24em] text-brand-brown/60">
              <span className="font-script text-xl normal-case tracking-normal text-brand-brown">Talentbank</span>
              Career Events
            </p>
            <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-brand-brown sm:text-4xl">
              Explore upcoming career fairs for candidates and employers.
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-brand-brown/70 sm:text-base">
              Browse events, view details, and register without leaving the page.
            </p>
          </div>
          <div className="flex items-center justify-end">
            <a
              href="/admin"
              className="inline-flex items-center gap-2 rounded-full bg-brand-brown px-4 py-2 text-sm font-semibold text-brand-cream shadow-sm hover:bg-brand-browndark"
            >
              <Briefcase className="h-4 w-4" />
              Admin Login
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {loading ? (
          <div className="grid min-h-[320px] place-items-center rounded-3xl border border-brand-sage/60 bg-white p-8 shadow-sm">
            <div className="inline-flex items-center gap-3 rounded-full bg-brand-cream px-4 py-3 text-brand-brown shadow-sm">
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
              className="mt-6 rounded-full bg-brand-brown px-5 py-2 text-sm font-semibold text-brand-cream hover:bg-brand-browndark"
            >
              Retry
            </button>
          </div>
        ) : visibleEvents.length === 0 ? (
          <div className="rounded-3xl border border-brand-sage/60 bg-white p-8 text-center shadow-sm">
            <p className="font-heading text-xl font-semibold text-brand-brown">No upcoming events available.</p>
            <p className="mt-2 text-sm text-brand-brown/70">Check back later for new career fairs.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedEvents.map(({ month, items }) => (
              <section key={month} className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="font-heading text-lg font-semibold text-brand-brown">{month}</span>
                  <span className="h-px flex-1 bg-brand-sage/60" />
                </div>
                <div className="space-y-4">
                  {items.map((event) => (
                    <article
                      key={event.id}
                      className="rounded-3xl border border-brand-sage/60 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <h2 className="font-heading text-xl font-semibold text-brand-brown">{event.title}</h2>
                            {(() => {
                              const status = getEventStatus(event);
                              const isUpcoming = status === EVENT_STATUS.SCHEDULED || status === EVENT_STATUS.FULL;
                              const countdown = getCountdownInfo(event.startDateTime);

                              if (isUpcoming && countdown) {
                                return (
                                  <span className={`rounded-full px-3 py-1 text-xs ${countdown.colorClass}`}>
                                    {countdown.label}
                                  </span>
                                );
                              }

                              return (
                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLOR[status]}`}>
                                  {STATUS_LABEL[status]}
                                </span>
                              );
                            })()}
                          </div>
                          <p className="text-sm text-brand-brown/70">{formatDateRange(event.startDateTime, event.endDateTime)}</p>
                          <p className="text-sm text-brand-brown/70">{event.venue}{event.location ? ` · ${event.location}` : ""}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openEventDrawer(event.id)}
                          className="inline-flex items-center gap-2 rounded-full bg-brand-brown px-4 py-2 text-sm font-semibold text-brand-cream hover:bg-brand-browndark"
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

      <div className={`fixed inset-y-0 right-0 z-30 w-full max-w-xl transform border-l border-brand-sage/60 bg-white shadow-2xl transition duration-300 ${drawerOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between border-b border-brand-sage/60 px-6 py-5">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-brand-brown/60">Event details</p>
            <h2 className="mt-2 font-heading text-2xl font-semibold text-brand-brown">{activeEvent?.title ?? "Loading..."}</h2>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            className="rounded-full bg-brand-cream p-2 text-brand-brown hover:bg-brand-sage/50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="h-full overflow-y-auto p-6">
          {detailsLoading ? (
            <div className="grid min-h-[280px] place-items-center">
              <div className="inline-flex items-center gap-3 rounded-full bg-brand-cream px-4 py-3 text-brand-brown shadow-sm">
                <CircleDashed className="h-5 w-5 animate-spin" /> Loading event details...
              </div>
            </div>
          ) : activeEvent ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 rounded-3xl border border-brand-sage/60 bg-brand-blue/40 p-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-brand-brown/60">When</p>
                  <p className="text-sm text-brand-brown/80">{formatDateRange(activeEvent.startDateTime, activeEvent.endDateTime)}</p>
                  <p className="text-sm text-brand-brown/80">{formatDateTime(activeEvent.startDateTime)} – {formatDateTime(activeEvent.endDateTime)}</p>
                </div>
                <div className="space-y-2 rounded-3xl border border-brand-sage/60 bg-brand-blue/40 p-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-brand-brown/60">Where</p>
                  <p className="text-sm text-brand-brown/80">{activeEvent.venue}</p>
                  {activeEvent.location ? <p className="text-sm text-brand-brown/80">{activeEvent.location}</p> : null}
                </div>
              </div>

              <div className="rounded-3xl border border-brand-sage/60 bg-brand-cream p-5">
                <h3 className="font-heading text-lg font-semibold text-brand-brown">Event summary</h3>
                <p className="mt-3 text-sm leading-7 text-brand-brown/80">{activeEvent.description || "No description provided for this event."}</p>
              </div>

              {eventStatus === EVENT_STATUS.CANCELLED ? (
                <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">
                  This event has been cancelled.
                </div>
              ) : eventStatus === EVENT_STATUS.COMPLETED ? (
                <div className="rounded-3xl border border-brand-sage bg-brand-sage/30 p-5 text-sm text-brand-brown">
                  This event has already ended.
                </div>
              ) : eventStatus === EVENT_STATUS.FULL ? (
                <div className="rounded-3xl border border-brand-yellowdark bg-brand-yellow/40 p-5 text-sm text-brand-brown">
                  Employer registration has closed because maximum employer capacity has been reached. Candidate registration remains available.
                </div>
              ) : null}

              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setRegistrationType("candidate")}
                  disabled={candidateRegistrationDisabled}
                  className={`w-full rounded-3xl px-4 py-3 text-sm font-semibold shadow-sm transition ${
                    candidateRegistrationDisabled
                      ? "cursor-not-allowed bg-brand-sage/40 text-brand-brown/50"
                      : "bg-brand-brown text-brand-cream hover:bg-brand-browndark"
                  }`}
                >
                  Register as Candidate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRegisterError(null);
                    setRegistrationType("employer");
                  }}
                  disabled={employerRegistrationDisabled}
                  className={`w-full rounded-3xl px-4 py-3 text-sm font-semibold shadow-sm transition ${
                    employerRegistrationDisabled
                      ? "cursor-not-allowed bg-brand-sage/40 text-brand-brown/50"
                      : "bg-brand-yellow text-brand-brown hover:bg-brand-yellowdark"
                  }`}
                >
                  Register as Employer
                </button>

                {registerError && !registrationType && (
                  <div className="rounded-2xl border border-brand-yellowdark bg-brand-yellow/40 px-4 py-3 text-sm text-brand-brown animate-in fade-in slide-in-from-top-1">
                    {registerError}
                  </div>
                )}
              </div>

              {registrationType ? (
                <div className="rounded-3xl border border-brand-sage/60 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-heading text-sm font-semibold text-brand-brown">
                        {registrationType === "candidate" ? "Candidate Registration" : "Employer Registration"}
                      </p>
                      <p className="mt-1 text-sm text-brand-brown/60">
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
                      className="rounded-full bg-brand-cream p-2 text-brand-brown/70 hover:bg-brand-sage/50"
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
                          <span className="text-sm font-medium text-brand-brown/80">Full Name</span>
                          <input
                            required
                            value={candidateForm.name}
                            onChange={(event) => setCandidateForm((current) => ({ ...current, name: event.target.value }))}
                            className="mt-2 w-full rounded-2xl border border-brand-sage bg-brand-cream/50 px-4 py-3 text-sm text-brand-brown outline-none transition focus:border-brand-brown"
                          />
                        </label>
                        <label className="block">
                          <span className="text-sm font-medium text-brand-brown/80">Email</span>
                          <input
                            required
                            type="email"
                            value={candidateForm.email}
                            onChange={(event) => setCandidateForm((current) => ({ ...current, email: event.target.value }))}
                            className="mt-2 w-full rounded-2xl border border-brand-sage bg-brand-cream/50 px-4 py-3 text-sm text-brand-brown outline-none transition focus:border-brand-brown"
                          />
                        </label>
                      </>
                    ) : (
                      <>
                        <label className="block">
                          <span className="text-sm font-medium text-brand-brown/80">Company Name</span>
                          <input
                            required
                            value={employerForm.companyName}
                            onChange={(event) => setEmployerForm((current) => ({ ...current, companyName: event.target.value }))}
                            className="mt-2 w-full rounded-2xl border border-brand-sage bg-brand-cream/50 px-4 py-3 text-sm text-brand-brown outline-none transition focus:border-brand-brown"
                          />
                        </label>
                        <label className="block">
                          <span className="text-sm font-medium text-brand-brown/80">Contact Person</span>
                          <input
                            required
                            value={employerForm.contactPerson}
                            onChange={(event) => setEmployerForm((current) => ({ ...current, contactPerson: event.target.value }))}
                            className="mt-2 w-full rounded-2xl border border-brand-sage bg-brand-cream/50 px-4 py-3 text-sm text-brand-brown outline-none transition focus:border-brand-brown"
                          />
                        </label>
                        <label className="block">
                          <span className="text-sm font-medium text-brand-brown/80">Email</span>
                          <input
                            required
                            type="email"
                            value={employerForm.email}
                            onChange={(event) => setEmployerForm((current) => ({ ...current, email: event.target.value }))}
                            className="mt-2 w-full rounded-2xl border border-brand-sage bg-brand-cream/50 px-4 py-3 text-sm text-brand-brown outline-none transition focus:border-brand-brown"
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
                        className="inline-flex min-w-[160px] items-center justify-center rounded-3xl bg-brand-brown px-5 py-3 text-sm font-semibold text-brand-cream transition hover:bg-brand-browndark disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {registerLoading ? "Submitting..." : "Submit Registration"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegistrationType(null)}
                        className="inline-flex min-w-[160px] items-center justify-center rounded-3xl border border-brand-sage bg-white px-5 py-3 text-sm font-semibold text-brand-brown/80 hover:bg-brand-cream"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid min-h-[240px] place-items-center text-brand-brown/50">No event selected.</div>
          )}
        </div>
      </div>

      {toast ? (
        <div className="fixed bottom-6 right-6 z-50 rounded-3xl bg-brand-brown px-5 py-3 text-sm text-brand-cream shadow-2xl">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

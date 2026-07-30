"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import AdminNav from "../../components/AdminNav";
import { EVENT_STATUS } from "../../../../lib/constants";

type EventDetail = {
  id: string;
  title: string;
  description: string | null;
  venue: string;
  location?: string | null;
  startDateTime: string;
  endDateTime: string;
  status: string;
  employerCapacity: number;
  displayStatus?: string;
};

type RegistrationItem = {
  id: string;
  name?: string | null;
  email?: string | null;
  registeredAt?: string;
  companyName?: string | null;
  contactPerson?: string | null;
};

const formatMalaysiaDateTime = (value: string | undefined) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("en-GB", {
      timeZone: "Asia/Kuala_Lumpur",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return value;
  }
};

const toDateTimeLocalInputValue = (value: string) => {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - offsetMs);
  return localDate.toISOString().slice(0, 16);
};

const normalizeEvent = (eventData: EventDetail) => {
  const displayStatus = eventData.displayStatus
    ? eventData.displayStatus
    : eventData.status === EVENT_STATUS.CANCELLED
    ? EVENT_STATUS.CANCELLED
    : new Date() > new Date(eventData.endDateTime)
    ? EVENT_STATUS.COMPLETED
    : eventData.status;

  return { ...eventData, displayStatus };
};

export default function AdminEventDetailPage() {
  const params = useParams();
  const eventId = typeof params?.id === "string" ? params.id : undefined;

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [candidates, setCandidates] = useState<RegistrationItem[]>([]);
  const [employers, setEmployers] = useState<RegistrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<{
    title: string;
    description: string;
    venue: string;
    location: string;
    startDateTime: string;
    endDateTime: string;
    employerCapacity: string;
    status: string;
  }>({
    title: "",
    description: "",
    venue: "",
    location: "",
    startDateTime: "",
    endDateTime: "",
    employerCapacity: "",
    status: "",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isCompleted = (event?.displayStatus ?? event?.status) === EVENT_STATUS.COMPLETED;
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!eventId) {
      setError("Invalid event.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`/api/events/${eventId}`),
      fetch(`/api/events/${eventId}/candidates`),
      fetch(`/api/events/${eventId}/employers`),
    ])
      .then(async ([eventRes, candidateRes, employerRes]) => {
        if (!eventRes.ok) throw new Error("Unable to load event.");
        if (!candidateRes.ok) throw new Error("Unable to load candidates.");
        if (!employerRes.ok) throw new Error("Unable to load employers.");

        const eventData = await eventRes.json();
        const candidateData = await candidateRes.json();
        const employerData = await employerRes.json();

        setEvent(normalizeEvent(eventData));
        setCandidates(candidateData || []);
        setEmployers(employerData || []);
      })
      .catch((err) => setError(err.message || "An error occurred."))
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-brand-cream text-brand-brown">Loading...</div>;
  if (error)
    return (
      <div className="min-h-screen bg-brand-cream p-6">
        <AdminNav />
        <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6 text-red-900">{error}</div>
      </div>
    );
  if (!event)
    return (
      <div className="min-h-screen bg-brand-cream p-6">
        <AdminNav />
        <div className="mt-8 rounded-xl border border-brand-sage/60 bg-white p-6 text-brand-brown">Event not found.</div>
      </div>
    );

  const candidateCount = candidates.length;
  const employerCount = employers.length;
  const displayStatus = event.displayStatus ?? event.status;

  const handleEditSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEditError(null);
    if (!event) return;

    if (!editForm.startDateTime || !editForm.endDateTime) {
      setEditError("startDateTime and endDateTime are required.");
      return;
    }
    if (new Date(editForm.startDateTime) >= new Date(editForm.endDateTime)) {
      setEditError("startDateTime must be before endDateTime.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: editForm.title,
        description: editForm.description || null,
        venue: editForm.venue,
        location: editForm.location,
        startDateTime: new Date(editForm.startDateTime).toISOString(),
        endDateTime: new Date(editForm.endDateTime).toISOString(),
        employerCapacity: Number(editForm.employerCapacity),
        status: editForm.status,
      };

      const response = await fetch(`/api/events/${event.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Unable to save event.");
      }

      const refreshedEvent = await fetch(`/api/events/${event.id}`);
      const updatedEvent = refreshedEvent.ok ? await refreshedEvent.json() : await response.json();
      setEvent(updatedEvent);
      setShowEditModal(false);
      setToast({ message: "Event updated", type: "success" });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setEditError((err as Error).message || "Unable to save event.");
      setToast({ message: (err as Error).message || "Unable to save event.", type: "error" });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-cream">
      <AdminNav />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-semibold text-brand-brown">{event.title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => window.location.assign("/admin/dashboard")}
              className="rounded-md bg-brand-brown px-4 py-2 text-sm font-semibold text-brand-cream hover:bg-brand-browndark"
            >
              Back to dashboard
            </button>
            {!isCompleted ? (
              <button
                type="button"
                onClick={() => {
                  if (!event) return;
                  setEditForm({
                    title: event.title,
                    description: event.description || "",
                    venue: event.venue,
                    location: event.location || "",
                    startDateTime: toDateTimeLocalInputValue(event.startDateTime),
                    endDateTime: toDateTimeLocalInputValue(event.endDateTime),
                    employerCapacity: String(event.employerCapacity),
                    status: event.status,
                  });
                  setEditError(null);
                  setShowEditModal(true);
                }}
                className="rounded-md bg-brand-brown px-4 py-2 text-sm font-semibold text-brand-cream hover:bg-brand-browndark"
              >
                Edit Event
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-brand-sage/60 bg-white p-6 shadow-sm">
            <h2 className="font-heading text-xl font-semibold text-brand-brown">Event Information</h2>
            <div className="mt-4 space-y-3 text-sm text-brand-brown/80">
              <div>
                <p className="font-semibold text-brand-brown">Description</p>
                <p>{event.description || "No description provided."}</p>
              </div>
              <div>
                <p className="font-semibold text-brand-brown">Venue, Location</p>
                <p>
                  {event.venue}
                  {event.location ? `, ${event.location}` : ""}
                </p>
              </div>
              <div>
                <p className="font-semibold text-brand-brown">Start Date</p>
                <p>{formatMalaysiaDateTime(event.startDateTime)}</p>
              </div>
              <div>
                <p className="font-semibold text-brand-brown">End Date</p>
                <p>{formatMalaysiaDateTime(event.endDateTime)}</p>
              </div>
              <div>
                <p className="font-semibold text-brand-brown">Status</p>
                <p>{event.displayStatus ?? event.status}</p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-brand-sage/60 bg-white p-6 shadow-sm">
            <h2 className="font-heading text-xl font-semibold text-brand-brown">Registration Summary</h2>
            <div className="mt-4 space-y-3 text-sm text-brand-brown/80">
              <div>
                <p className="font-semibold text-brand-brown">Capacity</p>
                <p>
                  {employerCount}/{event.employerCapacity}
                </p>
              </div>
              <div>
                <p className="font-semibold text-brand-brown">Total Candidates</p>
                <p>{candidateCount}</p>
              </div>
              <div>
                <p className="font-semibold text-brand-brown">Total Employers</p>
                <p>{employerCount}</p>
              </div>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-xl border border-brand-sage/60 bg-white p-6 shadow-sm">
          <h2 className="font-heading text-xl font-semibold text-brand-brown">Candidate Registrations</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-brand-sage/60">
              <thead className="bg-brand-cream">
                <tr>
                  {['Name', 'Email', 'Registered Date'].map((heading) => (
                    <th
                      key={heading}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-brown/60"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-sage/60">
                {candidates.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-4 text-sm text-brand-brown/70">
                      No candidate registrations.
                    </td>
                  </tr>
                ) : (
                  candidates.map((candidate) => (
                    <tr key={candidate.id} className="hover:bg-brand-cream">
                      <td className="px-4 py-3 text-sm text-brand-brown">{candidate.name || "-"}</td>
                      <td className="px-4 py-3 text-sm text-brand-brown/80">{candidate.email || "-"}</td>
                      <td className="px-4 py-3 text-sm text-brand-brown/80">{formatMalaysiaDateTime(candidate.registeredAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-brand-sage/60 bg-white p-6 shadow-sm">
          <h2 className="font-heading text-xl font-semibold text-brand-brown">Employer Registrations</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-brand-sage/60">
              <thead className="bg-brand-cream">
                <tr>
                  {['Company', 'Representative', 'Email', 'Registered Date'].map((heading) => (
                    <th
                      key={heading}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-brown/60"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-sage/60">
                {employers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-sm text-brand-brown/70">
                      No employer registrations.
                    </td>
                  </tr>
                ) : (
                  employers.map((employer) => (
                    <tr key={employer.id} className="hover:bg-brand-cream">
                      <td className="px-4 py-3 text-sm text-brand-brown">{employer.companyName || "-"}</td>
                      <td className="px-4 py-3 text-sm text-brand-brown/80">{employer.contactPerson || "-"}</td>
                      <td className="px-4 py-3 text-sm text-brand-brown/80">{employer.email || "-"}</td>
                      <td className="px-4 py-3 text-sm text-brand-brown/80">{formatMalaysiaDateTime(employer.registeredAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {showEditModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-brown/50 px-4 py-6">
          <div className="w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading text-2xl font-semibold text-brand-brown">Edit Event</h2>
                <p className="text-sm text-brand-brown/70">Update event details and submit to save.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="rounded-md border border-brand-sage bg-white px-3 py-2 text-sm font-medium text-brand-brown hover:bg-brand-cream"
              >
                Close
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleEditSave}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-brand-brown/80">Title</span>
                  <input
                    value={editForm.title}
                    onChange={(ev) => setEditForm((current) => ({ ...current, title: ev.target.value }))}
                    className="mt-1 block w-full rounded-md border border-brand-sage px-3 py-2 text-brand-brown focus:border-brand-brown focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-brand-brown/80">Venue</span>
                  <input
                    value={editForm.venue}
                    onChange={(ev) => setEditForm((current) => ({ ...current, venue: ev.target.value }))}
                    className="mt-1 block w-full rounded-md border border-brand-sage px-3 py-2 text-brand-brown focus:border-brand-brown focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-brand-brown/80">Location</span>
                  <input
                    value={editForm.location}
                    onChange={(ev) => setEditForm((current) => ({ ...current, location: ev.target.value }))}
                    className="mt-1 block w-full rounded-md border border-brand-sage px-3 py-2 text-brand-brown focus:border-brand-brown focus:outline-none"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-brand-brown/80">Description</span>
                <textarea
                  value={editForm.description}
                  onChange={(ev) => setEditForm((current) => ({ ...current, description: ev.target.value }))}
                  className="mt-1 block w-full rounded-md border border-brand-sage px-3 py-2 text-brand-brown focus:border-brand-brown focus:outline-none"
                  rows={4}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-brand-brown/80">Start Date</span>
                  <input
                    type="datetime-local"
                    value={editForm.startDateTime}
                    onChange={(ev) => setEditForm((current) => ({ ...current, startDateTime: ev.target.value }))}
                    className="mt-1 block w-full rounded-md border border-brand-sage px-3 py-2 text-brand-brown focus:border-brand-brown focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-brand-brown/80">End Date</span>
                  <input
                    type="datetime-local"
                    value={editForm.endDateTime}
                    onChange={(ev) => setEditForm((current) => ({ ...current, endDateTime: ev.target.value }))}
                    className="mt-1 block w-full rounded-md border border-brand-sage px-3 py-2 text-brand-brown focus:border-brand-brown focus:outline-none"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-brand-brown/80">Capacity</span>
                  <input
                    type="number"
                    value={editForm.employerCapacity}
                    onChange={(ev) => setEditForm((current) => ({ ...current, employerCapacity: ev.target.value }))}
                    className="mt-1 block w-full rounded-md border border-brand-sage px-3 py-2 text-brand-brown focus:border-brand-brown focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-brand-brown/80">Status</span>
                  <select
                    value={editForm.status}
                    onChange={(ev) => setEditForm((current) => ({ ...current, status: ev.target.value }))}
                    className="mt-1 block w-full rounded-md border border-brand-sage px-3 py-2 text-brand-brown focus:border-brand-brown focus:outline-none"
                  >
                    {editForm.status === EVENT_STATUS.FULL ? (
                      <option value={EVENT_STATUS.FULL} disabled>
                        FULL (system-controlled)
                      </option>
                    ) : null}
                    {Object.values(EVENT_STATUS)
                      .filter((s) => s !== EVENT_STATUS.FULL && s !== EVENT_STATUS.COMPLETED)
                      .map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                  </select>
                </label>
              </div>

              {editError ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{editError}</div> : null}

              <div className="flex flex-wrap gap-3 pt-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-brand-brown px-4 py-2 text-sm font-semibold text-brand-cream hover:bg-brand-browndark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="rounded-md border border-brand-sage bg-white px-4 py-2 text-sm font-semibold text-brand-brown hover:bg-brand-cream"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

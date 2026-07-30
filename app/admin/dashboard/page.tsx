"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AdminNav from "../components/AdminNav";
import { EVENT_STATUS } from "../../../lib/constants";

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
  candidateCount?: number;
  employerCount?: number;
  displayStatus?: string;
};

type EditForm = {
  title: string;
  description: string;
  venue: string;
  location: string;
  startDateTime: string;
  endDateTime: string;
  employerCapacity: string;
  status: string;
};

const formatDate = (value: string) => {
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

export default function AdminDashboardPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
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
  const [saveError, setSaveError] = useState<string | null>(null);
  type SortKey =
    | "title"
    | "venue"
    | "startDateTime"
    | "endDateTime"
    | "status"
    | "candidateCount"
    | "employerCount"
    | "employerCapacity";
  const [sortKey, setSortKey] = useState<SortKey>("startDateTime");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<EditForm>({
    title: "",
    description: "",
    venue: "",
    location: "",
    startDateTime: "",
    endDateTime: "",
    employerCapacity: "1",
    status: EVENT_STATUS.SCHEDULED,
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch("/api/events")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to load events.");
        }
        return response.json();
      })
      .then(async (data) => {
        const items: EventItem[] = (data as EventItem[]) || [];
        // fetch registration counts for each event
        const enriched = await Promise.all(
          items.map(async (ev: EventItem) => {
            try {
              const [cRes, eRes] = await Promise.all([
                fetch(`/api/events/${ev.id}/candidates`),
                fetch(`/api/events/${ev.id}/employers`),
              ]);
              const [cList, eList] = await Promise.all([cRes.ok ? cRes.json() : [], eRes.ok ? eRes.json() : []]);
              return { ...ev, candidateCount: Array.isArray(cList) ? cList.length : 0, employerCount: Array.isArray(eList) ? eList.length : 0 };
            } catch {
              return { ...ev, candidateCount: 0, employerCount: 0 };
            }
          })
        );
        setEvents(enriched);
      })
      .catch((error) => {
        setError(error.message || "An error occurred.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId) {
      setEditingEventId(editId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!editingEventId) {
      setEditingEvent(null);
      setEditForm({
        title: "",
        description: "",
        venue: "",
        location: "",
        startDateTime: "",
        endDateTime: "",
        employerCapacity: "",
        status: "",
      });
      setEditError(null);
      return;
    }

    setEditLoading(true);
    fetch(`/api/events/${editingEventId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to load event details.");
        }
        return response.json();
      })
      .then((data) => {
        setEditingEvent(data);
        setEditForm({
          title: data.title || "",
          description: data.description || "",
          venue: data.venue || "",
          location: data.location || "",
          startDateTime: toDateTimeLocalInputValue(data.startDateTime),
          endDateTime: toDateTimeLocalInputValue(data.endDateTime),
          employerCapacity: String(data.employerCapacity ?? ""),
          status: data.status || "",
        });
      })
      .catch((error) => {
        setEditError(error.message || "An error occurred while loading details.");
      })
      .finally(() => {
        setEditLoading(false);
      });
  }, [editingEventId]);

  const handleEditSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingEventId) return;
    // client-side validation
    setSaveError(null);
    if (!editForm.title || !editForm.title.trim()) {
      setSaveError("Title is required.");
      return;
    }
    if (!editForm.venue || !editForm.venue.trim()) {
      setSaveError("Venue is required.");
      return;
    }
    if (!editForm.location || !editForm.location.trim()) {
      setSaveError("Location is required.");
      return;
    }
    if (!editForm.startDateTime || !editForm.endDateTime) {
      setSaveError("startDateTime and endDateTime are required.");
      return;
    }
    if (new Date(editForm.startDateTime) >= new Date(editForm.endDateTime)) {
      setSaveError("startDateTime must be before endDateTime.");
      return;
    }
    const cap = Number(editForm.employerCapacity);
    if (!Number.isInteger(cap) || cap < 1) {
      setSaveError("Capacity must be an integer >= 1.");
      return;
    }

    setSaving(true);

    const payload = {
      title: editForm.title,
      description: editForm.description,
      venue: editForm.venue,
      location: editForm.location,
      startDateTime: new Date(editForm.startDateTime).toISOString(),
      endDateTime: new Date(editForm.endDateTime).toISOString(),
      employerCapacity: Number(editForm.employerCapacity),
      status: editForm.status,
    };

    try {
      const response = await fetch(`/api/events/${editingEventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Unable to save event.");
      }

      // refresh the updated event from the API to get displayStatus and latest data
      const refreshedResponse = await fetch(`/api/events/${editingEventId}`);
      const refreshedEvent = refreshedResponse.ok ? await refreshedResponse.json() : await response.json();
      const [cRes, eRes] = await Promise.all([
        fetch(`/api/events/${editingEventId}/candidates`),
        fetch(`/api/events/${editingEventId}/employers`),
      ]);
      const cList = cRes.ok ? await cRes.json() : [];
      const eList = eRes.ok ? await eRes.json() : [];
      const enriched = {
        ...refreshedEvent,
        candidateCount: Array.isArray(cList) ? cList.length : 0,
        employerCount: Array.isArray(eList) ? eList.length : 0,
      };
      setEvents((current) => current.map((item) => (item.id === enriched.id ? enriched : item)));
      setEditingEventId(null);
      setToast({ message: "Event updated", type: "success" });
      setTimeout(() => setToast(null), 3000);
      router.replace("/admin/dashboard");
    } catch (error) {
      setSaveError((error as Error).message || "Unable to save event.");
      setToast({ message: (error as Error).message || "Unable to save event.", type: "error" });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleEditStatusChange = (newStatus: string) => {
    if (newStatus === EVENT_STATUS.CANCELLED) {
      const ok = window.confirm("Are you sure you want to cancel this event? This action cannot be easily undone.");
      if (!ok) return;
    }
    setEditForm((current) => ({ ...current, status: newStatus }));
  };

  const closeEditModal = () => {
    setEditingEventId(null);
    router.replace("/admin/dashboard");
  };

  const stats = useMemo(() => {
    const summary = {
      totalEvents: 0,
      openEvents: 0,
      completed: 0,
      cancelled: 0,
      full: 0,
    };

    for (const event of events) {
      summary.totalEvents += 1;
      const status = (event.displayStatus ?? event.status) as string;
      const isCancelled = status === "CANCELLED";
      const isCompleted = status === "COMPLETED";
      const isFull = status === "FULL";

      if (!isCancelled && !isCompleted && !isFull) {
        summary.openEvents += 1;
      }

      if (isCompleted) summary.completed += 1;
      if (isCancelled) summary.cancelled += 1;

      // Consider an event full if displayStatus is FULL or employerCount >= employerCapacity
      const employerCount = event.employerCount ?? event.employerRegistrations?.length ?? 0;
      const capacity = event.employerCapacity ?? 0;
      if (status === "FULL" || (capacity > 0 && employerCount >= capacity)) {
        summary.full += 1;
      }
    }

    return summary;
  }, [events]);

  const sortedEvents = useMemo(() => {
    const sorted = [...events];
    const direction = sortDirection === "asc" ? 1 : -1;
    sorted.sort((a, b) => {
      if (sortKey === "title" || sortKey === "venue" || sortKey === "status") {
        const left = sortKey === "status" ? (a.displayStatus ?? a.status).toString() : (a[sortKey] ?? "").toString();
        const right = sortKey === "status" ? (b.displayStatus ?? b.status).toString() : (b[sortKey] ?? "").toString();
        return left.localeCompare(right) * direction;
      }
      if (sortKey === "startDateTime" || sortKey === "endDateTime") {
        return (new Date(a[sortKey] as string).getTime() - new Date(b[sortKey] as string).getTime()) * direction;
      }
      const leftNum = Number(a[sortKey] ?? 0);
      const rightNum = Number(b[sortKey] ?? 0);
      return (leftNum - rightNum) * direction;
    });
    return sorted;
  }, [events, sortKey, sortDirection]);


  const handleSortClick = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  };

  const getSortIndicator = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortDirection === "asc" ? "▲" : "▼";
  };

  const columns: Array<{ label: string; key?: SortKey }> = [
    { label: "Event Name", key: "title" },
    { label: "Venue", key: "venue" },
    { label: "Start Date", key: "startDateTime" },
    { label: "End Date", key: "endDateTime" },
    { label: "Status", key: "status" },
    { label: "Candidates", key: "candidateCount" },
    { label: "Employers", key: "employerCount" },
    { label: "Capacity", key: "employerCapacity" },
    { label: "Actions" },
  ];

  const handleCreateSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateError(null);

    // client-side validation
    if (!createForm.title || !createForm.title.trim()) {
      setCreateError("Title is required.");
      return;
    }
    if (!createForm.venue || !createForm.venue.trim()) {
      setCreateError("Venue is required.");
      return;
    }
    if (!createForm.location || !createForm.location.trim()) {
      setCreateError("Location is required.");
      return;
    }
    if (!createForm.startDateTime || !createForm.endDateTime) {
      setCreateError("startDateTime and endDateTime are required.");
      return;
    }
    if (new Date(createForm.startDateTime) >= new Date(createForm.endDateTime)) {
      setCreateError("startDateTime must be before endDateTime.");
      return;
    }
    const cap = Number(createForm.employerCapacity);
    if (!Number.isInteger(cap) || cap < 1) {
      setCreateError("Capacity must be an integer >= 1.");
      return;
    }

    setCreating(true);
    try {
      const payload = {
        title: createForm.title,
        description: createForm.description || null,
        venue: createForm.venue,
        location: createForm.location,
        startDateTime: new Date(createForm.startDateTime).toISOString(),
        endDateTime: new Date(createForm.endDateTime).toISOString(),
        employerCapacity: Number(createForm.employerCapacity),
        status: createForm.status,
      };

      const res = await fetch(`/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Unable to create event.");
      }

      const created = await res.json();
      const refreshedResponse = await fetch(`/api/events/${created.id}`);
      const refreshedEvent = refreshedResponse.ok ? await refreshedResponse.json() : created;
      // fetch counts for new event
      const [cRes, eRes] = await Promise.all([
        fetch(`/api/events/${created.id}/candidates`),
        fetch(`/api/events/${created.id}/employers`),
      ]);
      const cList = cRes.ok ? await cRes.json() : [];
      const eList = eRes.ok ? await eRes.json() : [];
      const enriched = {
        ...refreshedEvent,
        candidateCount: Array.isArray(cList) ? cList.length : 0,
        employerCount: Array.isArray(eList) ? eList.length : 0,
      };
      setEvents((current) => [enriched, ...current]);
      setShowCreateModal(false);
      setToast({ message: "Event created", type: "success" });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setCreateError((err as Error).message || "Unable to create event.");
      setToast({ message: (err as Error).message || "Unable to create event.", type: "error" });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-brand-cream text-brand-brown">Loading...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-brand-cream p-6">
        <AdminNav />
        <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6 text-red-900">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      <AdminNav />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <h1 className="font-heading text-3xl font-semibold text-brand-brown">Admin Dashboard</h1>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Events", value: stats.totalEvents },
            { label: "Open Events", value: stats.openEvents },
            { label: "Completed Events", value: stats.completed },
            { label: "Cancelled Events", value: stats.cancelled },
            { label: "Full Events", value: stats.full },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border border-brand-sage/60 bg-white p-5 shadow-sm">
              <p className="text-sm uppercase tracking-wide text-brand-brown/60">{card.label}</p>
              <p className="mt-3 text-3xl font-semibold text-brand-brown">{card.value}</p>
            </div>
          ))}
        </div>

        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-semibold text-brand-brown">Recent Events</h2>
            <div>
              <button
                type="button"
                onClick={() => {
                  setCreateForm({
                    title: "",
                    description: "",
                    venue: "",
                    location: "",
                    startDateTime: "",
                    endDateTime: "",
                    employerCapacity: "1",
                    status: EVENT_STATUS.SCHEDULED,
                  });
                  setCreateError(null);
                  setShowCreateModal(true);
                }}
                className="rounded-md bg-brand-brown px-3 py-2 text-sm font-semibold text-brand-cream hover:bg-brand-browndark"
              >
                Add Event
              </button>
            </div>
          </div>
          {events.length === 0 ? (
            <div className="mt-4 p-6 text-sm text-brand-brown/70">No events available.</div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border border-brand-sage/60 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-brand-sage/60">
                <thead className="bg-brand-cream">
                  <tr>
                    {columns.map((column) => {
                      const key = column.key;
                      return (
                        <th
                          key={column.label}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-brown/60"
                        >
                          {key ? (
                            <button
                              type="button"
                              onClick={() => handleSortClick(key)}
                              className="inline-flex items-center gap-1 text-left text-sm font-semibold uppercase tracking-wide text-brand-brown/60 hover:text-brand-brown"
                            >
                              {column.label}
                              <span className="text-[9px] leading-none opacity-70">{getSortIndicator(key)}</span>
                            </button>
                          ) : (
                            <span className="text-sm font-semibold uppercase tracking-wide text-brand-brown/60">{column.label}</span>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-sage/60">
                  {sortedEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-brand-cream">
                      <td className="px-4 py-3 text-sm text-brand-brown">{event.title}</td>
                      <td className="px-4 py-3 text-sm text-brand-brown/80">{event.venue}</td>
                      <td className="px-4 py-3 text-sm text-brand-brown/80">{formatDate(event.startDateTime)}</td>
                      <td className="px-4 py-3 text-sm text-brand-brown/80">{formatDate(event.endDateTime)}</td>
                      <td className="px-4 py-3 text-sm text-brand-brown/80">{event.displayStatus ?? event.status}</td>
                      <td className="px-4 py-3 text-sm text-brand-brown/80">{event.candidateCount ?? event.candidateRegistrations?.length ?? 0}</td>
                      <td className="px-4 py-3 text-sm text-brand-brown/80">{event.employerCount ?? event.employerRegistrations?.length ?? 0}</td>
                      <td className="px-4 py-3 text-sm text-brand-brown/80">{event.employerCapacity ?? "-"}</td>
                      <td className="px-4 py-3 text-sm text-brand-brown/80 space-x-2">
                        <button
                          type="button"
                          onClick={() => window.location.assign(`/admin/events/${event.id}`)}
                          className="rounded-md border border-brand-sage px-2 py-1 text-sm font-medium text-brand-brown hover:bg-brand-cream"
                        >
                          View
                        </button>
                        {(event.displayStatus ?? event.status) !== "COMPLETED" ? (
                          <button
                            type="button"
                            onClick={() => router.push(`/admin/dashboard?edit=${event.id}`)}
                            className="rounded-md border border-brand-sage px-2 py-1 text-sm font-medium text-brand-brown hover:bg-brand-cream"
                          >
                            Edit
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-brown/50 px-4 py-6">
          <div className="w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading text-2xl font-semibold text-brand-brown">Add Event</h2>
                <p className="text-sm text-brand-brown/70">Create a new event.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-md border border-brand-sage bg-white px-3 py-2 text-sm font-medium text-brand-brown hover:bg-brand-cream"
              >
                Close
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleCreateSave}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-brand-brown/80">Title</span>
                  <input
                    value={createForm.title}
                    onChange={(ev) => setCreateForm((c) => ({ ...c, title: ev.target.value }))}
                    className="mt-1 block w-full rounded-md border border-brand-sage px-3 py-2 text-brand-brown focus:border-brand-brown focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-brand-brown/80">Venue</span>
                  <input
                    value={createForm.venue}
                    onChange={(ev) => setCreateForm((c) => ({ ...c, venue: ev.target.value }))}
                    className="mt-1 block w-full rounded-md border border-brand-sage px-3 py-2 text-brand-brown focus:border-brand-brown focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-brand-brown/80">Location</span>
                  <input
                    value={createForm.location}
                    onChange={(ev) => setCreateForm((c) => ({ ...c, location: ev.target.value }))}
                    className="mt-1 block w-full rounded-md border border-brand-sage px-3 py-2 text-brand-brown focus:border-brand-brown focus:outline-none"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-brand-brown/80">Description</span>
                <textarea
                  value={createForm.description}
                  onChange={(ev) => setCreateForm((c) => ({ ...c, description: ev.target.value }))}
                  className="mt-1 block w-full rounded-md border border-brand-sage px-3 py-2 text-brand-brown focus:border-brand-brown focus:outline-none"
                  rows={4}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-brand-brown/80">Start Date</span>
                  <input
                    type="datetime-local"
                    value={createForm.startDateTime}
                    onChange={(ev) => {
                      const start = ev.target.value;
                      setCreateForm((current) => {
                        const next = { ...current, startDateTime: start };
                        if (!current.endDateTime || new Date(start) >= new Date(current.endDateTime)) {
                          const defaultEnd = new Date(start);
                          defaultEnd.setHours(defaultEnd.getHours() + 1);
                          next.endDateTime = defaultEnd.toISOString().slice(0, 16);
                        }
                        return next;
                      });
                    }}
                    className="mt-1 block w-full rounded-md border border-brand-sage px-3 py-2 text-brand-brown focus:border-brand-brown focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-brand-brown/80">End Date</span>
                  <input
                    type="datetime-local"
                    value={createForm.endDateTime}
                    onChange={(ev) => setCreateForm((c) => ({ ...c, endDateTime: ev.target.value }))}
                    className="mt-1 block w-full rounded-md border border-brand-sage px-3 py-2 text-brand-brown focus:border-brand-brown focus:outline-none"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-brand-brown/80">Capacity</span>
                  <input
                    type="number"
                    min={1}
                    value={createForm.employerCapacity}
                    onChange={(ev) => setCreateForm((c) => ({ ...c, employerCapacity: ev.target.value }))}
                    className="mt-1 block w-full rounded-md border border-brand-sage px-3 py-2 text-brand-brown focus:border-brand-brown focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-brand-brown/80">Status</span>
                  <select
                    value={createForm.status}
                    onChange={(ev) => setCreateForm((c) => ({ ...c, status: ev.target.value }))}
                    className="mt-1 block w-full rounded-md border border-brand-sage px-3 py-2 text-brand-brown focus:border-brand-brown focus:outline-none"
                  >
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

              {createError ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{createError}</div> : null}

              <div className="flex flex-wrap gap-3 pt-3">
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-md bg-brand-brown px-4 py-2 text-sm font-semibold text-brand-cream hover:bg-brand-browndark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creating ? "Creating..." : "Create Event"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-md border border-brand-sage bg-white px-4 py-2 text-sm font-semibold text-brand-brown hover:bg-brand-cream"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className={`fixed bottom-6 right-6 rounded-md px-4 py-2 shadow-md ${toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.message}
        </div>
      ) : null}
      {editingEventId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-brown/50 px-4 py-6">
          <div className="w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading text-2xl font-semibold text-brand-brown">Edit Event</h2>
                <p className="text-sm text-brand-brown/70">Update event details and submit to save.</p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-md border border-brand-sage bg-white px-3 py-2 text-sm font-medium text-brand-brown hover:bg-brand-cream"
              >
                Close
              </button>
            </div>

            {editLoading ? (
              <div className="mt-6 text-brand-brown/70">Loading event details...</div>
            ) : editError ? (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">{editError}</div>
            ) : editingEvent ? (
              <form className="mt-6 space-y-4" onSubmit={handleEditSave}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-brand-brown/80">Title</span>
                    <input
                      value={editForm.title}
                      onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))}
                      className="mt-1 block w-full rounded-md border border-brand-sage px-3 py-2 text-brand-brown focus:border-brand-brown focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-brand-brown/80">Venue</span>
                    <input
                      value={editForm.venue}
                      onChange={(event) => setEditForm((current) => ({ ...current, venue: event.target.value }))}
                      className="mt-1 block w-full rounded-md border border-brand-sage px-3 py-2 text-brand-brown focus:border-brand-brown focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-brand-brown/80">Location</span>
                    <input
                      value={editForm.location}
                      onChange={(event) => setEditForm((current) => ({ ...current, location: event.target.value }))}
                      className="mt-1 block w-full rounded-md border border-brand-sage px-3 py-2 text-brand-brown focus:border-brand-brown focus:outline-none"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-medium text-brand-brown/80">Description</span>
                  <textarea
                    value={editForm.description}
                    onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))}
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
                      onChange={(event) => setEditForm((current) => ({ ...current, startDateTime: event.target.value }))}
                      className="mt-1 block w-full rounded-md border border-brand-sage px-3 py-2 text-brand-brown focus:border-brand-brown focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-brand-brown/80">End Date</span>
                    <input
                      type="datetime-local"
                      value={editForm.endDateTime}
                      onChange={(event) => setEditForm((current) => ({ ...current, endDateTime: event.target.value }))}
                      className="mt-1 block w-full rounded-md border border-brand-sage px-3 py-2 text-brand-brown focus:border-brand-brown focus:outline-none"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                      <span className="text-sm font-medium text-brand-brown/80">Capacity</span>
                      <input
                        type="number"
                        min={1}
                        value={editForm.employerCapacity}
                        onChange={(event) => setEditForm((current) => ({ ...current, employerCapacity: event.target.value }))}
                        className="mt-1 block w-full rounded-md border border-brand-sage px-3 py-2 text-brand-brown focus:border-brand-brown focus:outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-brand-brown/80">Status</span>
                      <select
                        value={editForm.status}
                        onChange={(event) => handleEditStatusChange(event.target.value)}
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

                {saveError ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{saveError}</div> : null}

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
                    onClick={closeEditModal}
                    className="rounded-md border border-brand-sage bg-white px-4 py-2 text-sm font-semibold text-brand-brown hover:bg-brand-cream"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

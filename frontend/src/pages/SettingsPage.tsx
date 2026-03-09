import React, { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

type Props = {
  token: string;
};

type PreferencesForm = {
  minAge: number;
  maxAge: number;
  gender: string;
  language: string;
};

type AvailabilitySlot = {
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type AvailabilityResponse = {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const TIME_SLOTS: { label: string; start: string; end: string }[] = [
  { label: "18:00 – 19:00", start: "18:00:00", end: "19:00:00" },
  { label: "19:00 – 20:00", start: "19:00:00", end: "20:00:00" },
  { label: "20:00 – 21:00", start: "20:00:00", end: "21:00:00" },
  { label: "21:00 – 22:00", start: "21:00:00", end: "22:00:00" }
];

export const SettingsPage: React.FC<Props> = ({ token }) => {
  const [prefForm, setPrefForm] = useState<PreferencesForm>({
    minAge: 22,
    maxAge: 35,
    gender: "",
    language: ""
  });
  const [prefLoading, setPrefLoading] = useState(true);
  const [prefSaving, setPrefSaving] = useState(false);

  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [availLoading, setAvailLoading] = useState(true);
  const [availSaving, setAvailSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadPreferences = async () => {
      setPrefLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/profile/preferences`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail ?? "Could not load preferences.");
        }
        const data = await res.json();
        setPrefForm({
          minAge: data.min_age ?? 22,
          maxAge: data.max_age ?? 35,
          gender: data.gender ?? "",
          language: data.language ?? ""
        });
      } catch (err: any) {
        setError(err.message ?? "Unexpected error.");
      } finally {
        setPrefLoading(false);
      }
    };

    const loadAvailability = async () => {
      setAvailLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/profile/availability`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail ?? "Could not load availability.");
        }
        const data: AvailabilityResponse[] = await res.json();
        setAvailability(
          data.map((slot) => ({
            day_of_week: slot.day_of_week,
            start_time: slot.start_time,
            end_time: slot.end_time
          }))
        );
      } catch (err: any) {
        setError(err.message ?? "Unexpected error.");
      } finally {
        setAvailLoading(false);
      }
    };

    setError(null);
    setSuccess(null);
    loadPreferences();
    loadAvailability();
  }, [token]);

  const handlePrefChange = (field: keyof PreferencesForm, value: string | number) => {
    setPrefForm((prev) => ({
      ...prev,
      [field]: typeof value === "string" ? value : Number(value)
    }));
  };

  const handleSavePrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (prefForm.minAge > prefForm.maxAge) {
      setError("Minimum age cannot be higher than maximum age.");
      return;
    }

    setPrefSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/profile/preferences`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          min_age: prefForm.minAge,
          max_age: prefForm.maxAge,
          gender: prefForm.gender || null,
          language: prefForm.language || null
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? "Could not save preferences.");
      }
      await res.json();
      setSuccess("Preferences saved.");
    } catch (err: any) {
      setError(err.message ?? "Unexpected error.");
    } finally {
      setPrefSaving(false);
    }
  };

  const availabilityMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const slot of availability) {
      const key = `${slot.day_of_week}-${slot.start_time}-${slot.end_time}`;
      map.set(key, true);
    }
    return map;
  }, [availability]);

  const toggleSlot = (dayIdx: number, start: string, end: string) => {
    setAvailability((prev) => {
      const key = `${dayIdx}-${start}-${end}`;
      const exists = prev.some(
        (s) => s.day_of_week === dayIdx && s.start_time === start && s.end_time === end
      );
      if (exists) {
        return prev.filter(
          (s) => !(s.day_of_week === dayIdx && s.start_time === start && s.end_time === end)
        );
      }
      return [...prev, { day_of_week: dayIdx, start_time: start, end_time: end }];
    });
  };

  const handleSaveAvailability = async () => {
    setError(null);
    setSuccess(null);
    setAvailSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/profile/availability`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          slots: availability
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? "Could not save availability.");
      }
      await res.json();
      setSuccess("Availability saved.");
    } catch (err: any) {
      setError(err.message ?? "Unexpected error.");
    } finally {
      setAvailSaving(false);
    }
  };

  return (
    <div className="card">
      <h2 className="card-title">Settings</h2>

      <section>
        <h3 className="section-title">Preferred matches</h3>
        {prefLoading ? (
          <p>Loading preferences…</p>
        ) : (
          <form className="form-grid" onSubmit={handleSavePrefs}>
            <div className="age-range-row">
              <div className="range-inputs">
                <label>
                  Min age
                  <input
                    type="number"
                    min={18}
                    max={120}
                    value={prefForm.minAge}
                    onChange={(e) => handlePrefChange("minAge", e.target.valueAsNumber || 18)}
                  />
                </label>
                <label>
                  Max age
                  <input
                    type="number"
                    min={18}
                    max={120}
                    value={prefForm.maxAge}
                    onChange={(e) => handlePrefChange("maxAge", e.target.valueAsNumber || 120)}
                  />
                </label>
              </div>
            </div>
            <label>
              Gender
              <select
                value={prefForm.gender}
                onChange={(e) => handlePrefChange("gender", e.target.value)}
              >
                <option value="">Any</option>
                <option value="woman">Women</option>
                <option value="man">Men</option>
                <option value="non-binary">Non-binary</option>
              </select>
            </label>
            <label>
              Language
              <select
                value={prefForm.language}
                onChange={(e) => handlePrefChange("language", e.target.value)}
              >
                <option value="">Any</option>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </select>
            </label>
            <button type="submit" className="primary-button" disabled={prefSaving}>
              {prefSaving ? "Saving…" : "Save preferences"}
            </button>
          </form>
        )}
      </section>

      <div className="divider" />

      <section>
        <h3 className="section-title">Weekly availability</h3>
        {availLoading ? (
          <p>Loading availability…</p>
        ) : (
          <>
            <div className="availability-grid">
              {DAYS.map((dayLabel, dayIdx) => (
                <div key={dayLabel} className="availability-column">
                  <div className="availability-day">{dayLabel}</div>
                  {TIME_SLOTS.map((slot) => {
                    const key = `${dayIdx}-${slot.start}-${slot.end}`;
                    const checked = availabilityMap.get(key) ?? false;
                    return (
                      <label key={key} className="availability-slot">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSlot(dayIdx, slot.start, slot.end)}
                        />
                        <span>{slot.label}</span>
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
            <button
              type="button"
              className="primary-button"
              onClick={handleSaveAvailability}
              disabled={availSaving}
            >
              {availSaving ? "Saving…" : "Save availability"}
            </button>
          </>
        )}
      </section>

      {error && <p className="alert alert-error top-spacing">{error}</p>}
      {success && <p className="alert alert-success top-spacing">{success}</p>}
    </div>
  );
};


import React, { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

type Props = {
  token: string;
};

type ProfileForm = {
  age: number | "";
  city: string;
  bio: string;
  gender: string;
  language: string;
};

export const EditProfilePage: React.FC<Props> = ({ token }) => {
  const [form, setForm] = useState<ProfileForm>({
    age: "",
    city: "",
    bio: "",
    gender: "",
    language: ""
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/profile/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail ?? "Could not load profile.");
        }
        const data = await res.json();
        setForm({
          age: data.age ?? "",
          city: data.city ?? "",
          bio: data.bio ?? "",
          gender: data.gender ?? "",
          language: data.language ?? ""
        });
      } catch (err: any) {
        setError(err.message ?? "Unexpected error.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const handleChange = (field: keyof ProfileForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: field === "age" ? (value === "" ? "" : Number(value)) : value
    }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const MIN_AGE = 18;
    const MAX_AGE = 120;
    if (form.age !== "" && (form.age < MIN_AGE || form.age > MAX_AGE)) {
      setError(`Age must be between ${MIN_AGE} and ${MAX_AGE}.`);
      return;
    }
    if (!form.city.trim()) {
      setError("City is required.");
      return;
    }

    setSaving(true);
    try {
      const body: any = {
        age: form.age === "" ? null : form.age,
        city: form.city || null,
        bio: form.bio || null,
        gender: form.gender || null,
        language: form.language || null
      };
      const res = await fetch(`${API_BASE}/api/profile/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? "Could not save profile.");
      }
      await res.json();
      setSuccess("Profile saved.");
    } catch (err: any) {
      setError(err.message ?? "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadPhoto = async () => {
    if (!photoFile) {
      setError("Please choose a photo first.");
      return;
    }
    setError(null);
    setSuccess(null);
    setPhotoSaving(true);
    try {
      const formData = new FormData();
      formData.append("file", photoFile);
      const res = await fetch(`${API_BASE}/api/profile/photo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? "Could not upload photo.");
      }
      await res.json();
      setSuccess("Photo uploaded.");
    } catch (err: any) {
      setError(err.message ?? "Unexpected error.");
    } finally {
      setPhotoSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="card-title">Edit profile</h2>
      <form className="form-grid" onSubmit={handleSaveProfile}>
        <label>
          Age
          <input
            type="number"
            min={18}
            max={120}
            value={form.age === "" ? "" : form.age}
            onChange={(e) => handleChange("age", e.target.value)}
            placeholder="Your age"
          />
        </label>
        <label>
          City
          <input
            type="text"
            value={form.city}
            onChange={(e) => handleChange("city", e.target.value)}
            placeholder="Where are you based?"
            required
          />
        </label>
        <label>
          Bio
          <textarea
            value={form.bio}
            onChange={(e) => handleChange("bio", e.target.value)}
            placeholder="A few words about you, your vibe and what you’re looking for."
            rows={4}
          />
        </label>
        <label>
          Gender
          <select value={form.gender} onChange={(e) => handleChange("gender", e.target.value)}>
            <option value="">Prefer not to say</option>
            <option value="woman">Woman</option>
            <option value="man">Man</option>
            <option value="non-binary">Non-binary</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>
          Language
          <select value={form.language} onChange={(e) => handleChange("language", e.target.value)}>
            <option value="">Any</option>
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
          </select>
        </label>
        {error && <p className="alert alert-error">{error}</p>}
        {success && <p className="alert alert-success">{success}</p>}
        <button type="submit" className="primary-button" disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </button>
      </form>

      <div className="divider" />

      <section>
        <h3 className="section-title">Profile photo</h3>
        <div className="photo-upload-row">
          <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
          <button type="button" className="primary-button" onClick={handleUploadPhoto} disabled={photoSaving}>
            {photoSaving ? "Uploading…" : "Upload"}
          </button>
        </div>
      </section>
    </div>
  );
};


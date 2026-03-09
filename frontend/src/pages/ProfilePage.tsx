import React, { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

type Profile = {
  id: number;
  email: string;
  age?: number | null;
  city?: string | null;
  bio?: string | null;
  gender?: string | null;
  language?: string | null;
  photo_path?: string | null;
};

type Props = {
  token: string;
};

export const ProfilePage: React.FC<Props> = ({ token }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setProfile(data);
      } catch (err: any) {
        setError(err.message ?? "Unexpected error.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  if (loading) {
    return (
      <div className="card">
        <p>Loading profile…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <p className="alert alert-error">{error}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="card">
        <p>No profile yet.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="card-title">My profile</h2>
      <div className="profile-layout">
        <div className="profile-photo">
          {profile.photo_path ? (
            <div className="photo-placeholder with-photo">
              <span>Photo uploaded</span>
            </div>
          ) : (
            <div className="photo-placeholder">
              <span>No photo</span>
            </div>
          )}
        </div>
        <div className="profile-details">
          <p>
            <strong>Email:</strong> {profile.email}
          </p>
          {profile.age && (
            <p>
              <strong>Age:</strong> {profile.age}
            </p>
          )}
          {profile.city && (
            <p>
              <strong>City:</strong> {profile.city}
            </p>
          )}
          {profile.gender && (
            <p>
              <strong>Gender:</strong> {profile.gender}
            </p>
          )}
          {profile.language && (
            <p>
              <strong>Language:</strong> {profile.language}
            </p>
          )}
          {profile.bio && (
            <p>
              <strong>Bio:</strong> {profile.bio}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};


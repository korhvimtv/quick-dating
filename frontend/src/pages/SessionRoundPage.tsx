import React, { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

type Props = {
  token: string;
};

type Partner = {
  user_id: number;
  email: string;
  age?: number | null;
  city?: string | null;
  bio?: string | null;
  gender?: string | null;
  language?: string | null;
};

type RoundInfo = {
  round_index: number;
  partner: Partner | null;
  round_seconds: number;
  has_more: boolean;
};

export const SessionRoundPage: React.FC<Props> = ({ token }) => {
  const [round, setRound] = useState<RoundInfo | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const hasActivePartner = !!round?.partner;
  const controlsDisabled = actionLoading || !hasActivePartner || secondsLeft <= 0;

  const fetchCurrentRound = async () => {
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`${API_BASE}/api/session/current`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? "Could not load session.");
      }
      const data: RoundInfo = await res.json();
      setRound(data);
      if (data.partner) {
        setSecondsLeft(data.round_seconds);
        setShowSummary(false);
      } else if (!data.has_more) {
        setShowSummary(true);
      }
    } catch (err: any) {
      setError(err.message ?? "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!hasActivePartner || secondsLeft <= 0) return;

    const timerId = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timerId);
          // when timer hits zero, request next partner
          handleNextRound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActivePartner, secondsLeft]);

  const sendAction = async (decision: "like" | "skip") => {
    if (!round?.partner) return;
    setActionLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`${API_BASE}/api/session/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          partner_id: round.partner.user_id,
          decision
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? "Could not submit choice.");
      }
      const data: RoundInfo = await res.json();
      setRound(data);
      setInfo("Choice saved.");
      if (data.partner) {
        setSecondsLeft(data.round_seconds);
        setShowSummary(false);
      } else if (!data.has_more) {
        setShowSummary(true);
      }
    } catch (err: any) {
      setError(err.message ?? "Unexpected error.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleNextRound = async () => {
    setActionLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`${API_BASE}/api/session/next`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? "Could not move to next round.");
      }
      const data: RoundInfo = await res.json();
      setRound(data);
      if (data.partner) {
        setSecondsLeft(data.round_seconds);
        setShowSummary(false);
      } else if (!data.has_more) {
        setShowSummary(true);
      }
    } catch (err: any) {
      setError(err.message ?? "Unexpected error.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !round) {
    return (
      <div className="card">
        <p>Loading session…</p>
      </div>
    );
  }

  if (showSummary || (!round?.partner && !round?.has_more)) {
    return (
      <div className="card">
        <h2 className="card-title">Session summary</h2>
        <p>You’ve seen everyone who matches your preferences for this session.</p>
        <p>Check back later to start a new round of quick datings.</p>
      </div>
    );
  }

  if (!round?.partner) {
    return (
      <div className="card">
        <p>No partner right now. Try again in a moment.</p>
        <button type="button" className="primary-button" onClick={handleNextRound} disabled={actionLoading}>
          Try next partner
        </button>
      </div>
    );
  }

  const partner = round.partner;

  return (
    <div className="card session-card">
      <header className="session-card-header">
        <div>
          <h2 className="card-title">Session round</h2>
          <p className="session-subtitle">Round #{round.round_index}</p>
        </div>
        <div className="timer-badge">
          <span>{secondsLeft}s</span>
        </div>
      </header>

      <div className="partner-card">
        <div className="partner-photo-placeholder">
          <span>{partner.city || "Somewhere nearby"}</span>
        </div>
        <div className="partner-details">
          <h3>
            {partner.email.split("@")[0]}
            {partner.age ? `, ${partner.age}` : ""}
          </h3>
          {partner.bio && <p className="partner-bio">{partner.bio}</p>}
          <p className="partner-meta">
            {partner.gender && <span>{partner.gender}</span>}
            {partner.language && <span>{partner.language.toUpperCase()}</span>}
          </p>
        </div>
      </div>

      {error && <p className="alert alert-error">{error}</p>}
      {info && <p className="alert alert-success">{info}</p>}

      <div className="session-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => sendAction("skip")}
          disabled={controlsDisabled}
        >
          Skip
        </button>
        <button
          type="button"
          className="primary-button"
          onClick={() => sendAction("like")}
          disabled={controlsDisabled}
        >
          Like
        </button>
      </div>
    </div>
  );
};


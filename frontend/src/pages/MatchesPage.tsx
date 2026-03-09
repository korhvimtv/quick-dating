import React, { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

type Props = {
  token: string;
};

type MatchSummary = {
  id: number;
  partner_id: number;
  partner_email: string;
  partner_age?: number | null;
  partner_city?: string | null;
  chat_expires_at: string;
};

type Message = {
  id: number;
  sender_id: number;
  body: string;
  created_at: string;
};

export const MatchesPage: React.FC<Props> = ({ token }) => {
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadMatches = async () => {
    setMatchesLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/matches`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? "Could not load matches.");
      }
      const data: MatchSummary[] = await res.json();
      setMatches(data);
      if (data.length > 0 && selectedMatchId === null) {
        setSelectedMatchId(data[0].id);
      }
    } catch (err: any) {
      setError(err.message ?? "Unexpected error.");
    } finally {
      setMatchesLoading(false);
    }
  };

  const loadMessages = async (matchId: number) => {
    setMessagesLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/matches/${matchId}/messages`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? "Could not load messages.");
      }
      const data: Message[] = await res.json();
      setMessages(data);
    } catch (err: any) {
      setError(err.message ?? "Unexpected error.");
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (selectedMatchId != null) {
      loadMessages(selectedMatchId);
    } else {
      setMessages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMatchId]);

  const handleSelectMatch = (id: number) => {
    setSelectedMatchId(id);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatchId) return;
    if (!messageText.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/matches/${selectedMatchId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ body: messageText })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? "Could not send message.");
      }
      setMessageText("");
      // refresh messages after send
      await loadMessages(selectedMatchId);
    } catch (err: any) {
      setError(err.message ?? "Unexpected error.");
    } finally {
      setSending(false);
    }
  };

  const currentMatch = matches.find((m) => m.id === selectedMatchId) || null;

  return (
    <div className="card matches-card">
      <h2 className="card-title">My matches</h2>
      {error && <p className="alert alert-error">{error}</p>}
      <div className="matches-layout">
        <aside className="matches-list">
          <div className="matches-list-header">
            <span>Matches</span>
            <button type="button" className="link-button small-link" onClick={loadMatches} disabled={matchesLoading}>
              Refresh
            </button>
          </div>
          {matchesLoading ? (
            <p>Loading…</p>
          ) : matches.length === 0 ? (
            <p>No active matches yet.</p>
          ) : (
            <ul>
              {matches.map((m) => {
                const label = m.partner_email.split("@")[0];
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      className={
                        selectedMatchId === m.id ? "match-item match-item-active" : "match-item"
                      }
                      onClick={() => handleSelectMatch(m.id)}
                    >
                      <div className="match-item-main">
                        <span className="match-name">{label}</span>
                        {m.partner_age && <span className="match-age">{m.partner_age}</span>}
                      </div>
                      {m.partner_city && <span className="match-city">{m.partner_city}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <section className="chat-pane">
          {!currentMatch ? (
            <p>Select a match to start chatting.</p>
          ) : (
            <>
              <header className="chat-header">
                <div>
                  <h3 className="chat-title">{currentMatch.partner_email.split("@")[0]}</h3>
                  {currentMatch.partner_city && (
                    <p className="chat-subtitle">{currentMatch.partner_city}</p>
                  )}
                </div>
                <button
                  type="button"
                  className="secondary-button small-secondary"
                  onClick={() => loadMessages(currentMatch.id)}
                  disabled={messagesLoading}
                >
                  Refresh messages
                </button>
              </header>
              <div className="chat-messages">
                {messagesLoading ? (
                  <p>Loading messages…</p>
                ) : messages.length === 0 ? (
                  <p className="chat-empty">No messages yet. Say hi!</p>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="chat-message">
                      <div className="chat-message-body">{msg.body}</div>
                      <div className="chat-message-meta">
                        <span>
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <form className="chat-input-row" onSubmit={handleSend}>
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message…"
                  disabled={sending}
                />
                <button type="submit" className="primary-button" disabled={sending || !messageText.trim()}>
                  Send
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
};


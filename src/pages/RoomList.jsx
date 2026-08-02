import { useState, useMemo, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import RoomCard from "../components/RoomCard";
import Button from "../components/Button";
import { getAllLives, resolveInvite } from "../api/liveApi";
import "./styles/RoomList.css";

const FILTERS = [
  { key: "all", label: "All Rooms" },
  { key: "public", label: "Public" },
  { key: "private", label: "Private" },
];

export default function RoomList() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadRooms = useCallback(() => {
    getAllLives()
      .then((data) => setRooms(data || []))
      .catch(() => setLoadError("Unable to load rooms right now."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadRooms();
    const refreshInterval = window.setInterval(loadRooms, 30_000);
    return () => window.clearInterval(refreshInterval);
  }, [loadRooms]);

  const handleJoinByCode = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const code = joinCode.trim();
    if (!code) {
      setJoinError("Enter an invite code first.");
      return;
    }
    setJoinError("");
    setJoining(true);
    try {
      const room = await resolveInvite(code);
      console.log("RESOLVED ROOM:", room);
      navigate(`/room/${room.id}`);
    } catch (err) {
      console.log("JOIN FAILED:", err);
      const status = err.response?.status;
      if (status === 404) {
        setJoinError(
          "No room found for that code. Double-check and try again.",
        );
      } else if (status === 409) {
        setJoinError("That room has already ended.");
      } else {
        setJoinError(
          err.response?.data?.message || "Could not join that room.",
        );
      }
    } finally {
      setJoining(false);
    }
  };

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      if (filter === "public" && room.visibility !== "public") return false;
      if (filter === "private" && room.visibility !== "private") return false;
      if (query && !room.title.toLowerCase().includes(query.toLowerCase()))
        return false;
      return true;
    });
  }, [filter, query, rooms]);

  return (
    <div className="room-list-page">
      <div className="container">
        <section className="marquee-hero">
          <p className="marquee-hero__eyebrow mono">TONIGHT'S SHOWINGS</p>
          <h1 className="marquee-hero__title">The Marquee Board</h1>
          <p className="marquee-hero__sub">
            Pick a room, grab a seat, and watch together. Public rooms are open
            to everyone — private ones need an invite code from the host.
          </p>

          <div className="marquee-hero__actions">
            <Link to="/host/new">
              <Button size="lg">Host a Room</Button>
            </Link>

            <div className="join-code-wrap">
              <div className="join-code-box">
                <input
                  type="text"
                  placeholder="Have an invite code? e.g. MDPHVW6X"
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value.toUpperCase());
                    if (joinError) setJoinError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleJoinByCode(e);
                    }
                  }}
                  className="mono"
                  maxLength={8}
                />
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={(e) => handleJoinByCode(e)}
                  loading={joining}
                >
                  Join with Code
                </Button>
              </div>
              {joinError ? (
                <p className="join-code-error" role="alert">
                  {joinError}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="room-controls">
          <div
            className="room-filters"
            role="tablist"
            aria-label="Filter rooms"
          >
            {FILTERS.map((f) => (
              <button
                key={f.key}
                role="tab"
                aria-selected={filter === f.key}
                className={`room-filter ${filter === f.key ? "room-filter--active" : ""}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <input
            type="search"
            className="room-search"
            placeholder="Search showings..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search rooms"
          />
        </section>

        {loading ? (
          <div className="empty-state">
            <p>Loading showings…</p>
          </div>
        ) : loadError ? (
          <div className="empty-state">
            <p>{loadError}</p>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="empty-state">
            <h3>No showings match that</h3>
            <p>
              Try a different filter, or host your own room — the marquee's got
              room for one more.
            </p>
          </div>
        ) : (
          <section className="room-grid">
            {filteredRooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

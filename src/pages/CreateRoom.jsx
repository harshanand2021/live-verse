import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { createLive } from "../api/liveApi";
import Button from "../components/Button";
import "./styles/CreateRoom.css";

const CONTENT_TYPES = [
  { value: "movie", label: "Movie" },
  { value: "series", label: "Web Series" },
  { value: "sports", label: "Sports" },
];

export default function CreateRoom() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentType, setContentType] = useState("movie");
  const [visibility, setVisibility] = useState("public");
  const [scheduleNow, setScheduleNow] = useState(true);
  const [totalSeats, setTotalSeats] = useState(50);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (submitting) return;

    if (!title.trim()) {
      setError("Give your room a name so guests know what they are joining.");
      return;
    }
    if (!totalSeats || totalSeats < 2 || totalSeats > 100) {
      setError("Total seats must be between 2 and 100.");
      return;
    }

    setError("");
    setSubmitting(true);

    const payload = {
      title: title.trim(),
      description: description.trim(),
      contentType,
      visibility,
      scheduleNow,
      code: null,
      totalSeats: Number(totalSeats),
    };

    try {
      const room = await createLive(payload);
      navigate(`/room/${room.id}`, { replace: true });
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Could not open your room. Please try again.";
      setError(message);
      console.error("CreateRoom failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="create-room-page">
      <div className="container--narrow">
        <p className="create-room__eyebrow mono">OPEN A ROOM</p>
        <h1 className="create-room__title">Host a Room</h1>
        <p className="create-room__sub">
          Hi <strong>{user?.name}</strong>, set the stage and open the doors.
          You'll pick what to play once you're inside.
        </p>

        <div className="create-room-form">
          <label className="cr-field">
            <span>Room title</span>
            <input
              type="text"
              placeholder="Interstellar — Director's Watch"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoComplete="off"
            />
          </label>

          <label className="cr-field">
            <span>
              Description <em>(optional)</em>
            </span>
            <textarea
              rows="3"
              placeholder="Tell your guests what to expect"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <div className="cr-field">
            <span>What are you showing?</span>
            <div className="cr-pill-group">
              {CONTENT_TYPES.map((type) => (
                <button
                  type="button"
                  key={type.value}
                  className={`cr-pill ${contentType === type.value ? "cr-pill--active" : ""}`}
                  onClick={() => setContentType(type.value)}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <label className="cr-field">
            <span>Total seats</span>
            <input
              type="number"
              min="2"
              max="100"
              value={totalSeats}
              onChange={(e) => setTotalSeats(Number(e.target.value))}
            />
          </label>

          <div className="cr-field">
            <span>Who can walk in?</span>
            <div className="cr-visibility-group">
              <button
                type="button"
                className={`cr-visibility-card ${visibility === "public" ? "cr-visibility-card--active" : ""}`}
                onClick={() => setVisibility("public")}
              >
                <strong>🌐 Public</strong>
                <p>Listed on the Marquee Board. Anyone can walk in and watch.</p>
              </button>
              <button
                type="button"
                className={`cr-visibility-card cr-visibility-card--violet ${visibility === "private" ? "cr-visibility-card--active" : ""}`}
                onClick={() => setVisibility("private")}
              >
                <strong>🔒 Private</strong>
                <p>Hidden from the board. Guests need your invite code to enter.</p>
              </button>
            </div>
          </div>

          <button
            type="button"
            className={`cr-schedule ${scheduleNow ? "cr-schedule--now" : ""}`}
            onClick={() => setScheduleNow(!scheduleNow)}
          >
            {scheduleNow ? "● Start right now" : "○ Schedule for later"}
          </button>

          {error ? (
            <p className="cr-error" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            type="button"
            fullWidth
            loading={submitting}
            onClick={handleSubmit}
          >
            Open the Doors
          </Button>
        </div>
      </div>
    </div>
  );
}
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import { CONTENT_TYPES, ROOM_VISIBILITY } from "../constants/live";
import { createLive } from "../api/liveApi";
import "./styles/CreateRoom.css";

function generateCode() {
  const words = [
    "MOON",
    "REEL",
    "STAR",
    "NOIR",
    "GLOW",
    "SCENE",
    "FRAME",
    "CUE",
  ];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(10 + Math.random() * 89);
  return `${word}-${num}`;
}

export default function CreateRoom() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [joinCode, setJoinCode] = useState('');
  const [contentType, setContentType] = useState(CONTENT_TYPES.MOVIE);
  const [visibility, setVisibility] = useState(ROOM_VISIBILITY.PUBLIC);
  const [videoUrl, setVideoUrl] = useState("");
  const [totalSeats, setTotalSeats] = useState(50);
  const [scheduleNow, setScheduleNow] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const previewCode =
    visibility === ROOM_VISIBILITY.PRIVATE ? generateCode() : null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      title,
      description,
      contentType,
      visibility,
      scheduleNow,
      code: joinCode || null,
      videoUrl, // NEW
      totalSeats, // NEW
    };
    if (!title.trim()) {
      setError("Give your room a title before you open the doors.");
      return;
    }
    setError("");
    setCreating(true);
    try {
      const { data: room } = await createLive({
        title,
        description,
        contentType,
        visibility,
        code: previewCode,
        scheduleNow,
      });
      navigate(`/host/${room.id}`, { state: room });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to create this room. Please try again.",
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="create-room-page">
      <div className="container container--narrow">
        <p className="create-room__eyebrow mono">SET THE SCENE</p>
        <h1 className="create-room__title">Host a Room</h1>
        <p className="create-room__sub">
          Configure your showing, pick who can walk in, and you're ready to
          start the stream.
        </p>

        <form className="create-room-form" onSubmit={handleSubmit}>
          <label className="cr-field">
            <span>Room title</span>
            <input
              type="text"
              placeholder="e.g. Friday Night Horror Double Feature"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label className="cr-field">
            <span>
              Description <em>(optional)</em>
            </span>
            <textarea
              placeholder="Tell people what they're walking into..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </label>

          <div className="cr-field">
            <span>What are you showing?</span>
            <div className="cr-pill-group">
              {Object.entries({
                [CONTENT_TYPES.MOVIE]: "Movie",
                [CONTENT_TYPES.SERIES]: "Web Series",
                [CONTENT_TYPES.SPORTS]: "Sports",
              }).map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={`cr-pill ${contentType === value ? "cr-pill--active" : ""}`}
                  onClick={() => setContentType(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="cr-field">
            <span>Who can walk in?</span>
            <div className="cr-visibility-group">
              <button
                type="button"
                className={`cr-visibility-card ${visibility === ROOM_VISIBILITY.PUBLIC ? "cr-visibility-card--active" : ""}`}
                onClick={() => setVisibility(ROOM_VISIBILITY.PUBLIC)}
              >
                <strong>🌐 Public</strong>
                <p>
                  Listed on the Marquee Board. Anyone can walk in and watch.
                </p>
              </button>
              <button
                type="button"
                className={`cr-visibility-card cr-visibility-card--violet ${visibility === ROOM_VISIBILITY.PRIVATE ? "cr-visibility-card--active" : ""}`}
                onClick={() => setVisibility(ROOM_VISIBILITY.PRIVATE)}
              >
                <strong>🔒 Private</strong>
                <p>
                  Hidden from the board. Guests need your invite code to enter.
                </p>
              </button>
            </div>
          </div>

          {visibility === ROOM_VISIBILITY.PRIVATE ? (
            <div className="cr-code-preview">
              <span>Your invite code will be</span>
              <strong className="mono">{previewCode}</strong>
            </div>
          ) : null}

          <div className="cr-field">
            {/* <span>When does it start?</span> */}
            <div className="cr-pill-group">
              <button
                type="button"
                className={`cr-pill ${scheduleNow ? "cr-pill--active" : ""}`}
                onClick={() => setScheduleNow(true)}
              >
                Start right now
              </button>
              {/* <button
                type="button"
                className={`cr-pill ${!scheduleNow ? 'cr-pill--active' : ''}`}
                onClick={() => setScheduleNow(false)}
              >
                Schedule for later
              </button> */}
            </div>
          </div>

          {error ? (
            <p className="cr-error" role="alert">
              {error}
            </p>
          ) : null}

          {contentType !== "live" && (
            <label className="host-form-field">
              <span>YouTube Video URL</span>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                required
              />
            </label>
          )}

          <label className="host-form-field">
            <span>Total seats</span>
            <input
              type="number"
              min="2"
              max="50"
              value={totalSeats}
              onChange={(e) => setTotalSeats(Number(e.target.value))}
            />
          </label>

          <Button type="submit" size="lg" fullWidth loading={creating} onClick={handleSubmit}>
            {"Open the Doors"}
          </Button>
        </form>
      </div>
    </div>
  );
}

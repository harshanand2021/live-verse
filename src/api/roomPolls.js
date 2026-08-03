// Prefix chosen to be printable and vanishingly unlikely to be typed by hand.
const POLL_MARKER = "[[lv-poll]]";

export const MAX_QUESTION_LENGTH = 120;
export const MAX_OPTION_LENGTH = 40;
export const MAX_OPTIONS = 4;
export const MIN_OPTIONS = 2;

// Only the host mints these, so a timestamp plus a little randomness is enough
// to keep two polls from the same room apart.
export function newPollId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function encodePollEvent(event) {
  return POLL_MARKER + JSON.stringify(event);
}

/**
 * Reads a poll event back out of a chat message's content, or null if this is
 * just somebody talking.
 */
export function decodePollEvent(content) {
  if (typeof content !== "string" || !content.startsWith(POLL_MARKER)) {
    return null;
  }
  try {
    const event = JSON.parse(content.slice(POLL_MARKER.length));
    if (!event || typeof event !== "object" || !event.id) return null;
    if (event.k !== "new" && event.k !== "vote" && event.k !== "end") return null;
    return event;
  } catch {
    // Someone typed something that starts like a marker but isn't one.
    return null;
  }
}

export function isPollEvent(content) {
  return decodePollEvent(content) !== null;
}

/** A poll payload sized to survive the chat `content` column. */
export function buildPollCreateEvent(question, options) {
  return {
    k: "new",
    id: newPollId(),
    q: question.trim().slice(0, MAX_QUESTION_LENGTH),
    o: options
      .map((option) => option.trim())
      .filter(Boolean)
      .slice(0, MAX_OPTIONS)
      .map((option) => option.slice(0, MAX_OPTION_LENGTH)),
  };
}

export const buildVoteEvent = (pollId, optionIndex) => ({
  k: "vote",
  id: pollId,
  i: optionIndex,
});

export const buildEndEvent = (pollId) => ({ k: "end", id: pollId });

/**
 * Folds the chat stream into poll state.
 *
 * Returns the polls in creation order plus `cardByIndex`, which maps the
 * position of each "poll created" message in `messages` to its poll — that's
 * what lets the chat list render a poll card exactly where it was posted.
 * Keyed by index rather than messageId because a locally-echoed message may not
 * have an id yet.
 */
export function derivePolls(messages, hostId) {
  const polls = [];
  const byId = new Map();
  const cardByIndex = new Map();
  const host = hostId == null ? null : String(hostId);

  messages.forEach((message, index) => {
    const event = decodePollEvent(message?.content);
    if (!event) return;

    const sender = message.senderId == null ? null : String(message.senderId);

    if (event.k === "new") {
      // Polls are the host's to run. A viewer who pastes the envelope by hand
      // gets ignored rather than trusted.
      if (host && sender !== host) return;
      if (byId.has(event.id)) return;

      const options = (Array.isArray(event.o) ? event.o : [])
        .slice(0, MAX_OPTIONS)
        .map((option) => String(option).slice(0, MAX_OPTION_LENGTH));
      if (options.length < MIN_OPTIONS) return;

      const poll = {
        id: event.id,
        question: String(event.q || "").slice(0, MAX_QUESTION_LENGTH),
        options,
        createdBy: sender,
        createdByName: message.senderDisplayName || "Host",
        createdAt: message.timestamp,
        closed: false,
        votes: new Map(), // voterId -> option index
      };

      polls.push(poll);
      byId.set(poll.id, poll);
      cardByIndex.set(index, poll);
      return;
    }

    const poll = byId.get(event.id);
    if (!poll) return; // a vote for a poll we never saw created

    if (event.k === "vote") {
      if (poll.closed || !sender) return;
      const optionIndex = Number(event.i);
      if (
        !Number.isInteger(optionIndex) ||
        optionIndex < 0 ||
        optionIndex >= poll.options.length
      ) {
        return;
      }
      // One vote per person, last one wins — changing your mind is allowed
      // while the poll is open.
      poll.votes.set(sender, optionIndex);
    } else if (event.k === "end") {
      if (host && sender !== host) return;
      poll.closed = true;
    }
  });

  return { polls, cardByIndex };
}

export function tallyPoll(poll) {
  const counts = poll.options.map(() => 0);
  poll.votes.forEach((optionIndex) => {
    counts[optionIndex] += 1;
  });

  const total = poll.votes.size;
  return {
    counts,
    total,
    percents: counts.map((count) =>
      total ? Math.round((count / total) * 100) : 0,
    ),
  };
}

/** The poll a voter is currently being asked about: the newest one still open. */
export function findActivePoll(polls) {
  for (let i = polls.length - 1; i >= 0; i -= 1) {
    if (!polls[i].closed) return polls[i];
  }
  return null;
}

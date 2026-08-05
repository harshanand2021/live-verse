// CreatePollRequest: @Size(min = 2, max = 10) on options.
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 10;

export const MAX_QUESTION_LENGTH = 200;
export const MAX_OPTION_LENGTH = 50;

export const VOTED_UNKNOWN = "?";

/** PollEvent payload → the shape the cards render. */
export function normalizePoll(payload) {
  if (!payload || payload.pollId == null) return null;

  const options = (Array.isArray(payload.options) ? payload.options : []).map(
    (option) => ({
      optionId: String(option.optionId),
      optionTitle: String(option.optionTitle ?? ""),
      voteCount: Number(option.voteCount) || 0,
    }),
  );

  const totalVotes = options.reduce((sum, option) => sum + option.voteCount, 0);
  const closed = payload.status === "CLOSED";

  return {
    pollId: String(payload.pollId),
    title: String(payload.title ?? ""),
    status: closed ? "CLOSED" : "OPEN",
    closed,
    options,
    totalVotes,
    percents: options.map((option) =>
      totalVotes ? Math.round((option.voteCount / totalVotes) * 100) : 0,
    ),
  };
}

/**
 * Fold a poll event into the room's list of polls.
 *
 * Every event carries the poll's whole current state, so the newest one simply
 * replaces what we had. Order is arrival order, which for a room that only ever
 * runs one poll at a time is also creation order.
 */
export function upsertPoll(polls, poll) {
  if (!poll) return polls;

  const index = polls.findIndex((existing) => existing.pollId === poll.pollId);
  if (index === -1) return [...polls, poll];

  const next = polls.slice();
  next[index] = poll;
  return next;
}

/** The poll the room is being asked about right now: the newest one still open. */
export function findActivePoll(polls) {
  for (let i = polls.length - 1; i >= 0; i -= 1) {
    if (!polls[i].closed) return polls[i];
  }
  return null;
}

/** Trim a host's draft to what Core will actually accept. */
export function buildPollCreatePayload(question, options) {
  return {
    title: question.trim().slice(0, MAX_QUESTION_LENGTH),
    options: options
      .map((option) => option.trim())
      .filter(Boolean)
      .slice(0, MAX_OPTIONS)
      .map((option) => option.slice(0, MAX_OPTION_LENGTH)),
  };
}

const voteStoreKey = (userId) => `lv:poll-votes:${userId}`;
const MAX_REMEMBERED_VOTES = 50;

export function readMyVotes(userId) {
  if (userId == null) return {};
  try {
    const stored = JSON.parse(localStorage.getItem(voteStoreKey(userId)));
    return stored && typeof stored === "object" ? stored : {};
  } catch {
    return {};
  }
}

export function writeMyVotes(userId, votes) {
  // Polls are short-lived; keeping the tail stops this growing without bound.
  const trimmed = Object.fromEntries(
    Object.entries(votes).slice(-MAX_REMEMBERED_VOTES),
  );
  if (userId == null) return trimmed;

  try {
    localStorage.setItem(voteStoreKey(userId), JSON.stringify(trimmed));
  } catch {
    // Private mode, or the quota is full. The in-memory copy still carries
    // this session; only surviving a reload is lost.
  }
  return trimmed;
}



export const isPollError = (message) =>
  typeof message === "string" && /\bpolls?\b|\bvote/i.test(message);

/** Core's one-vote-per-poll rule, which tells us we voted but not for what. */
export const isAlreadyVotedError = (message) =>
  typeof message === "string" && /already voted/i.test(message);

const GENERIC_POLL_ERRORS = {
  "Failed to create poll":
    "Couldn't start the poll. If one is already running, end it first.",
  "Failed to cast vote":
    "Couldn't record your vote — you may have already voted, or the poll just closed.",
  "Failed to close poll": "Couldn't close the poll. It may already be closed.",
};

export const describePollError = (message) =>
  GENERIC_POLL_ERRORS[message] || message || "Poll action failed.";

const LEGACY_POLL_MARKER = "[[lv-poll]]";
export const isLegacyPollMessage = (content) =>
  typeof content === "string" && content.startsWith(LEGACY_POLL_MARKER);

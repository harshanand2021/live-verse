import { VOTED_UNKNOWN } from "../api/roomPolls";
import "./styles/PollCard.css";

export default function PollCard({
  poll,
  myVote,
  isHost,
  onVote,
  onClose,
  pending = false,
}) {
  const { options, percents, totalVotes } = poll;
  const hasVoted = myVote != null;
  // Results stay hidden until you've had your say, so the first few votes don't
  // sway the room. The host sees them live — they're the one running the poll.
  const showResults = poll.closed || hasVoted || isHost;
  const winning =
    poll.closed && totalVotes > 0
      ? Math.max(...options.map((option) => option.voteCount))
      : -1;

  return (
    <section
      className={`poll-card ${poll.closed ? "poll-card--closed" : ""}`}
      aria-label={`Poll: ${poll.title}`}
    >
      <header className="poll-card__head">
        <span className="poll-card__tag mono">
          {poll.closed ? "POLL CLOSED" : "LIVE POLL"}
        </span>
        {isHost && !poll.closed ? (
          <button
            type="button"
            className="poll-card__end"
            onClick={() => onClose(poll)}
            disabled={pending}
          >
            End poll
          </button>
        ) : null}
      </header>

      <p className="poll-card__question">{poll.title}</p>

      <ul className="poll-card__options">
        {options.map((option, index) => {
          const selected = myVote === option.optionId;
          return (
            <li key={option.optionId}>
              <button
                type="button"
                className={`poll-option ${selected ? "poll-option--mine" : ""} ${
                  showResults ? "poll-option--result" : ""
                } ${
                  winning > 0 && option.voteCount === winning
                    ? "poll-option--winner"
                    : ""
                }`}
                onClick={() => onVote(poll, option)}
                // One vote per person, and it's final — Core rejects a second
                // one rather than replacing the first, so don't offer the click.
                disabled={poll.closed || hasVoted || pending}
                aria-pressed={selected}
              >
                {showResults ? (
                  <span
                    className="poll-option__fill"
                    style={{ width: `${percents[index]}%` }}
                    aria-hidden="true"
                  />
                ) : null}
                <span className="poll-option__label">
                  {selected ? (
                    <span className="poll-option__check" aria-hidden="true">
                      ✓
                    </span>
                  ) : null}
                  {option.optionTitle}
                </span>
                {showResults ? (
                  <span className="poll-option__pct mono">
                    {percents[index]}%
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      <footer className="poll-card__foot mono">
        <span>
          {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
        </span>
        <span>
          {poll.closed
            ? "Voting has ended"
            : myVote === VOTED_UNKNOWN
              ? "You've already voted in this poll"
              : hasVoted
                ? "Your vote is in"
                : "Pick one — you only get the one"}
        </span>
      </footer>
    </section>
  );
}

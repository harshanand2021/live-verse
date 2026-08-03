import { tallyPoll } from "../api/roomPolls";
import "./styles/PollCard.css";

export default function PollCard({ poll, myVote, isHost, onVote, onEnd }) {
  const { counts, total, percents } = tallyPoll(poll);
  const hasVoted = myVote != null;
  // Results stay hidden until you've had your say, so the first few votes don't
  // sway the room. The host sees them live — they're the one running the poll.
  const showResults = poll.closed || hasVoted || isHost;
  const winning = poll.closed && total > 0 ? Math.max(...counts) : -1;

  return (
    <section
      className={`poll-card ${poll.closed ? "poll-card--closed" : ""}`}
      aria-label={`Poll: ${poll.question}`}
    >
      <header className="poll-card__head">
        <span className="poll-card__tag mono">
          {poll.closed ? "POLL CLOSED" : "LIVE POLL"}
        </span>
        {isHost && !poll.closed ? (
          <button
            type="button"
            className="poll-card__end"
            onClick={() => onEnd(poll)}
          >
            End poll
          </button>
        ) : null}
      </header>

      <p className="poll-card__question">{poll.question}</p>

      <ul className="poll-card__options">
        {poll.options.map((option, index) => {
          const selected = myVote === index;
          return (
            <li key={index}>
              <button
                type="button"
                className={`poll-option ${selected ? "poll-option--mine" : ""} ${
                  showResults ? "poll-option--result" : ""
                } ${winning > 0 && counts[index] === winning ? "poll-option--winner" : ""}`}
                onClick={() => onVote(poll, index)}
                disabled={poll.closed}
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
                  {option}
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
          {total} {total === 1 ? "vote" : "votes"}
        </span>
        <span>
          {poll.closed
            ? "Voting has ended"
            : hasVoted
              ? "Tap another option to change your vote"
              : "Pick one"}
        </span>
      </footer>
    </section>
  );
}

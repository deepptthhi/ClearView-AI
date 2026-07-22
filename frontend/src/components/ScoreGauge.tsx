const SIZE = 150;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface ScoreGaugeProps {
  score: number;
  issues: number;
  affectedElements: number;
}

function colorForScore(score: number): string {
  if (score >= 90) return "var(--color-good)";
  if (score >= 70) return "var(--color-moderate)";
  if (score >= 40) return "var(--color-serious)";
  return "var(--color-critical)";
}

function rating(score: number) {
  if (score >= 90)
    return {
      label: "Excellent",
      color: "text-good",
      badge: "bg-green-100 text-green-700",
    };

  if (score >= 70)
    return {
      label: "Good",
      color: "text-moderate",
      badge: "bg-blue-100 text-blue-700",
    };

  if (score >= 40)
    return {
      label: "Fair",
      color: "text-serious",
      badge: "bg-yellow-100 text-yellow-700",
    };

  if (score >= 20)
    return {
      label: "Poor",
      color: "text-critical",
      badge: "bg-orange-100 text-orange-700",
    };

  return {
    label: "Critical",
    color: "text-critical",
    badge: "bg-red-100 text-red-700",
  };
}

function recommendation(score: number) {
  if (score >= 90)
    return "Excellent accessibility. Only minor refinements are required to maintain WCAG compliance.";

  if (score >= 70)
    return "Good accessibility. Resolve remaining Moderate and Minor issues to provide a better user experience.";

  if (score >= 40)
    return "Focus on Serious issues first before Moderate ones. Addressing them will significantly improve accessibility.";

  return "Critical accessibility issues detected. Resolve Critical and Serious violations immediately before release.";
}

export function ScoreGauge({
  score,
  issues,
  affectedElements,
}: ScoreGaugeProps) {
  const offset =
    CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;

  const color = colorForScore(score);
  const currentRating = rating(score);

  return (
    <div className="rounded-2xl border border-ink-line bg-ink-raised p-7 shadow-sm transition-all duration-300 hover:shadow-lg">

      <div className="flex items-center gap-8">

        {/* Gauge */}

        <div className="flex-shrink-0">

          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            role="img"
            aria-label={`Accessibility score: ${score} out of 100`}
            className="drop-shadow-sm transition-transform duration-300 hover:scale-105"
          >
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="var(--color-ink-line)"
              strokeWidth={STROKE}
            />

            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={color}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              style={{
                transition:
                  "stroke-dashoffset .6s ease",
              }}
            />

            <text
              x="50%"
              y="46%"
              textAnchor="middle"
              className="fill-paper font-display text-4xl font-bold"
            >
              {score}
            </text>

            <text
              x="50%"
              y="64%"
              textAnchor="middle"
              className="fill-muted text-xs uppercase tracking-widest"
            >
              /100
            </text>
          </svg>

        </div>

        {/* Right */}

        <div className="flex-1">

          <p className="font-display text-sm font-semibold uppercase tracking-widest text-muted">
            Accessibility Health
          </p>

          <div className="mt-3 flex items-center gap-3">

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${currentRating.badge}`}
            >
              {currentRating.label}
            </span>

            <span className="text-sm text-muted">
              Based on WCAG issue severity.
            </span>

          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-ink-line bg-ink p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
              <p className="text-3xl font-bold text-paper">
                {issues}
              </p>

              <p className="mt-1 text-xs uppercase tracking-wide text-muted">
                Issues Found
              </p>
            </div>

            <div className="rounded-xl border border-ink-line bg-ink p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
              <p className="text-3xl font-bold text-paper">
                {affectedElements}
              </p>

              <p className="mt-1 text-xs uppercase tracking-wide text-muted">
                Affected Elements
              </p>
            </div>

            <div className="rounded-xl border border-ink-line bg-ink p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
              <p className={`text-2xl font-bold ${currentRating.color}`}>
                {currentRating.label}
              </p>

              <p className="mt-1 text-xs uppercase tracking-wide text-muted">
                Accessibility Rating
              </p>
            </div>

            <div className="rounded-xl border border-ink-line bg-ink p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
              <p className="text-2xl font-bold text-paper">
                {score >= 80
                  ? "Low"
                  : score >= 50
                    ? "Medium"
                    : "High"}
              </p>

              <p className="mt-1 text-xs uppercase tracking-wide text-muted">
                Risk Level
              </p>
            </div>

          </div>

        </div>

      </div>

      <div className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">

        <div className="flex items-center gap-2">

          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
            🤖
          </div>

          <div>

            <p className="font-semibold text-paper">
              AI Recommendation
            </p>

            <p className="text-xs text-muted">
              Suggested next action based on scan results
            </p>

          </div>

        </div>

        <p className="mt-4 text-sm leading-7 text-muted">
          {recommendation(score)}
        </p>

      </div>

    </div>
  );
}
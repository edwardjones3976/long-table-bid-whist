export interface ScoreRailProps {
  contract: string;
  northSouth: number;
  eastWest: number;
  title?: string;
  contractLabel?: string;
  northSouthLabel?: string;
  eastWestLabel?: string;
  books?: number;
  booksLabel?: string;
  className?: string;
}
export function ScoreRail({
  contract,
  northSouth,
  eastWest,
  title = 'THE LONG TABLE',
  contractLabel = 'Your bid',
  northSouthLabel = 'North & South',
  eastWestLabel = 'East & West',
  books,
  booksLabel = 'Books',
  className = '',
}: ScoreRailProps) {
  return (
    <section className={`score-rail glass-surface ${className}`.trim()} aria-label="Score">
      <h1 className="score-rail__title">{title}</h1>
      <div className="score-rail__contract">
        <span>{contractLabel}</span>
        <strong>{contract}</strong>
      </div>
      <dl className="score-rail__teams">
        <div>
          <dt>{northSouthLabel}</dt>
          <dd>{northSouth}</dd>
        </div>
        <div>
          <dt>{eastWestLabel}</dt>
          <dd>{eastWest}</dd>
        </div>
        {books !== undefined ? (
          <div className="score-rail__books">
            <dt>{booksLabel}</dt>
            <dd>{books}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}

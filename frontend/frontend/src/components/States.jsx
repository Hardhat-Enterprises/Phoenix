import "./States.css";

export function LoadingState({ title, description, showSkeleton = true }) {
  return (
    <div
      className="interface-state interface-state--loading"
      role="status"
      aria-live="polite"
    >
      <div className="interface-state__spinner" aria-hidden="true" />
      <div className="interface-state__content">
        <h3>{title}</h3>
        <p>{description}</p>

        {showSkeleton && (
          <div className="interface-state__skeletons" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ title, description, actionLabel, onAction }) {
  return (
    <div
      className="interface-state interface-state--empty"
      role="status"
      aria-live="polite"
    >
      <div className="interface-state__content">
        <h3>{title}</h3>
        <p>{description}</p>

        {actionLabel && onAction && (
          <button
            type="button"
            className="btn btn-primary interface-state__button"
            onClick={onAction}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = "Retry",
}) {
  return (
    <div
      className="interface-state interface-state--error"
      role="alert"
      aria-live="assertive"
    >
      <div className="interface-state__content">
        <h3>{title}</h3>
        <p>{description}</p>

        {onRetry && (
          <button
            type="button"
            className="btn btn-primary interface-state__button"
            onClick={onRetry}
          >
            {retryLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export function AuthenticationState({
  title,
  description,
  actionLabel = "Sign in",
  onAction,
}) {
  return (
    <div
      className="interface-state interface-state--auth"
      role="status"
      aria-live="polite"
    >
      <div className="interface-state__content">
        <h3>{title}</h3>
        <p>{description}</p>

        {onAction && (
          <button
            type="button"
            className="btn btn-primary interface-state__button"
            onClick={onAction}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export function OfflineState({
  title,
  description,
  onRetry,
  retryLabel = "Retry connection",
}) {
  return (
    <div
      className="interface-state interface-state--offline"
      role="status"
      aria-live="polite"
    >
      <div className="interface-state__content">
        <h3>{title}</h3>
        <p>{description}</p>

        {onRetry && (
          <button
            type="button"
            className="btn btn-primary interface-state__button"
            onClick={onRetry}
          >
            {retryLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export function RetryButton({ label = "Retry", onClick }) {
  return (
    <button type="button" className="btn interface-state__button" onClick={onClick}>
      {label}
    </button>
  );
}

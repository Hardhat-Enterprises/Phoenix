import "./ErrorFallback.css";

function ErrorFallback() {
  const handleRetry = () => {
    window.location.reload();
  };

  const handleReturnToDashboard = () => {
    window.location.assign("/");
  };

  return (
    <main className="error-fallback" role="alert">
      <div className="error-fallback__card">
        <p className="error-fallback__brand">PHOENIX</p>

        <h1>Something went wrong</h1>

        <p>
          Phoenix could not display this page. Please try again or return to
          the dashboard.
        </p>

        <div className="error-fallback__actions">
          <button type="button" onClick={handleRetry}>
            Try Again
          </button>

          <button type="button" onClick={handleReturnToDashboard}>
            Return to Dashboard
          </button>
        </div>
      </div>
    </main>
  );
}

export default ErrorFallback;
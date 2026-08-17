import "./NotFound.css";

function NotFound() {
  const handleReturnToDashboard = () => {
    window.location.assign("/");
  };

  return (
    <main className="not-found">
      <div className="not-found__content">
        <p className="not-found__code">404</p>

        <h1>Page not found</h1>

        <p>The page you requested does not exist or may have moved.</p>

        <button type="button" onClick={handleReturnToDashboard}>
          Return to Dashboard
        </button>
      </div>
    </main>
  );
}

export default NotFound;
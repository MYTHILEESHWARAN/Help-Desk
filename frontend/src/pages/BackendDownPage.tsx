export function BackendDownPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="text-5xl">🔌</div>
        <h1 className="text-2xl font-semibold">Backend unavailable</h1>
        <p className="text-muted-foreground">
          The API server is not responding. Please check that the backend is
          running and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLogs, ensureAuth } from '@/store/trackerSlice';
import { Loader2, AlertCircle } from 'lucide-react';
import type { AppDispatch, RootState } from '@/store/store';
import { useIsAuthenticated } from '@/lib/useIsAuthenticated';
import { SignInPrompt } from '@/components/SignInPrompt';

function wellbeingStatus(index: number): { color: string; text: string } {
  // Backend scale: 0–10, higher = healthier (lower risk)
  if (index <= 3.5) {
    return {
      color: 'bg-red-100 text-red-800 border-red-200',
      text: 'High risk — please take a moment for self-care today.',
    };
  }
  if (index <= 6.5) {
    return {
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      text: 'Moderate risk — try to stay hydrated and rest.',
    };
  }
  return {
    color: 'bg-green-100 text-green-800 border-green-200',
    text: "You're doing great — keep up the good habits!",
  };
}

const MOOD_LABELS: Record<number, string> = {
  1: 'Calm',
  2: 'Good',
  3: 'Okay',
  4: 'Anxious',
  5: 'Very anxious',
};

export function DashboardPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { logs, status, latestPrediction, predictionLabel, insights, error } = useSelector(
    (state: RootState) => state.tracker
  );
  const isSignedIn = useIsAuthenticated();

  useEffect(() => {
    if (!isSignedIn) return;
    dispatch(ensureAuth()).then((result) => {
      if (ensureAuth.fulfilled.match(result)) {
        dispatch(fetchLogs());
      }
    });
  }, [dispatch, isSignedIn]);

  if (!isSignedIn) {
    return (
      <SignInPrompt
        title="Sign in to see your dashboard"
        body="Your wellness trends are tied to your account. Sign in to view them."
      />
    );
  }

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-brand mb-4" />
        <h3 className="text-xl font-semibold text-text-primary">Loading Wellness Data</h3>
        <p className="text-text-secondary mt-2">Fetching your check-in history…</p>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
        <h3 className="text-xl font-semibold text-text-primary">Could not load data</h3>
        <p className="text-text-secondary mt-2">{error ?? 'Something went wrong.'}</p>
        <button
          type="button"
          onClick={() => dispatch(ensureAuth()).then(() => dispatch(fetchLogs()))}
          className="mt-4 rounded-xl bg-brand px-6 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Retry
        </button>
      </div>
    );
  }

  const wellbeingIndex = latestPrediction?.predicted_stress_index;
  const hasPrediction = wellbeingIndex != null;
  const { color: statusColor, text: statusText } = hasPrediction
    ? wellbeingStatus(wellbeingIndex)
    : { color: 'bg-white border-gray-100', text: '' };

  return (
    <div className="px-6 py-12 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-text-primary">Your Wellness Dashboard</h1>

      {latestPrediction ? (
        <div className={`p-6 rounded-2xl border ${statusColor} mb-8`}>
          <h2 className="text-xl font-semibold mb-2">Latest Check-In</h2>
          {hasPrediction ? (
            <>
              <p className="mb-2">{statusText}</p>
              {predictionLabel && (
                <p className="text-sm capitalize mb-2 opacity-80">
                  Status: {predictionLabel.replace(/_/g, ' ')}
                </p>
              )}
              <div className="flex items-center gap-4 text-sm font-medium opacity-80">
                <span>Well-being Index: {wellbeingIndex.toFixed(1)} / 10</span>
                <span>Date: {latestPrediction.log_date}</span>
              </div>
            </>
          ) : (
            <p className="text-text-secondary">
              Check-in saved for {latestPrediction.log_date}. ML predictions will appear once the model is trained.
            </p>
          )}
          {insights.length > 0 && (
            <ul className="mt-4 space-y-2 text-sm">
              {insights.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 mb-8">
          <p className="text-text-secondary">
            No check-ins yet. Take your first daily check-in to see insights!
          </p>
        </div>
      )}

      <h2 className="text-2xl font-bold mb-4 text-text-primary">Recent Logs</h2>
      {logs.length > 0 ? (
        <div className="grid gap-4">
          {[...logs].reverse().map((log) => (
            <div
              key={log.id}
              className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 flex justify-between items-center"
            >
              <div>
                <p className="font-semibold">{log.log_date}</p>
                <p className="text-sm text-text-secondary">
                  Mood: {MOOD_LABELS[log.mood_score] ?? log.mood_score} · Sleep: {log.sleep_hours}h
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium">
                  Index:{' '}
                  {log.predicted_stress_index != null
                    ? Number(log.predicted_stress_index).toFixed(1)
                    : 'N/A'}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-text-secondary">Your history will appear here.</p>
      )}
    </div>
  );
}

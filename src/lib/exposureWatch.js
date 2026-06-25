export function sendExposureEvent() {
  const apiUrl = import.meta.env.VITE_EXPOSUREWATCH_API_URL;

  if (!apiUrl || typeof window === 'undefined') {
    return;
  }

  fetch(`${apiUrl}/api/collect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    keepalive: true,
    body: JSON.stringify({
      path: window.location.pathname,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      language: navigator.language,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      timestamp: new Date().toISOString(),
    }),
  }).catch(() => {
    // Monitoring must never break the portfolio UI.
  });
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function sanitizeCoordinates(latitude: unknown, longitude: unknown) {
  const lat = typeof latitude === 'number' ? latitude : Number(latitude);
  const lng = typeof longitude === 'number' ? longitude : Number(longitude);

  const hasFinite = Number.isFinite(lat) && Number.isFinite(lng);
  if (!hasFinite) {
    return { latitude: null, longitude: null };
  }

  const isWithinBounds = lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  const isLikelyNullIsland = Math.abs(lat) < 0.05 && Math.abs(lng) < 0.05;

  if (!isWithinBounds || isLikelyNullIsland) {
    return { latitude: null, longitude: null };
  }

  return { latitude: lat, longitude: lng };
}

export function parseDurationMinutes(durationValue: string): number {
  const value = durationValue.toLowerCase().trim();
  if (!value) return 90;

  const hourMatch = value.match(/(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)/);
  const minuteMatch = value.match(/(\d+)\s*(m|min|mins|minute|minutes)/);

  const hours = hourMatch ? Number(hourMatch[1]) : 0;
  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;
  const combined = Math.round(hours * 60 + minutes);
  if (combined > 0) return Math.max(20, Math.min(240, combined));

  const numericOnly = Number(value.replace(/[^0-9]/g, ''));
  if (Number.isFinite(numericOnly) && numericOnly > 0) {
    return Math.max(20, Math.min(240, numericOnly));
  }

  return 90;
}

export function getExpectedShotRange(durationMinutes: number) {
  if (durationMinutes <= 35) return { min: 5, max: 8 };
  if (durationMinutes <= 60) return { min: 7, max: 11 };
  if (durationMinutes <= 90) return { min: 9, max: 14 };
  return { min: 12, max: 18 };
}

// Per-process abuse protection, not a billing cap. No applicant data is retained.
// One Railway instance admits at most two concurrent generations and 30/hour.
export function createGenerationLimiter({ maxConcurrent = 2, maxPerHour = 30, now = Date.now } = {}) {
  let active = 0;
  const starts = [];
  return function acquire() {
    const time = now();
    while (starts.length && starts[0] <= time - 3600000) starts.shift();
    if (active >= maxConcurrent || starts.length >= maxPerHour) return null;
    starts.push(time);
    active++;
    let released = false;
    return { release() { if (!released) { active--; released = true; } } };
  };
}

export const acquireGeneration = createGenerationLimiter();

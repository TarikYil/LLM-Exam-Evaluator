export function getRunsRaw(): any[] {
  try { return JSON.parse(localStorage.getItem("assess_runs") || "[]"); } catch { return []; }
}

export function getRunsDedup(): any[] {
  const raw = getRunsRaw();
  const seen = new Set<string>();
  const dedup: any[] = [];
  for (const r of raw) {
    const key = (r.student_name || r.job_id) as string;
    if (!seen.has(key)) { dedup.push(r); seen.add(key); }
  }
  return dedup;
}

export const palette = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16", "#fb7185"];

export function clearRuns() {
  try { localStorage.removeItem("assess_runs"); } catch {}
}



const API_URL = process.env.NEXT_PUBLIC_API_URL;
export async function startAssessment(student: File, key: File): Promise<{ job_id: string }> {
  const formData = new FormData();
  formData.append("student_pdf", student);
  formData.append("answer_key", key);
  const res = await fetch(`${API_URL}/api/assess`, { method: "POST", body: formData });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export type AssessRun = {
  job_id: string;
  created_at: number;
  student_name?: string;
  progress: any[];
  summary?: any;
};

export const storage = {
  getRuns(): AssessRun[] {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("assess_runs") || "[]"); } catch { return []; }
  },
  saveRun(run: AssessRun) {
    if (typeof window === "undefined") return;
    let runs = this.getRuns();
    // Önce aynı job_id varsa güncelle
    const byJob = runs.findIndex(r => r.job_id === run.job_id);
    if (byJob >= 0) {
      runs[byJob] = run;
    } else {
      // Aynı öğrenci adından varsa en yenisiyle değiştir
      if (run.student_name) {
        runs = runs.filter(r => r.student_name !== run.student_name);
      }
      runs.unshift(run);
    }
    localStorage.setItem("assess_runs", JSON.stringify(runs.slice(0, 100)));
  }
};

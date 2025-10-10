import { useMemo, useState } from "react";
import { startAssessment } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import type { WsMessage, ProgressMessage, SummaryMessage } from "@/types";

export function useAssessment() {
  const [jobId, setJobId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const { messages, connected } = useWebSocket(jobId);

  const progress = useMemo(() => messages.filter(m => m.type === "progress") as ProgressMessage[], [messages]);
  const summary = useMemo(() => (messages.find(m => m.type === "summary") as SummaryMessage | undefined)?.payload, [messages]);

  async function assess(student: File, key: File) {
    setError(undefined);
    setLoading(true);
    try {
      const res = await startAssessment(student, key);
      setJobId(res.job_id);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return { assess, loading, error, jobId, connected, progress, summary };
}

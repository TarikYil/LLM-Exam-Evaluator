import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BACKEND_URL } from "@/lib/config";
import type { WsMessage, ProgressMessage } from "@/types";
import { storage } from "@/lib/api";

type UseWebSocketOptions = {
  urlOverride?: string;
  autoReconnect?: boolean;
  reconnectAttempts?: number;
  reconnectIntervalMs?: number;
  clearOnNewJob?: boolean;
  onMessage?: (msg: WsMessage) => void;
};

export function useWebSocket(jobId?: string, opts: UseWebSocketOptions = {}) {
  const {
    urlOverride,
    autoReconnect = true,
    reconnectAttempts = 10,
    reconnectIntervalMs = 1500,
    clearOnNewJob = true,
    onMessage,
  } = opts;

  const [messages, setMessages] = useState<WsMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const wsRef = useRef<WebSocket | null>(null);
  const attemptsRef = useRef(0);
  const pingTimerRef = useRef<number | undefined>(undefined);

  const url = useMemo(() => {
    if (!jobId) return undefined;
    const base = urlOverride || BACKEND_URL;
    return base.replace(/^http/, "ws") + `/ws/assess/${jobId}`;
  }, [jobId, urlOverride]);

  const cleanup = useCallback(() => {
    if (pingTimerRef.current) {
      window.clearInterval(pingTimerRef.current);
      pingTimerRef.current = undefined;
    }
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  const connect = useCallback(() => {
    if (!url) return;
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setError(undefined);
        attemptsRef.current = 0;
        // Keep-alive ping (server tarafı yoksayabilir, zararsız)
        pingTimerRef.current = window.setInterval(() => {
          try { ws.send("ping"); } catch {}
        }, 20000);
      };

      ws.onclose = () => {
        setConnected(false);
        if (autoReconnect && attemptsRef.current < reconnectAttempts) {
          attemptsRef.current += 1;
          const delay = reconnectIntervalMs * attemptsRef.current;
          window.setTimeout(connect, delay);
        }
      };

      ws.onerror = () => {
        setConnected(false);
        setError("WebSocket bağlantı hatası");
      };

      ws.onmessage = (e) => {
        try {
          const msg: WsMessage = JSON.parse(e.data);
          setMessages((prev) => {
            const next = [...prev, msg];
            // Persist last run for reports
            try {
              const job = (msg as any).job_id as string;
              if (job) {
                const progress = next.filter((m): m is ProgressMessage => m.type === "progress");
                const summary = next.find(m => m.type === "summary");
                const studentName = progress[0]?.payload.student_name;
                storage.saveRun({ job_id: job, created_at: Date.now(), student_name: studentName, progress, summary: (summary as any)?.payload });
              }
            } catch {}
            return next;
          });
          onMessage?.(msg);
        } catch (err) {
          // yutulur
        }
      };
    } catch (e: any) {
      setError(e?.message || String(e));
      setConnected(false);
    }
  }, [url, autoReconnect, reconnectAttempts, reconnectIntervalMs, onMessage]);

  useEffect(() => {
    if (!jobId || !url) return;
    if (clearOnNewJob) setMessages([]);
    cleanup();
    connect();
    return () => cleanup();
  }, [jobId, url, clearOnNewJob, connect, cleanup]);

  const send = useCallback((data: string) => {
    try { wsRef.current?.send(data); } catch {}
  }, []);

  const reset = useCallback(() => {
    setMessages([]);
    setError(undefined);
    attemptsRef.current = 0;
  }, []);

  return { messages, connected, error, send, reset };
}

import type { SummaryMessage } from "@/types";

export default function SummaryCard({ payload }: { payload: SummaryMessage["payload"] }) {
  if (!payload) return null;
  const { total_score, average_score, strengths, weaknesses, overall_feedback, general_comment } = payload;
  return (
    <div className="panel">
      <h3>Özet</h3>
      <div>Toplam: <b>{total_score.toFixed(2)} / 100</b> &nbsp;|&nbsp; Ortalama: <b>{average_score.toFixed(2)}</b></div>
      <div style={{ marginTop: 6 }}>Güçlü Sorular: {strengths.length ? strengths.join(", ") : "-"}</div>
      <div style={{ marginTop: 6 }}>Zayıf Sorular: {weaknesses.length ? weaknesses.join(", ") : "-"}</div>
      <div style={{ marginTop: 6 }}><b>Genel Geri Bildirim:</b> {overall_feedback}</div>
      <div style={{ marginTop: 6 }}><b>Genel Analiz:</b> {general_comment}</div>
    </div>
  );
}

import type { ProgressMessage } from "@/types";

export default function ProgressItem({ msg }: { msg: ProgressMessage }) {
  const q = msg.payload;
  return (
    <div className="item">
      <div>
        <b>Soru {q.question_id}</b> — <span className="score">{q.normalized_score.toFixed(2)}</span>
        {q.student_name ? <> &nbsp;|&nbsp; <b>{q.student_name}</b></> : null}
      </div>
      {q.question_text ? <div className="muted" style={{ marginTop: 6 }}><b>Soru:</b> {q.question_text}</div> : null}
      <div style={{ marginTop: 6 }}>
        <div><b>Öğrenci:</b> {q.student_answer}</div>
        <div style={{ marginTop: 4 }}><b>Cevap Anahtarı:</b> {q.key_answer}</div>
      </div>
      {q.reasoning_tr ? <div style={{ marginTop: 6 }}><b>Model Yorumu:</b> {q.reasoning_tr}</div> : null}
      {q.tips_tr ? <div style={{ marginTop: 6 }}><b>Geliştirme Önerisi:</b> {q.tips_tr}</div> : null}
      {q.overall_comment ? <div style={{ marginTop: 6 }}><b>Genel Değerlendirme:</b> {q.overall_comment}</div> : null}
    </div>
  );
}

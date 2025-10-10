# jobs/assess_job.py  (dosya adın farklıysa aynı içerikle güncelle)
import asyncio
from typing import List, Dict
from helpers.ws_manager import ws_manager
from modules.grader_agent import grade_one
from modules.feedback_agent import build_summary

async def run_assessment_job(job_id: str, questions: List[Dict]):
    """
    Sıralı yayın: WebSocket'e daima soru numarası sırasıyla gönder.
    Tam metin: Öğrenci cevabı ve cevap anahtarı KESİLMEDEN gönderilir.
    """
    print(f"[DEBUG] 🚀 run_assessment_job started for job_id={job_id}")
    print(f"[DEBUG] Total questions received: {len(questions)}")

    total_questions = len(questions)
    results: List[Dict] = []

    # id → question lookup
    qmap = {str(q["question_id"]): q for q in questions}

    # Tüm görevleri başlat (paralel hesapla), ama yayını sıralı yap
    tasks = {
        str(q["question_id"]): asyncio.create_task(
            grade_one(
                str(q["question_id"]),
                q["student_answer"],
                q["key_answer"],
                q.get("question_text")
            )
        )
        for q in questions
    }
    print(f"[DEBUG] Created {len(tasks)} grading tasks for OpenAI evaluation.")

    try:
        # Sıralı yayın: 1..N sırayla bekle ve gönder
        for qid in sorted(tasks.keys(), key=lambda x: int(x)):
            res = await tasks[qid]  # {'question_id','score','turkish_reasoning','turkish_tips','overall_comment'}

            # Normalize (100’lük sistem)
            try:
                raw_score = float(res.get("score", 0.0))
            except Exception:
                raw_score = 0.0
            per_q = 100 / total_questions
            normalized_score = round((raw_score / 10.0) * per_q, 2)

            # Öğrenci/anahtar tam metin
            qref = qmap.get(qid, {})
            question_text = (qref.get("question_text") or "").strip()
            student_answer = (qref.get("student_answer") or "").strip()
            key_answer = (qref.get("key_answer") or "").strip()
            student_name = (qref.get("student_name") or "").strip()

            # Sonuç havuzu (summary için)
            result_row = {
                **res,
                "question_id": qid,
                "normalized_score": normalized_score,
                "question_text": question_text,
                "student_answer": student_answer,
                "key_answer": key_answer,
                "student_name": student_name,
            }
            results.append(result_row)

            print(f"[DEBUG] ✅ Q{qid}: score={raw_score} normalized={normalized_score}")

            # WebSocket: Soru → Öğrenci → Anahtar → Model Yorumu → Öneri → Genel
            await ws_manager.publish(job_id, {
                "type": "progress",
                "job_id": job_id,
                "payload": {
                    "question_id": qid,
                    "normalized_score": normalized_score,
                    "question_text": question_text,
                    "student_answer": student_answer,
                    "key_answer": key_answer,
                    "student_name": student_name,
                    "reasoning_tr": res.get("turkish_reasoning", ""),
                    "tips_tr": res.get("turkish_tips", ""),
                    "overall_comment": res.get("overall_comment", "")
                }
            })
            print(f"[DEBUG] 🛰️ WS progress sent for Q{qid}")

        # Nihai özet
        print("[DEBUG] 🧮 Building summary report...")
        summary = build_summary(results)
        print(f"[DEBUG] Summary: total={summary['total_score']} avg={summary['average_score']}")

        await ws_manager.publish(job_id, {
            "type": "summary",
            "job_id": job_id,
            "payload": summary
        })
        print("[DEBUG] 📊 WS summary sent.")

    except Exception as e:
        print(f"[ERROR] ❌ Exception during assessment: {e}")
        await ws_manager.publish(job_id, {
            "type": "error",
            "job_id": job_id,
            "payload": {"message": str(e)}
        })
    finally:
        await ws_manager.publish(job_id, {
            "type": "done",
            "job_id": job_id,
            "payload": {"message": "completed"}
        })
        await ws_manager.mark_done(job_id)
        print(f"[DEBUG] 🏁 Job {job_id} completed. Marked as done.")

from typing import List, Dict
from helpers.pdf_utils import (
    extract_text,
    chunk_by_questions,
    parse_student_pdf,
    parse_key_pdf,
)
from fastapi import UploadFile

def parse_student_and_key(student_pdf: UploadFile, key_pdf: UploadFile) -> List[Dict]:
    """
    Öğrenci ve cevap anahtarı PDF'lerini okur, sorulara göre eşleştirir.
    Soru metnini (question_text) öğrenci PDF'inden çıkarır ve ayrı alan olarak döner.
    Debug çıktıları: sayfa okuma, soru sayısı, eşleşme kontrolü.
    """
    print(f"[DEBUG] 📄 Starting parse_student_and_key()")
    print(f"[DEBUG] Student PDF: {student_pdf.filename}")
    print(f"[DEBUG] Key PDF: {key_pdf.filename}")

    # --- 1️⃣ Soru bazlı parçalama ve ayrıştırma (tek okuma) ---
    # Öğrenci PDF'inden soru metni ve öğrenci cevabını ayrı alanlar olarak al
    student_parsed = parse_student_pdf(student_pdf)
    key_parsed = parse_key_pdf(key_pdf)

    print(f"[DEBUG] Found {len(student_parsed)} student questions.")
    print(f"[DEBUG] Found {len(key_parsed)} key questions.")

    # Dict formatına dönüştür
    student_dict = {
        sp["question_id"]: {
            "question_text": sp.get("question_text", ""),
            "student_answer": sp.get("student_answer", ""),
            "student_name": sp.get("student_name", ""),
        }
        for sp in student_parsed
    }
    key_dict = {kp["question_id"]: kp for kp in key_parsed}

    # --- 3️⃣ Eşleşme ve birleştirme ---
    merged = []
    for qid, s_fields in student_dict.items():
        k_obj = key_dict.get(qid, {})
        k_text = k_obj.get("key_answer", "")
        if not k_text:
            print(f"[WARN] ⚠️ Key answer missing for Question {qid}")
        else:
            print(
                f"[DEBUG] ✅ Matched Question {qid}: student={len(s_fields.get('student_answer',''))} chars, key={len(k_text)} chars"
            )

        merged.append({
            "question_id": qid,
            # Öncelik: öğrenci PDF'inden soru metni; yoksa anahtardaki soru metni
            "question_text": (s_fields.get("question_text") or k_obj.get("question_text") or "").strip(),
            "student_answer": (s_fields.get("student_answer") or "").strip(),
            "key_answer": k_text.strip(),
            "student_name": (s_fields.get("student_name") or "").strip(),
        })

    # --- 3️⃣ Özet ---
    print(f"[DEBUG] 🔄 Total merged questions: {len(merged)}")
    if merged:
        print(f"[DEBUG] First merged example (Q{merged[0]['question_id']}):")
        print(f"  - Student preview: {merged[0]['student_answer'][:100].replace(chr(10),' ')} ...")
        print(f"  - Key preview: {merged[0]['key_answer'][:100].replace(chr(10),' ')} ...")

    print(f"[DEBUG] ✅ parse_student_and_key() completed.\n")
    return merged

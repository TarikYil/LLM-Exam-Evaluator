import io
import pdfplumber
from fastapi import UploadFile
from fastapi import HTTPException
from typing import List, Dict, Tuple
import re

def extract_text(uploaded_pdf: UploadFile) -> str:
    """
    PDF içeriğini sayfa sayfa okuyup birleştirir.
    Debug çıktıları: sayfa sayısı, karakter uzunlukları, ilk 200 karakter önizlemesi.
    """
    print(f"[DEBUG] Starting PDF text extraction: {uploaded_pdf.filename}")
    raw = uploaded_pdf.file.read()
    if not raw or not isinstance(raw, (bytes, bytearray)):
        raise HTTPException(status_code=400, detail=f"'{uploaded_pdf.filename}' okunamadı veya boş dosya.")
    # Basit PDF imza kontrolü
    if not raw.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail=f"'{uploaded_pdf.filename}' geçerli bir PDF değil.")

    try:
        with pdfplumber.open(io.BytesIO(raw)) as pdf:
            print(f"[DEBUG] Total pages found: {len(pdf.pages)}")
            texts = []
            for idx, page in enumerate(pdf.pages, start=1):
                t = page.extract_text() or ""
                print(f"[DEBUG] Page {idx}: extracted {len(t)} chars.")
                preview = t[:200].replace("\n", " ")
                print(f"[DEBUG] Page {idx} preview: {preview} ...")
                texts.append(t)
            combined = "\n".join(texts)
    except Exception as e:
        # pdfminer kaynaklı hataları kullanıcı dostu bir 400 mesajı olarak döndür
        raise HTTPException(status_code=400, detail=f"PDF çözümlenemedi: {uploaded_pdf.filename} ({e})")

    print(f"[DEBUG] Combined text length: {len(combined)} chars.")
    print(f"[DEBUG] Combined preview: {combined[:300].replace(chr(10), ' ')} ...")
    return combined
_NAME_RE = re.compile(r"^Ad[ıi]\s*Soyad[ıi]\s*:\s*(.+)$", re.IGNORECASE | re.MULTILINE)

def extract_student_name_from_text(text: str) -> str:
    """
    PDF metni içinden 'Adı Soyadı: ...' satırını yakalar ve adı döndürür.
    Bulunamazsa boş dize döner.
    """
    if not text:
        return ""
    m = _NAME_RE.search(text)
    if m:
        return (m.group(1) or "").strip()
    return ""



def chunk_by_questions(text: str) -> List[Dict]:
    """
    'Soru 1:', 'Soru 2:' gibi başlıklara göre metni böler.
    Debug çıktıları: bulunan soru başlıkları, parçaların uzunlukları.
    """
    print("[DEBUG] Splitting text into questions...")
    parts = re.split(r"(Soru\s+\d+[:\.])", text, flags=re.IGNORECASE)
    print(f"[DEBUG] Total parts after split: {len(parts)}")

    chunks = []
    cur_id = None
    buf = []

    for i, part in enumerate(parts):
        # Soru başlığı
        if re.match(r"Soru\s+\d+[:\.]", part, flags=re.IGNORECASE):
            if cur_id is not None and buf:
                content = "\n".join(buf).strip()
                chunks.append({"question_id": cur_id, "text": content})
                print(f"[DEBUG] Added chunk Q{cur_id}: {len(content)} chars.")
            cur_id = re.findall(r"\d+", part)[0]
            print(f"[DEBUG] Found question header: {part.strip()} (id={cur_id})")
            buf = []
        else:
            buf.append(part)

    if cur_id is not None and buf:
        content = "\n".join(buf).strip()
        chunks.append({"question_id": cur_id, "text": content})
        print(f"[DEBUG] Final chunk Q{cur_id}: {len(content)} chars.")

    print(f"[DEBUG] Total questions extracted: {len(chunks)}")
    for q in chunks:
        preview = q["text"][:100].replace("\n", " ")
        print(f"    ↳ Q{q['question_id']} preview: {preview} ...")

    return chunks


# ==========================================================
# 🔽 Yeni: Soru/Cevap ayırıcı ve PDF parser fonksiyonları
# ==========================================================

_SPLIT_RE = re.compile(r"\b(?:Cevap|Yanıt|Yanit)\s*[:\-–]\s*", re.IGNORECASE)

def split_student_q_and_answer(chunk_text: str) -> Tuple[str, str]:
    """
    '... ? Cevap: ...' metnini ikiye böler.
    'Cevap' yoksa tüm metni öğrenci cevabı olarak döndürür.
    """
    if not chunk_text:
        return "", ""
    # Başta yer alan kimlik satırlarını temizle (örn. "Adı Soyadı: ...")
    chunk_text = re.sub(r"^Ad[ıi]\s*Soyad[ıi]\s*:[^\n]*\n", "", chunk_text, flags=re.IGNORECASE)
    m = _SPLIT_RE.search(chunk_text)
    if m:
        q_text = chunk_text[:m.start()].strip()
        s_ans = chunk_text[m.end():].strip()
        return q_text, s_ans

    alt = re.search(r"\b(?:Cevap|Yanıt|Yanit)\b", chunk_text, flags=re.IGNORECASE)
    if alt:
        return chunk_text[:alt.start()].strip(), chunk_text[alt.end():].strip()

    # 1) İlk boş satırda bölmeyi dene (genelde soru metni paragrafı → boş satır → öğrenci cevabı)
    parts = re.split(r"\n\s*\n+", chunk_text, maxsplit=1)
    if len(parts) == 2:
        return parts[0].strip(), parts[1].strip()

    # 2) "Açıklayınız" ifadesinden sonra böl (soru direktifini soru metnine dahil et)
    acik_idx = None
    for token in ["Açıklayınız.", "Açıklayınız:", "Açıklayınız"]:
        m2 = re.search(re.escape(token), chunk_text, flags=re.IGNORECASE)
        if m2:
            acik_idx = m2.end()
            break
    if acik_idx:
        return chunk_text[:acik_idx].strip(), chunk_text[acik_idx:].strip()

    # 3) İlk soru işaretine kadar olan kısmı soru kabul et
    qm = re.search(r"\?(?:\s|$)", chunk_text)
    if qm:
        return chunk_text[:qm.end()].strip(), chunk_text[qm.end():].strip()

    # 4) Heuristik yoksa tamamını öğrenci cevabı kabul et
    return "", chunk_text.strip()


def parse_student_pdf(student_pdf: UploadFile) -> List[Dict]:
    """
    Öğrenci PDF'ini okur, her sorunun soru metnini ve cevabını ayırır.
    Dönen yapı: [{'question_id', 'question_text', 'student_answer'}]
    """
    text = extract_text(student_pdf)
    student_name = extract_student_name_from_text(text)
    chunks = chunk_by_questions(text)
    parsed = []
    for c in chunks:
        q_text, s_ans = split_student_q_and_answer(c["text"])
        parsed.append({
            "question_id": c["question_id"],
            "question_text": q_text,
            "student_answer": s_ans,
            "student_name": student_name
        })
    print(f"[DEBUG] Student PDF parsed into {len(parsed)} questions.")
    return parsed


def parse_key_pdf(key_pdf: UploadFile) -> List[Dict]:
    """
    Cevap anahtarı PDF'ini okur, her sorunun metninden mümkünse soru kısmını ve anahtar cevabı ayırır.
    Dönen yapı: [{'question_id', 'question_text', 'key_answer'}]
    """
    text = extract_text(key_pdf)
    chunks = chunk_by_questions(text)

    parsed: List[Dict] = []
    for c in chunks:
        raw = c["text"]
        # Anahtar metninde de 'Cevap' benzeri ayraç varsa soru/cevabı ayırmayı dene
        q_text, ans = split_student_q_and_answer(raw)
        if not q_text and raw:
            # Heuristik: ilk paragrafı soru kabul et, geri kalanı cevap
            parts = re.split(r"\n\n+", raw, maxsplit=1)
            if parts:
                q_text = parts[0].strip()
                ans = raw[len(parts[0]):].strip()

        parsed.append({
            "question_id": c["question_id"],
            "question_text": q_text,
            "key_answer": ans or raw
        })

    print(f"[DEBUG] Key PDF parsed into {len(parsed)} questions.")
    return parsed

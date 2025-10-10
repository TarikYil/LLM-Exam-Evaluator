# modules/grader_agent.py
import json
import re
from openai import AsyncOpenAI
from config import settings

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

def _force_json(s: str) -> dict:
    """
    Model bazen ```json ... ``` veya baş/sonunda metin ekleyebilir.
    Bu yardımcı, ilk { ile son } arasını çekip parse etmeyi dener.
    """
    if not s:
        return {}
    s = s.strip()
    # Kod bloğu temizliği
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*|\s*```$", "", s.strip(), flags=re.IGNORECASE)
    # İlk { ve son } arası
    m1 = s.find("{")
    m2 = s.rfind("}")
    if m1 != -1 and m2 != -1 and m2 > m1:
        s = s[m1:m2+1]
    try:
        return json.loads(s)
    except Exception as e:
        print(f"[ERROR] JSON parse error: {e}\n[RAW RESPONSE]: {s[:300]}...")
        return {}

async def grade_one(question_id: str, student_answer: str, key_answer: str, question_text: str | None = None) -> dict:
    """
    Her soruyu Türkçe değerlendirir ve JSON olarak döndürür.
    Dönen alanlar: score (0–10), turkish_reasoning, turkish_tips, overall_comment
    """
    prompt = f"""
    Sen deneyimli bir tarih öğretmenisin.
    Aşağıdaki öğrenci cevabını ve cevap anahtarını karşılaştırarak değerlendir.

    İstediğim format:
    - Cevabı 0–10 arası puanla değerlendir (float, örn: 7.5).
    - "turkish_reasoning": Öğrenci cevabının neden güçlü veya zayıf olduğunu açıklayan kısa ve net bir açıklama.
    - "turkish_tips": Geliştirme önerisi veya nasıl daha iyi olabileceğine dair bir ipucu.
    - "overall_comment": Bu soruya dair genel yargı ve performans özeti.

    Cevabını YALNIZCA GEÇERLİ JSON formatında döndür. Başka metin ekleme.

    JSON şablonu:
    {{
      "question_id": "{question_id}",
      "score": 0.0,
      "turkish_reasoning": "Kısa ama net açıklama.",
      "turkish_tips": "Geliştirme önerisi.",
      "overall_comment": "Genel yorum."
    }}

    [Soru Metni]
    {(question_text or '').strip()}

    [Cevap Anahtarı]
    {key_answer}

    [Öğrenci Cevabı]
{student_answer}
    """.strip()

    try:
        completion = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            response_format={"type": "json_object"}  # JSON zorunluluğu
        )

        raw = (completion.choices[0].message.content or "").strip()
        data = _force_json(raw)

        # 🔧 Emniyetli tip düzeltmeleri
        data["question_id"] = str(question_id)

        try:
            data["score"] = float(data.get("score", 0.0))
        except Exception:
            data["score"] = 0.0

        for field in ["turkish_reasoning", "turkish_tips", "overall_comment"]:
            val = data.get(field, "")
            if not isinstance(val, str):
                val = str(val)
            data[field] = val.strip()

        return data

    except Exception as e:
        print(f"[ERROR] Grading failed for question {question_id}: {e}")
        return {
            "question_id": str(question_id),
            "score": 0.0,
            "turkish_reasoning": f"⚠️ Model cevabı çözümlenemedi: {e}",
            "turkish_tips": "Değerlendirme sırasında hata oluştu.",
            "overall_comment": "Bu soru için genel değerlendirme üretilemedi."
        }

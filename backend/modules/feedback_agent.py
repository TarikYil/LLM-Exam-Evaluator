from typing import List, Dict

def build_summary(results: List[Dict]) -> Dict:
    """
    results içindeki her öğede 'normalized_score' (0–100 ölçeğinde soru payı),
    'turkish_reasoning', 'turkish_tips', 'overall_comment' gibi alanlar beklenir.

    Fonksiyon 100 üzerinden toplam puan, ortalama, güçlü ve zayıf soruları,
    ayrıca model yorumlarından derlenen genel analiz ve özet döndürür.
    """
    if not results:
        return {
            "total_score": 0.0,
            "average_score": 0.0,
            "strengths": [],
            "weaknesses": [],
            "overall_feedback": "Değerlendirme verisi bulunamadı.",
            "general_comment": "Herhangi bir soru işlenemedi."
        }

    # 100’lük toplam ve ortalama hesapla
    total = round(sum(r.get("normalized_score", 0.0) for r in results), 2)
    avg = round(total / len(results), 2)

    # Her sorunun tam puanı (örneğin 100/len)
    per_q_full = 100 / len(results)

    # Güçlü / zayıf soruların belirlenmesi
    strengths = [
        r["question_id"]
        for r in results
        if r.get("normalized_score", 0.0) >= 0.8 * per_q_full
    ]
    weaknesses = [
        r["question_id"]
        for r in results
        if r.get("normalized_score", 0.0) < 0.5 * per_q_full
    ]

    # Genel puan aralığına göre geri bildirim
    if total >= 85:
        feedback = "Öğrenci mükemmel bir kavrayış sergilemiş, açıklamalar tutarlı ve örneklerle desteklenmiş."
    elif total >= 70:
        feedback = "Genel kavrayış iyi, ancak bazı sorularda derinlik eksikliği ve örnek yetersizliği gözleniyor."
    elif total >= 50:
        feedback = "Temel kavramlar anlaşılmış, fakat ifadeler ve bağlantılar zayıf. Daha fazla örnekle desteklenmeli."
    else:
        feedback = "Zayıf performans; temel kavramların yeniden gözden geçirilmesi ve örnekli çalışma önerilir."

    # Modelin detaylı yorumlarından genel özet üretimi
    reasonings = [r.get("turkish_reasoning", "") for r in results if r.get("turkish_reasoning")]
    tips = [r.get("turkish_tips", "") for r in results if r.get("turkish_tips")]
    comments = [r.get("overall_comment", "") for r in results if r.get("overall_comment")]

    # Genel analiz — tüm yorumlardan birleştirilmiş kısa metin
    combined_text = " ".join(comments or reasonings or tips)
    if combined_text:
        general_comment = (
            f"Genel olarak öğrenci yanıtlarında şu temalar öne çıkıyor: "
            f"{combined_text}"
        )
    else:
        general_comment = "Model yorumlarından genel bir özet çıkarılamadı."

    # (isteğe bağlı) ham toplam 10 üzerinden
    raw_total_10 = round(sum((r.get("normalized_score", 0.0) / per_q_full) * 10 for r in results), 2)

    return {
        "total_score": total,           # 0–100
        "average_score": avg,           # soru başına ortalama
        "strengths": strengths,
        "weaknesses": weaknesses,
        "overall_feedback": feedback,   # performans seviyesi yorumu
        "general_comment": general_comment,  # model yorumlarından çıkarılan genel analiz
        "meta": {
            "questions": len(results),
            "per_question_full": round(per_q_full, 2),
            "raw_total_out_of_60": raw_total_10
        }
    }

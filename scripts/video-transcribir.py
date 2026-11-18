"""Transcribe un audio en español y guarda las palabras con sus tiempos (para subtítulos).

Uso: python scripts/video-transcribir.py <audio> <salida.json> [modelo]
Usa faster-whisper en CPU y solo modelos ya descargados (sin red).
"""
import json
import sys


def main() -> int:
    if len(sys.argv) < 3:
        sys.stderr.write("Uso: python scripts/video-transcribir.py <audio> <salida.json> [modelo]\n")
        return 2
    audio, salida = sys.argv[1], sys.argv[2]
    modelo = sys.argv[3] if len(sys.argv) > 3 else "small"
    from faster_whisper import WhisperModel

    whisper = WhisperModel(modelo, device="cpu", compute_type="int8", local_files_only=True)
    segmentos, _ = whisper.transcribe(
        audio,
        language="es",
        word_timestamps=True,
        vad_filter=True,
        beam_size=5,
        condition_on_previous_text=False,
    )
    palabras = []
    for segmento in segmentos:
        for palabra in segmento.words or []:
            texto = palabra.word.strip()
            if texto:
                palabras.append({"inicio": round(palabra.start, 2), "fin": round(palabra.end, 2), "texto": texto})
    with open(salida, "w", encoding="utf-8") as archivo:
        json.dump(palabras, archivo, ensure_ascii=False)
    return 0


if __name__ == "__main__":
    sys.exit(main())

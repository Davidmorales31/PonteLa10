import argparse
import json
import os
import shutil
import tempfile
from pathlib import Path

import imageio_ffmpeg
import yt_dlp
from faster_whisper import WhisperModel


def ejecutar(url: str, modelo: str) -> dict:
    carpeta = Path(tempfile.mkdtemp(prefix="pont3la10-tiktok-"))
    try:
        salida = str(carpeta / "audio.%(ext)s")
        opciones = {
            "format": "bestaudio/best",
            "outtmpl": salida,
            "noplaylist": True,
            "quiet": True,
            "no_warnings": True,
            "socket_timeout": 30,
            "retries": 1,
            "fragment_retries": 1,
            "restrictfilenames": True,
            "postprocessors": [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": "wav",
            }],
            "ffmpeg_location": imageio_ffmpeg.get_ffmpeg_exe(),
        }
        with yt_dlp.YoutubeDL(opciones) as descargador:
            info = descargador.extract_info(url, download=True)

        audio = next(carpeta.glob("audio.*"), None)
        if not audio:
            raise RuntimeError("No se pudo extraer el audio del video.")

        transcriptor = WhisperModel(modelo, device="cpu", compute_type="int8")
        segmentos, informacion = transcriptor.transcribe(
            str(audio), language="es", vad_filter=True
        )
        resultado = [
            {"inicio": round(segmento.start, 2), "fin": round(segmento.end, 2), "texto": segmento.text.strip()}
            for segmento in segmentos
            if segmento.text.strip()
        ]
        return {
            "videoId": info.get("id", ""),
            "duracion": info.get("duration"),
            "tituloFuente": info.get("title", ""),
            "autorFuente": info.get("uploader") or info.get("channel", ""),
            "transcripcion": resultado,
            "idioma": informacion.language,
            "modelo": modelo,
        }
    finally:
        shutil.rmtree(carpeta, ignore_errors=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("url")
    parser.add_argument("--modelo", default=os.getenv("PONT3LA10_WHISPER_MODEL", "base"))
    argumentos = parser.parse_args()
    print(json.dumps(ejecutar(argumentos.url, argumentos.modelo), ensure_ascii=False))

import argparse
import json
import os
import shutil
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import imageio_ffmpeg
import yt_dlp
from faster_whisper import WhisperModel


VERSION_CONTRATO = 1


def emitir(evento: dict) -> None:
    print(json.dumps(evento, ensure_ascii=False), flush=True)


class RegistroYtDlp:
    """Mantiene stdout reservado exclusivamente para eventos JSON del contrato."""

    @staticmethod
    def debug(mensaje: str) -> None:
        print(mensaje, file=sys.stderr, flush=True)

    @staticmethod
    def info(mensaje: str) -> None:
        print(mensaje, file=sys.stderr, flush=True)

    @staticmethod
    def warning(mensaje: str) -> None:
        print(mensaje, file=sys.stderr, flush=True)

    @staticmethod
    def error(mensaje: str) -> None:
        print(mensaje, file=sys.stderr, flush=True)


def construir_base(tipo: str, entrada: dict, secuencia: int) -> dict:
    return {
        "versionContrato": VERSION_CONTRATO,
        "tipo": tipo,
        "ingestaId": entrada["ingestaId"],
        "intentoId": entrada["intentoId"],
        "secuencia": secuencia,
    }


def emitir_progreso(entrada: dict, secuencia: int, etapa: str, porcentaje: int) -> None:
    evento = construir_base("progreso", entrada, secuencia)
    evento.update({"etapa": etapa, "progresoPorcentaje": porcentaje})
    emitir(evento)


def ejecutar(entrada: dict) -> dict:
    url = entrada["urlFuente"]
    modelo = entrada["modelo"]
    carpeta = Path(tempfile.mkdtemp(prefix="pont3la10-tiktok-"))
    try:
        emitir_progreso(entrada, 1, "reading_metadata", 5)
        salida = str(carpeta / "audio.%(ext)s")
        opciones = {
            "format": "bestaudio/best",
            "outtmpl": salida,
            "noplaylist": True,
            "quiet": True,
            "no_warnings": True,
            "noprogress": True,
            "logger": RegistroYtDlp(),
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

        duracion = info.get("duration")
        if not isinstance(duracion, (int, float)) or duracion <= 0:
            raise RuntimeError("No se pudo confirmar la duración del video.")
        if duracion > 180:
            raise RuntimeError("El video supera los 180 segundos permitidos.")

        emitir_progreso(entrada, 2, "downloading_audio", 30)
        audio = next(carpeta.glob("audio.*"), None)
        if not audio:
            raise RuntimeError("No se pudo extraer el audio del video.")

        emitir_progreso(entrada, 3, "transcribing", 45)
        transcriptor = WhisperModel(modelo, device="cpu", compute_type="int8")
        def transcribir(vad_filter: bool):
            segmentos, informacion = transcriptor.transcribe(
                str(audio), vad_filter=vad_filter
            )
            resultado = [
                {
                    "id": indice,
                    "inicioSegundos": round(segmento.start, 2),
                    "finSegundos": round(segmento.end, 2),
                    "texto": segmento.text.strip(),
                }
                for indice, segmento in enumerate(segmentos)
                if segmento.text.strip()
            ]
            return resultado, informacion

        resultado, informacion = transcribir(vad_filter=True)
        if not resultado:
            resultado, informacion = transcribir(vad_filter=False)
        if not resultado:
            raise RuntimeError("El video no produjo una transcripción utilizable.")

        idioma = informacion.language
        if idioma not in ("es", "en"):
            raise RuntimeError("El idioma detectado no está soportado para esta ingesta.")

        return {
            "metadatos": {
                "plataforma": "tiktok",
                "videoId": str(info.get("id", "")),
                "urlFuenteFinal": str(info.get("webpage_url") or url),
                "titulo": info.get("title") or None,
                "autor": info.get("uploader") or info.get("channel") or None,
                "creditos": f"Video original: {info.get('uploader') or info.get('channel') or 'autor de TikTok'}",
                "duracionSegundos": duracion,
                "consultadoEn": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            },
            "original": {
                "idioma": idioma,
                "modelo": modelo,
                "motor": "faster-whisper",
                "versionMotor": "runtime",
                "segmentos": resultado,
            },
            "limpieza": {"completada": True, "archivosTemporalesRestantes": 0},
        }
    finally:
        shutil.rmtree(carpeta, ignore_errors=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.parse_args()

    try:
        entrada = json.loads(sys.stdin.read())
        if entrada.get("versionContrato") != VERSION_CONTRATO:
            raise ValueError("Versión de contrato no soportada.")
        if entrada.get("operacion") != "transcribirTikTok":
            raise ValueError("Operación no soportada.")
        entrada.setdefault("modelo", os.getenv("PONT3LA10_WHISPER_MODEL", "base"))
        resultado = ejecutar(entrada)
        evento = construir_base("resultado", entrada, 4)
        evento["resultado"] = resultado
        emitir(evento)
    except Exception as error:
        try:
            entrada_error = entrada
        except NameError:
            entrada_error = {
                "ingestaId": "00000000-0000-4000-8000-000000000000",
                "intentoId": "00000000-0000-4000-8000-000000000000",
            }
        evento_error = construir_base("error", entrada_error, 1)
        evento_error["error"] = {
            "codigo": "TRANSCRIPTION_FAILED",
            "mensaje": str(error)[:300],
        }
        evento_error["limpieza"] = {"completada": True, "archivosTemporalesRestantes": 0}
        emitir(evento_error)
        raise SystemExit(1)

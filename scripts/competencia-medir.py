"""Mide a la competencia en YouTube con metadatos públicos (nada se descarga) y deja un resumen para comparar mes a mes.

Para cada canal de config/competenciaYoutube.json lee los últimos videos (vistas, duración, título) y calcula: mediana de
vistas, duración mediana, cuánto del total sale de sus 3 mejores videos, y cómo rinde cada formato y cada rasgo de título
frente a la mediana de SU propio canal (así un canal grande no tapa a uno pequeño).

Uso:   python scripts/competencia-medir.py [--shorts] [--salida docs/datos/competencia-AAAA-MM-DD.json]
       --shorts mide los Shorts de cada canal (la pestaña /shorts): vistas y títulos, sin pedir video por video, porque
       YouTube pide «confirmar que no eres un bot» si se piden cientos de videos seguidos (no se intenta saltar).
Requiere:  pip install yt-dlp   (solo lee metadatos; si falta, el script lo dice)
"""
import concurrent.futures
import datetime
import json
import pathlib
import re
import statistics
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent

FORMATOS = [
    ("documental/historia", r"documental|la historia de|historia de|la verdadera historia|biograf|\bvida de\b"),
    ("top/ranking/lista", r"\btop\b|\bmejores\b|\bpeores\b|ranking|\b\d{1,2} (jugadores|razones|cosas|equipos|futbolistas|goles|datos|errores)"),
    ("en vivo/directo", r"en vivo|\blive\b|directo"),
    ("previa/pronóstico/dónde ver", r"pron[oó]stico|predicci|d[oó]nde ver|donde ver|horario|alineaciones|\bprevia\b|c[oó]mo llegan|a qu[eé] hora"),
    ("tabla/cómo queda", r"\btabla\b|clasificaci|c[oó]mo queda|qu[eé] necesita|cruces|octavos|cuartos de final|semifinal|posiciones"),
    ("fichaje/mercado", r"ficha|fichaje|mercado|\bllega a\b|traspaso|contrato|renov|refuerzo|oferta"),
    ("polémica/escándalo", r"pol[eé]mic|esc[aá]ndalo|denuncia|expuls|\bvar\b|\brobo\b|bronca|pelea|insult|castigo|sanci"),
    ("reacción/debate", r"reacciona|reacci[oó]n|debate|mesa redonda|opin|programa|sin filtro|hablan"),
    ("análisis/táctico", r"an[aá]lisis|t[aá]ctic|por qu[eé]|c[oó]mo (jug|gan|perd|funciona)|explicad|el secreto|la clave"),
    ("curiosidades/datos", r"curiosidad|no sab[ií]as|secreto|incre[ií]ble|impresionante|datos"),
]
FORMATOS = [(nombre, re.compile(patron, re.I)) for nombre, patron in FORMATOS]
RASGOS = {
    "con ?": lambda t: "?" in t,
    "con |": lambda t: "|" in t,
    "con MAYÚSCULAS": lambda t: bool(re.search(r"\b[A-ZÁÉÍÓÚÑ]{4,}\b", t)),
    "con emoji": lambda t: bool(re.search(r"[\U0001F300-\U0001FAFF☀-➿]", t)),
    "con número": lambda t: bool(re.search(r"\d", t)),
    "título corto (<=45)": lambda t: len(t) <= 45,
    "título largo (>70)": lambda t: len(t) > 70,
}
FORMATOS_SHORTS = [
    ("top/lista", r"\btop\b|mejores|peores|ranking"),
    ("gol/jugada", r"\bgol\b|golazo|jugada|atajad|tapada|asistencia|penal"),
    ("curiosidad/sabías", r"sab[ií]as|curiosidad|secreto|nadie|incre[ií]ble|impresionante|ins[oó]lito|locura|loco"),
    ("fichaje/mercado", r"ficha|fichaje|mercado|llega a|traspaso|contrato|renov|oferta|se va|regresa"),
    ("emoción/humano", r"llor|emoci|sue[nñ]o|familia|madre|padre|l[aá]grima|despedida|homenaje|conmovedor"),
    ("vs/duelo", r"\bvs\b|versus|contra|duelo|cl[aá]sico"),
    ("récord/dato/cifra", r"r[eé]cord|hist[oó]ric|\d+ (goles|a[nñ]os|millones|t[ií]tulos|partidos)|nunca antes|primera vez"),
    ("pregunta (¿por qué/cómo?)", r"¿?(por qu[eé]|c[oó]mo|qu[eé] pas[oó]|cu[aá]l|qui[eé]n)"),
    ("polémica/escándalo", r"pol[eé]mic|esc[aá]ndalo|denuncia|expuls|\bvar\b|\brobo\b|bronca|pelea|insult|castigo|sanci|critic"),
    ("dicho/cita", r"dijo|declar|revel|confes|afirm|asegur|seg[uú]n|habl[oó]"),
]
FORMATOS_SHORTS = [(nombre, re.compile(patron, re.I)) for nombre, patron in FORMATOS_SHORTS]
mediana = lambda xs: statistics.median(xs) if xs else 0  # noqa: E731


def medir(canal, cuantos, yt_dlp):
    opciones = {"quiet": True, "extract_flat": True, "skip_download": True, "no_warnings": True, "playlistend": cuantos,
                "extractor_args": {"youtube": {"lang": ["es"]}}, "http_headers": {"Accept-Language": "es-419,es;q=0.9"}}
    try:
        with yt_dlp.YoutubeDL(opciones) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/channel/{canal['canal_id']}/videos", download=False)
    except Exception as error:  # noqa: BLE001
        print(f"[{canal['nombre']}] {error}", file=sys.stderr)
        return None
    videos = [e for e in info.get("entries", []) if e and e.get("view_count") is not None and (e.get("duration") or 0) > 61]
    return {**canal, "videos": [{"titulo": v.get("title") or "", "vistas": v["view_count"], "minutos": (v.get("duration") or 0) / 60} for v in videos]}


def medir_shorts(canal, cuantos, yt_dlp):
    opciones = {"quiet": True, "extract_flat": True, "skip_download": True, "no_warnings": True, "playlistend": cuantos,
                "extractor_args": {"youtube": {"lang": ["es"]}}, "http_headers": {"Accept-Language": "es-419,es;q=0.9"}}
    try:
        with yt_dlp.YoutubeDL(opciones) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/channel/{canal['canal_id']}/shorts", download=False)
    except Exception as error:  # noqa: BLE001
        print(f"[{canal['nombre']}] sin pestaña de Shorts o error: {str(error)[:80]}", file=sys.stderr)
        return None
    return {**canal, "shorts": [{"titulo": e.get("title") or "", "vistas": e["view_count"]} for e in info.get("entries", []) if e and e.get("view_count") is not None]}


def resumir_shorts(medidos, medianas_largos):
    canales, por_formato, por_rasgo = [], {}, {n: ([], []) for n in RASGOS}
    for c in medidos:
        vistas = [s["vistas"] for s in c["shorts"]]
        if len(vistas) < 8:
            continue
        m = mediana(vistas)
        largo = medianas_largos.get(c["nombre"])
        canales.append({"nombre": c["nombre"], "tipo": c["tipo"], "shorts": len(vistas), "medianaVistasShorts": m, "maximoVistas": max(vistas),
                        "parteDeLos3Mejores": round(sum(sorted(vistas, reverse=True)[:3]) / max(1, sum(vistas)), 2),
                        "shortsSobreLargos": round(m / largo, 2) if largo else None})
        if m < 3000:
            continue
        for s in c["shorts"]:
            relativo = s["vistas"] / m
            for nombre in [n for n, rx in FORMATOS_SHORTS if rx.search(s["titulo"])] or ["otros"]:
                por_formato.setdefault(nombre, []).append(relativo)
            for nombre, funcion in RASGOS.items():
                por_rasgo[nombre][0 if funcion(s["titulo"]) else 1].append(relativo)
    return {
        "canales": sorted(canales, key=lambda c: -c["medianaVistasShorts"]),
        "formatos": {n: {"shorts": len(l), "relativoMediana": round(mediana(l), 2), "masDe3x": round(sum(1 for r in l if r > 3) / len(l), 2)} for n, l in sorted(por_formato.items())},
        "rasgosDeTitulo": {n: {"con": round(mediana(c), 2), "sin": round(mediana(s), 2), "shortsCon": len(c)} for n, (c, s) in por_rasgo.items()},
    }


def resumir(medidos):
    canales, por_formato, por_rasgo = [], {}, {n: ([], []) for n in RASGOS}
    for c in medidos:
        vistas = [v["vistas"] for v in c["videos"]]
        if len(vistas) < 8:
            continue
        m = mediana(vistas)
        top3 = sum(sorted(vistas, reverse=True)[:3]) / max(1, sum(vistas))
        canales.append({"nombre": c["nombre"], "tipo": c["tipo"], "videos": len(vistas), "medianaVistas": m, "maximoVistas": max(vistas),
                        "medianaMinutos": round(mediana([v["minutos"] for v in c["videos"]]), 1), "parteDeLos3Mejores": round(top3, 2)})
        if m < 5000:
            continue
        for v in c["videos"]:
            relativo = v["vistas"] / m
            for nombre in [n for n, rx in FORMATOS if rx.search(v["titulo"])] or ["otros"]:
                por_formato.setdefault(nombre, []).append(relativo)
            for nombre, funcion in RASGOS.items():
                por_rasgo[nombre][0 if funcion(v["titulo"]) else 1].append(relativo)
    return {
        "canales": sorted(canales, key=lambda c: -c["medianaVistas"]),
        "formatos": {n: {"videos": len(l), "relativoMediana": round(mediana(l), 2), "masDe2x": round(sum(1 for r in l if r > 2) / len(l), 2)} for n, l in sorted(por_formato.items())},
        "rasgosDeTitulo": {n: {"con": round(mediana(c), 2), "sin": round(mediana(s), 2), "videosCon": len(c)} for n, (c, s) in por_rasgo.items()},
    }


def main():
    try:
        import yt_dlp
    except ImportError:
        sys.exit("Falta yt-dlp: ejecuta  pip install yt-dlp")
    config = json.loads((RAIZ / "config" / "competenciaYoutube.json").read_text(encoding="utf8"))
    hoy = datetime.date.today().isoformat()
    if "--shorts" in sys.argv:
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            medidos = [c for c in pool.map(lambda c: medir_shorts(c, config.get("videosPorCanal", 40), yt_dlp), config["canales"]) if c]
        previos = sorted((RAIZ / "docs" / "datos").glob("competencia-2*.json"))
        medianas = {c["nombre"]: c["medianaVistas"] for c in json.loads(previos[-1].read_text(encoding="utf8"))["canales"]} if previos else {}
        resumen = {"fecha": hoy, "shorts": True, **resumir_shorts(medidos, medianas)}
        sufijo = "competencia-shorts"
    else:
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            medidos = [c for c in pool.map(lambda c: medir(c, config.get("videosPorCanal", 40), yt_dlp), config["canales"]) if c]
        resumen = {"fecha": hoy, **resumir(medidos)}
        sufijo = "competencia"
    destino = pathlib.Path(sys.argv[sys.argv.index("--salida") + 1]) if "--salida" in sys.argv else RAIZ / "docs" / "datos" / f"{sufijo}-{resumen['fecha']}.json"
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(json.dumps(resumen, ensure_ascii=False, indent=2), encoding="utf8")
    print(f"{len(resumen['canales'])} canales medidos. Resumen: {destino}")
    for n, d in resumen["formatos"].items():
        cuantos = d.get("videos", d.get("shorts"))
        umbral = d.get("masDe2x", d.get("masDe3x"))
        print(f"  {n:30} n={cuantos:4d} relativo={d['relativoMediana']:.2f} mas-del-umbral={umbral * 100:.0f} %")


if __name__ == "__main__":
    main()

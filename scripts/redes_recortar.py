"""Recorta al protagonista de una foto (fondo transparente) con rembg, en el PC. Uso: python redes_recortar.py entrada salida.png"""
import sys
from PIL import Image
from rembg import new_session, remove

entrada, salida = sys.argv[1], sys.argv[2]
imagen = Image.open(entrada).convert('RGB')
imagen.thumbnail((1600, 1600))
recorte = remove(imagen, session=new_session('u2net'))
recorte.save(salida)

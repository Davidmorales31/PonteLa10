# Handoff

- **Objetivo de la sesión:** entregar 3 miniaturas del video diario 2026-11-21 mediante generador integrado, siguiendo preferencia expresa del responsable y skill local.
- **Completado:** A doble panel victoria/Grupo L con fotos 1/2; B collage con 2-1 y GANÓ A JAPÓN; C doble panel Grupo L/debut sin Abascal con fotos 2/3. Insumos originales intactos.
- **Archivos modificados:** videos/diario/2026-11-21/renders/miniaturas/miniatura-{a,b,c}.jpg, revision-movil.jpg y PROMPTS-GENERADOR.md; estado y este handoff.
- **Decisiones:** usar fotos del encargo como entradas de image_gen; titulares según noticias de cada foto. No incorporar noticias de Junior o Santa Fe sin fotos suministradas. Python solo exporta JPG/dimensiones y revisión móvil.
- **Validaciones ejecutadas:** formato JPEG, 1280×720 y peso <2 MB comprobados con Pillow; medidor oficial; revisión visual de texto/tildes/marcas y lectura 168×94. Resultado definitivo en ESTADO_ACTUAL.md. Matriz de app no aplica: sin cambios de código/dependencias.
- **Fallos:** primer pase dejó marcas de ropa; retiradas mediante correcciones del generador. B requirió bajar saturación tras medir 0,623 frente al máximo 0,62.
- **Riesgos:** fotomontaje generativo basado en fotos, no garantiza identidad exacta de píxeles documentales. Aprobación estética y prueba A/B pendientes.
- **Pendientes:** elección del responsable.
- **Siguiente acción exacta:** revisar los tres JPG; esta tarea no publica ni programa.
- **Commit base:** 6d8263d.
- **Commit final:** sin commit.

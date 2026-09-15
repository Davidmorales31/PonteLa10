# Intentos fallidos costosos

Registrar solo intentos cuya repetición consuma tiempo o implique riesgo. No es
un diario ni un destino para logs completos.

## 2026-09-15 — Vitest en un job limpio

- **Problema:** el job `test` fallaba mientras los otros jobs pasaban.
- **Intento:** ejecutar `vitest run` cuando `tsconfig.json` extendía un archivo
  `.nuxt` inexistente.
- **Resultado:** Vitest terminó antes de ejecutar la suite.
- **Causa confirmada:** el job no generaba `.nuxt/tsconfig.json`.
- **Alternativa recomendada:** ejecutar `nuxt prepare` dentro de `test:unit`.
- **Estado:** superado por Fase 0; conservar evidencia de pruebas descubiertas.

## 2026-09-15 — Lockfile aceptado en Windows y rechazado en CI

- **Problema:** los cuatro jobs del PR fallaron durante `npm ci` con Node 22.
- **Intento:** validar inicialmente el lockfile con npm 11 en Windows.
- **Resultado:** la validación local pasó, pero npm 10 en Linux detectó tres
  paquetes opcionales ausentes del lockfile.
- **Causa confirmada:** el lockfile no era reproducible con la versión de npm
  incluida en el runtime de CI.
- **Alternativa recomendada:** regenerar el lockfile con npm 10.9.4 y validar
  `npm ci` con esa misma versión antes de publicar.
- **Estado:** superado por Fase 0; confirmar los cuatro jobs remotos.

## 2026-09-15 — Instalación de Memento desde PyPI

- **Problema:** `pipx install memento-multiagent` no encontró una distribución.
- **Intento:** instalar el nombre publicado en el README oficial.
- **Resultado:** PyPI respondió que no existe una versión compatible disponible.
- **Causa confirmada:** el proyecto no estaba publicado en PyPI.
- **Alternativa recomendada:** instalar con pipx desde un commit verificado del
  repositorio oficial y conservar el SHA en la documentación.
- **Estado:** superado.

## 2026-09-15 — Salida Unicode de Memento en Windows

- **Problema:** `memento init`, `status` y la ayuda fallaron al imprimir símbolos.
- **Intento:** ejecutar el CLI bajo la codificación CP-1252 de la terminal.
- **Resultado:** `UnicodeEncodeError`, aunque la inicialización alcanzó a crear SQLite.
- **Causa confirmada:** el CLI imprime caracteres no representables en CP-1252.
- **Alternativa recomendada:** ejecutar Python en modo UTF-8 mediante `PYTHONUTF8=1`.
- **Estado:** superado localmente; pendiente de corrección upstream.

## Plantilla

- **Fecha:** AAAA-MM-DD
- **Problema:**
- **Intento:**
- **Resultado:**
- **Causa confirmada:**
- **Alternativa recomendada:**
- **Estado:** vigente | superado

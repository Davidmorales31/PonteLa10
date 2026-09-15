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

## Plantilla

- **Fecha:** AAAA-MM-DD
- **Problema:**
- **Intento:**
- **Resultado:**
- **Causa confirmada:**
- **Alternativa recomendada:**
- **Estado:** vigente | superado

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

## Plantilla

- **Fecha:** AAAA-MM-DD
- **Problema:**
- **Intento:**
- **Resultado:**
- **Causa confirmada:**
- **Alternativa recomendada:**
- **Estado:** vigente | superado

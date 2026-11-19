/** Clave estable de un equipo a partir de su nombre: minúsculas, sin tildes, separada por guiones. */
export function claveEquipo(nombre: string): string {
  return nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120)
}

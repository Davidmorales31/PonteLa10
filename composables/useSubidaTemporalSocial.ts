import type { TemporalSocialVista } from '~/utils/editorial/mediosTemporales'

/** Sube un archivo del dispositivo directo a Storage (URL firmada de un solo uso) con progreso. */
export function useSubidaTemporalSocial() {
  const progreso = ref(0)
  const subiendo = ref(false)

  async function subir(archivo: File, publicacionId?: string): Promise<TemporalSocialVista> {
    subiendo.value = true; progreso.value = 0
    try {
      const inicio = await $fetch<{ id: string, tipo: string, urlSubida: string }>('/api/admin/redes/temporales', {
        method: 'POST', body: { nombre: archivo.name || 'archivo', tipoMime: archivo.type, tamano: archivo.size, ...(publicacionId ? { publicacionId } : {}) }
      })
      await new Promise<void>((resolver, rechazar) => {
        const peticion = new XMLHttpRequest()
        peticion.open('PUT', inicio.urlSubida)
        peticion.setRequestHeader('x-upsert', 'false')
        peticion.upload.onprogress = evento => { if (evento.lengthComputable) progreso.value = Math.round(evento.loaded / evento.total * 100) }
        peticion.onload = () => peticion.status >= 200 && peticion.status < 300 ? resolver() : rechazar(new Error('El almacenamiento rechazó el archivo.'))
        peticion.onerror = () => rechazar(new Error('Se cortó la conexión durante la subida. Inténtalo de nuevo.'))
        const cuerpo = new FormData()
        cuerpo.append('cacheControl', '3600')
        cuerpo.append('', archivo)
        peticion.send(cuerpo)
      })
      return await $fetch<TemporalSocialVista>(`/api/admin/redes/temporales/${inicio.id}/confirmar`, { method: 'POST', body: {} })
    } finally { subiendo.value = false }
  }
  return { subir, progreso, subiendo }
}

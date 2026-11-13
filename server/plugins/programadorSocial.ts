import { obtenerClienteSupabasePrivado } from '~/server/utils/clienteSupabasePrivado'
import { procesarColaSocial } from '~/server/utils/procesarColaSocial'

export default defineNitroPlugin(nitro => {
  const config = useRuntimeConfig()
  if (String(config.socialSchedulerEnabled) !== 'true') return
  const cliente = obtenerClienteSupabasePrivado()
  if (!cliente) return
  let ocupado = false
  const revisar = async () => {
    if (ocupado) return
    ocupado = true
    try { await procesarColaSocial(cliente, config, String(config.public.socialSiteUrl || config.public.siteUrl)) }
    catch { /* No imprimir respuesta de proveedor, credenciales ni datos privados. */ }
    finally { ocupado = false }
  }
  void revisar()
  const reloj = setInterval(() => { void revisar() }, 15_000)
  // Latido separado para que una preparación de carrusel no parezca un servidor caído.
  const latido = setInterval(() => {
    void cliente.from('social_scheduler_state').upsert({ id: true, last_seen_at: new Date().toISOString() })
      .then(() => {}, () => {})
  }, 30_000)
  nitro.hooks.hook('close', () => { clearInterval(reloj); clearInterval(latido) })
})

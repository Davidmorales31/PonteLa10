export interface EstadoConexionSocialX {
  configurado: boolean
  almacenamientoDisponible: boolean
  puedeConectar: boolean
  preparada: boolean
  cuenta: { usuario: string, conectadaEn: string, venceEn: string, requiereRenovar: boolean } | null
}

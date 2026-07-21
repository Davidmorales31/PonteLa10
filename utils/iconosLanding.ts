import type { Component } from 'vue'
import {
  Bell,
  CircleDot,
  Cloud,
  Cpu,
  Flag,
  Gamepad2,
  MessageCircle,
  Newspaper,
  Star,
  TrendingUp,
  Trophy,
  UsersRound,
  Zap
} from '@lucide/vue'
import type { NombreIconoLanding } from '~/types/landing'

const iconosLanding: Record<NombreIconoLanding, Component> = {
  balon: CircleDot,
  banderaColombia: Flag,
  campana: Bell,
  chip: Cpu,
  comunidad: UsersRound,
  control: Gamepad2,
  estrella: Star,
  mensajes: MessageCircle,
  noticias: Newspaper,
  nube: Cloud,
  rayo: Zap,
  tendencia: TrendingUp,
  trofeo: Trophy
}

export function obtenerIconoLanding(nombre: NombreIconoLanding): Component {
  return iconosLanding[nombre]
}

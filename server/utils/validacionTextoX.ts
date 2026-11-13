import twitterText from 'twitter-text'

export const limiteCaracteresX = 280

export function analizarTextoX(texto: string) {
  const resultado = twitterText.parseTweet(texto)
  return { valido: resultado.valid, longitud: resultado.weightedLength, limite: limiteCaracteresX }
}

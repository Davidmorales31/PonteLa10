declare module 'twitter-text' {
  interface ResultadoParseoX {
    weightedLength: number
    valid: boolean
  }

  const twitterText: {
    parseTweet(texto: string): ResultadoParseoX
  }

  export default twitterText
}

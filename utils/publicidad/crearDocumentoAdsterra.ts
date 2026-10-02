export type FormatoAdsterra = 'nativo' | 'leaderboard'

const ID_NATIVO = '30c3ea809a63209ce30a1e8d211f79c5'
const ID_LEADERBOARD = '14896f35681798666057f1b5f17aded7'

// srcdoc conserva un origen opaco: document.cookie lanza SecurityError aunque
// el anuncio solo intente consultarlo. La capa devuelve un valor vacío y
// descarta escrituras, sin habilitar cookies ni acceso al origen de la página.
const capaCookieAislada = `<script>
try {
  Object.defineProperty(document, 'cookie', {
    configurable: true,
    enumerable: true,
    get: () => '',
    set: () => true
  })
} catch {
  // El aislamiento del iframe se mantiene aunque el navegador no permita la capa.
}
</script>`

export function crearDocumentoAdsterra(formato: FormatoAdsterra): string {
  if (formato === 'nativo') {
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="strict-origin-when-cross-origin"><style>html,body{margin:0;min-width:0;width:100%;font-family:Arial,sans-serif;background:transparent}#container-${ID_NATIVO}{width:100%;min-height:250px;overflow:hidden}</style></head><body><div id="container-${ID_NATIVO}"></div>${capaCookieAislada}<script async="async" data-cfasync="false" src="https://czernik.org/21/${ID_NATIVO}"></script></body></html>`
  }

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=728,initial-scale=1"><meta name="referrer" content="strict-origin-when-cross-origin"><style>html,body{margin:0;width:728px;height:90px;overflow:hidden;background:transparent}</style></head><body>${capaCookieAislada}<script>window.atOptions={key:'${ID_LEADERBOARD}',format:'iframe',height:90,width:728,params:{}}</script><script src="https://czernik.org/22/${ID_LEADERBOARD}"></script></body></html>`
}

import ImageKit from '@imagekit/nodejs'

let clientSingleton

/** Server uploads use the private API key only (see @imagekit/nodejs). */
export function getImageKitClient() {
  if (!clientSingleton) {
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY
    if (!privateKey?.startsWith?.('private_')) {
      throw new Error(
        'IMAGEKIT_PRIVATE_KEY is missing or invalid. Add it from ImageKit Dashboard → Developer → API keys.'
      )
    }
    clientSingleton = new ImageKit({ privateKey })
  }
  return clientSingleton
}

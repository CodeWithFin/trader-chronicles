import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { toFile } from '@imagekit/nodejs'
import { getSessionUser } from '@/lib/auth'
import { getImageKitClient } from '@/lib/imagekit-client'

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = /^image\/(png|jpeg|jpg|jfif|pjpeg|webp)$/i

function sanitizeBaseName(name) {
  const base = String(name || 'screenshot')
    .replace(/[/\\]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 80)
  return base || 'screenshot'
}

export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const user = await getSessionUser(cookieStore)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const entry = formData.get('file')
    if (!entry || typeof entry === 'string') {
      return NextResponse.json({ error: 'Missing file field "file"' }, { status: 400 })
    }

    const name = String(entry.name || '')
    const mime = (entry.type || '').toLowerCase()
    const hasImageExt = /\.(png|jpe?g|jfif|webp)$/i.test(name)
    if (!ALLOWED_TYPES.test(mime) && !hasImageExt) {
      return NextResponse.json({ error: 'Screenshot must be PNG, JPG, WEBP, or JFIF' }, { status: 400 })
    }

    const size = typeof entry.size === 'number' ? entry.size : 0
    if (size > MAX_BYTES) {
      return NextResponse.json({ error: 'Screenshot must be 5MB or smaller' }, { status: 400 })
    }

    const buf = Buffer.from(await entry.arrayBuffer())

    const m = mime
    const ext = m.includes('webp') || name.toLowerCase().endsWith('.webp')
      ? 'webp'
      : m.includes('png') || name.toLowerCase().endsWith('.png')
        ? 'png'
        : 'jpg'
    const base = sanitizeBaseName(entry.name?.replace(/\.[^.]+$/, '') || '')
    const fileName = `${Date.now()}-${base}.${ext}`
    const folder = `/trade-screenshots/${user.id}`

    const ik = getImageKitClient()
    const uploadable = await toFile(buf, fileName)

    const result = await ik.files.upload({
      file: uploadable,
      fileName,
      folder,
    })

    const url = result?.url
    if (!url) {
      console.error('ImageKit upload missing url:', result)
      return NextResponse.json({ error: 'Upload succeeded but no URL returned' }, { status: 502 })
    }

    return NextResponse.json({ url })
  } catch (e) {
    console.error('ImageKit upload error:', e)
    const msg = e?.message || 'Upload failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

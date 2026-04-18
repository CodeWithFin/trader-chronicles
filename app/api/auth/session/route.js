import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'

export async function GET() {
  const cookieStore = await cookies()
  const user = await getSessionUser(cookieStore)
  if (!user) {
    return NextResponse.json({ user: null })
  }
  return NextResponse.json({
    user: { id: user.id, email: user.email, username: user.username },
  })
}

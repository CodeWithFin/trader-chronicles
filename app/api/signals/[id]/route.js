import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionUser } from '@/lib/auth'
import { updateSignalStatus, deleteSignal } from '@/lib/signals'

const VALID_STATUSES = ['active', 'closed', 'stopped', 'cancelled']

export async function PATCH(request, { params }) {
  try {
    const cookieStore = await cookies()
    const user = await getSessionUser(cookieStore)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = params
    const { status } = await request.json()
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const signal = await updateSignalStatus({ id, userId: user.id, status })
    if (!signal) return NextResponse.json({ error: 'Signal not found' }, { status: 404 })

    return NextResponse.json({ signal })
  } catch (e) {
    console.error('PATCH /api/signals/[id] error:', e)
    return NextResponse.json({ error: 'Failed to update signal' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const cookieStore = await cookies()
    const user = await getSessionUser(cookieStore)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = params
    await deleteSignal({ id, userId: user.id })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/signals/[id] error:', e)
    return NextResponse.json({ error: 'Failed to delete signal' }, { status: 500 })
  }
}

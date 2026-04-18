import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getSessionUser } from '@/lib/auth'

export default async function Home() {
  const cookieStore = await cookies()
  const user = await getSessionUser(cookieStore)

  if (user) {
    redirect('/dashboard')
  }
  redirect('/login')
}

import fs from 'fs'
import path from 'path'
import dns from 'dns'
import net from 'net'
import { neon } from '@neondatabase/serverless'

function preferIpv4ForNeonFetch() {
  try {
    dns.setDefaultResultOrder('ipv4first')
  } catch {
    /* older Node */
  }
  if (typeof net.setDefaultAutoSelectFamily === 'function') {
    net.setDefaultAutoSelectFamily(false)
  }
}

preferIpv4ForNeonFetch()

function normalizeDatabaseUrl(connectionString) {
  if (!connectionString) return connectionString
  try {
    const u = new URL(connectionString.replace(/^postgresql:/i, 'http:'))
    u.searchParams.delete('channel_binding')
    return u.toString().replace(/^http:/i, 'postgresql:')
  } catch {
    return connectionString.replace(/[&?]channel_binding=[^&]*/g, '').replace(/\?$/, '')
  }
}

const envPath = path.join(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...val] = trimmed.split('=')
      process.env[key.trim()] = val.join('=').trim()
    }
  }
}

const url = normalizeDatabaseUrl(process.env.DATABASE_URL)
if (!url) {
  console.error('DATABASE_URL is missing')
  process.exit(1)
}

const sql = neon(url)

async function migrate() {
  console.log('Running migration 004_account_targets.sql with IPv4 fallback...')
  
  await sql`
    CREATE TABLE IF NOT EXISTS public.account_targets (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      account_id UUID NOT NULL UNIQUE REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
      weekly_target_percent NUMERIC(6, 2) NOT NULL CHECK (weekly_target_percent > 0),
      monthly_target_percent NUMERIC(6, 2) NOT NULL CHECK (monthly_target_percent > 0),
      updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
    );
  `
  
  await sql`
    CREATE INDEX IF NOT EXISTS idx_account_targets_account_id ON public.account_targets(account_id);
  `
  
  console.log('SUCCESS: Migration 004_account_targets.sql successfully applied to Neon Database!')
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})

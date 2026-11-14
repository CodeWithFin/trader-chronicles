import fs from 'fs'
import path from 'path'
import postgres from 'postgres'

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

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is missing')
  process.exit(1)
}

const sslMode = url.includes('sslmode=require') || url.includes('ssl=true')
const sql = postgres(url, sslMode ? { ssl: 'require' } : {})

async function migrate() {
  console.log('Running migration 004_account_targets.sql...')

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

  console.log('SUCCESS: Migration 004_account_targets.sql applied to PostgreSQL.')
  await sql.end({ timeout: 1 })
}

migrate().catch(async (err) => {
  console.error('Migration failed:', err)
  try {
    await sql.end({ timeout: 1 })
  } catch {
    /* ignore */
  }
  process.exit(1)
})

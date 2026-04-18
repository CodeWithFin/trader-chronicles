/**
 * Map common PostgreSQL errors to HTTP responses so the UI shows useful text
 * instead of a generic 500 (e.g. schema not applied in Neon yet).
 */
export function responseFromPgError(error, defaultMessage = 'Something went wrong') {
  const code = error?.code
  const msg = String(error?.message || '')

  if (code === '42P01' || /relation .+ does not exist/i.test(msg)) {
    return {
      status: 503,
      json: {
        error:
          'Database tables are missing. In Neon: open SQL Editor and run the full script from neon/schema.sql in this repository, then try again.',
      },
    }
  }

  if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || /fetch failed/i.test(msg)) {
    return {
      status: 503,
      json: {
        error:
          'Could not reach the database. Check DATABASE_URL and that your Neon project is active.',
      },
    }
  }

  return {
    status: 500,
    json: { error: msg || defaultMessage },
  }
}

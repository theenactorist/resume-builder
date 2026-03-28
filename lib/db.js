import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway')
    ? { rejectUnauthorized: false }
    : false,
});

// Auto-create table on first import
const init = pool.query(`
  CREATE TABLE IF NOT EXISTS generations (
    id            SERIAL PRIMARY KEY,
    company_name  TEXT NOT NULL,
    job_title     TEXT,
    job_description TEXT,
    result        JSONB NOT NULL,
    created_at    TIMESTAMP DEFAULT NOW()
  );
`).catch((err) => console.error('DB init error:', err.message));

export async function query(text, params) {
  await init;
  return pool.query(text, params);
}

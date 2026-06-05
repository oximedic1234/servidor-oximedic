require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.mjemhzwngxttolhvuejg:OXIMEDIC2026@aws-1-sa-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log('Altering REAL Oximedic DB...');
    await pool.query('ALTER TABLE Clientes ADD COLUMN IF NOT EXISTS Direccion_Domicilio TEXT;');
    await pool.query('ALTER TABLE Recargas ADD COLUMN IF NOT EXISTS Es_Domicilio BOOLEAN DEFAULT FALSE;');
    await pool.query('ALTER TABLE Recargas ADD COLUMN IF NOT EXISTS Costo_Transporte NUMERIC(10,2) DEFAULT 0.0;');
    console.log('REAL Oximedic OK');
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

run();

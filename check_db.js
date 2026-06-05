require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:OXIMEDIC2026@db.fhgoutlylsjpcukawzmn.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});
async function run() {
  await pool.query('SET search_path TO "oximedic"');
  const r = await pool.query('SELECT Nombre_Botellon, Es_Domicilio, Costo_Transporte, Fecha_Recarga FROM Recargas ORDER BY Fecha_Recarga DESC LIMIT 5');
  console.log(r.rows);
  await pool.end();
}
run();

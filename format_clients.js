const { Client } = require('pg');

const urls = [
  'postgresql://postgres.mjemhzwngxttolhvuejg:OXIMEDIC2026@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
  'postgresql://postgres.wljemvwsdpghvsclwwfk:OXICENTER2026@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
];

async function formatDatabase(url, name) {
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log(`Connected to ${name} database. Formatting...`);
    
    await client.query('BEGIN');
    
    await client.query('DELETE FROM "detalle_ventas"');
    await client.query('DELETE FROM "ventas"');
    await client.query('DELETE FROM "alquileres"');
    await client.query('DELETE FROM "recargas"');
    await client.query('DELETE FROM "turnos"');
    
    await client.query('DELETE FROM "clientes"');
    await client.query('DELETE FROM "productos"');
    
    // Only delete users that are not 'admin'
    await client.query("DELETE FROM \"usuarios\" WHERE \"usuario\" != 'admin'");
    
    await client.query('COMMIT');
    console.log(`${name} database successfully formatted! Only admin user remains.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Error formatting ${name} database:`, error.message);
  } finally {
    await client.end();
  }
}

async function runAll() {
  await formatDatabase(urls[0], 'OXIMEDIC');
  await formatDatabase(urls[1], 'OXICENTER');
}

runAll();

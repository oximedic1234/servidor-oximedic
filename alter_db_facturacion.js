const fs = require('fs');
const { Pool } = require('pg');

const envContent = fs.readFileSync('.env', 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);
const schemaMatch = envContent.match(/SCHEMA_NAME=(.+)/);

if (!dbUrlMatch) {
  console.error("DATABASE_URL not found in .env");
  process.exit(1);
}

const dbUrl = dbUrlMatch[1].trim();
const SCHEMA = schemaMatch ? schemaMatch[1].trim() : 'public';

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO ${SCHEMA}`);
    
    // Add columns to Clientes
    await client.query(`ALTER TABLE Clientes ADD COLUMN IF NOT EXISTS NIT_Facturacion VARCHAR(30)`);
    await client.query(`ALTER TABLE Clientes ADD COLUMN IF NOT EXISTS Razon_Social VARCHAR(200)`);
    console.log("Added NIT_Facturacion and Razon_Social to Clientes.");

    // Create Facturas table
    await client.query(`
      CREATE TABLE IF NOT EXISTS Facturas (
        ID_Factura SERIAL PRIMARY KEY,
        ID_Cliente INT REFERENCES Clientes(ID_Cliente),
        ID_Usuario INT REFERENCES Usuarios(ID_Usuario),
        Tipo_Transaccion VARCHAR(50),
        ID_Transaccion INT,
        Nro_Factura INT,
        NIT_Cliente VARCHAR(30),
        Razon_Social VARCHAR(200),
        Monto_Total NUMERIC(10,2),
        Fecha_Emision TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        Codigo_Control VARCHAR(100)
      );
    `);
    console.log("Created Facturas table.");
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    client.release();
    pool.end();
  }
}

main();

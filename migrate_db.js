const { Pool } = require('pg');
const fs = require('fs');

async function migrate(envPath) {
  if (!fs.existsSync(envPath)) return;
  const envContent = fs.readFileSync(envPath, 'utf8');
  let dbUrl = '';
  let schema = 'public';
  envContent.split('\n').forEach(line => {
    if (line.startsWith('DATABASE_URL=')) dbUrl = line.split('=')[1].trim();
    if (line.startsWith('SCHEMA_NAME=')) schema = line.split('=')[1].trim();
  });

  if (!dbUrl) return;

  const pool = new Pool({
    connectionString: `${dbUrl}&options=-c%20search_path%3D${schema}`,
    ssl: { rejectUnauthorized: false }
  });

  console.log(`Migrating schema: ${schema}`);
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Turnos (
        ID_Turno SERIAL PRIMARY KEY,
        ID_Usuario INT REFERENCES Usuarios(ID_Usuario),
        Fecha_Apertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        Fecha_Cierre TIMESTAMP,
        Monto_Inicial NUMERIC(10,2) DEFAULT 0,
        Monto_Cierre NUMERIC(10,2),
        Estado VARCHAR(20) DEFAULT 'ABIERTO'
      );
    `);
    console.log(`- Table Turnos created/verified in ${schema}`);

    await pool.query(`
      ALTER TABLE Alquileres ADD COLUMN IF NOT EXISTS ID_Usuario_Recibe INT REFERENCES Usuarios(ID_Usuario);
    `);
    console.log(`- Column ID_Usuario_Recibe added to Alquileres in ${schema}`);

    // Update existing alquileres so ID_Usuario_Recibe is the same as ID_Usuario where Estado is DEVUELTO
    await pool.query(`
      UPDATE Alquileres SET ID_Usuario_Recibe = ID_Usuario WHERE Estado_Alquiler = 'DEVUELTO' AND ID_Usuario_Recibe IS NULL;
    `);
    console.log(`- Existing Alquileres migrated`);

    // Add ID_Turno to Ventas, Recargas, Alquileres
    await pool.query(`ALTER TABLE Ventas ADD COLUMN IF NOT EXISTS ID_Turno INT REFERENCES Turnos(ID_Turno);`);
    await pool.query(`ALTER TABLE Recargas ADD COLUMN IF NOT EXISTS ID_Turno INT REFERENCES Turnos(ID_Turno);`);
    await pool.query(`ALTER TABLE Alquileres ADD COLUMN IF NOT EXISTS ID_Turno_Salida INT REFERENCES Turnos(ID_Turno);`);
    await pool.query(`ALTER TABLE Alquileres ADD COLUMN IF NOT EXISTS ID_Turno_Recepcion INT REFERENCES Turnos(ID_Turno);`);

  } catch (err) {
    console.error(`Error migrating ${schema}:`, err);
  } finally {
    await pool.end();
  }
}

async function main() {
  await migrate('C:\\Users\\abrah\\servidor_oxigeno\\.env');
  await migrate('C:\\Users\\abrah\\servidor_oxicenter\\.env');
  console.log('Migration complete');
}

main();

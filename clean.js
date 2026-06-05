const { Pool } = require('pg');

const cleanDb = async (connectionString, name) => {
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    console.log("Limpiando la base de datos de " + name + "...");
    // Limpiamos transacciones
    await pool.query('TRUNCATE TABLE Detalle_Ventas, Ventas, Alquileres, Recargas, Turnos CASCADE');
    // Limpiamos clientes
    await pool.query('TRUNCATE TABLE Clientes CASCADE');
    // Eliminamos empleados excepto admin
    await pool.query(`DELETE FROM Usuarios WHERE Usuario != 'admin'`);
    // Restaurar los IDs de ventas, alquileres, etc a 1
    await pool.query('ALTER SEQUENCE ventas_id_venta_seq RESTART WITH 1').catch(()=>null);
    await pool.query('ALTER SEQUENCE alquileres_id_alquiler_seq RESTART WITH 1').catch(()=>null);
    await pool.query('ALTER SEQUENCE recargas_id_recarga_seq RESTART WITH 1').catch(()=>null);
    await pool.query('ALTER SEQUENCE turnos_id_turno_seq RESTART WITH 1').catch(()=>null);
    await pool.query('ALTER SEQUENCE clientes_id_cliente_seq RESTART WITH 1').catch(()=>null);
    
    console.log("¡Base de datos de " + name + " limpiada exitosamente!");
  } catch (error) {
    console.error("Error en " + name + ":", error);
  } finally {
    await pool.end();
  }
};

const run = async () => {
  await cleanDb('postgresql://postgres.mjemhzwngxttolhvuejg:OXIMEDIC2026@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true', 'Oximedic');
  await cleanDb('postgresql://postgres.wljemvwsdpghvsclwwfk:OXICENTER2026@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true', 'Oxicenter');
};

run();

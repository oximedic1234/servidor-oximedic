const { Pool } = require('pg');
require('dotenv').config();
const fs = require('fs');

async function cleanDatabase(url, schemaName) {
    console.log(`\n======================================================`);
    console.log(`🧹 LIMPIANDO BASE DE DATOS: ${schemaName.toUpperCase()}`);
    console.log(`======================================================`);
    
    let connectionString = url;
    if (schemaName !== 'public') {
        connectionString += `?options=-csearch_path%3D${schemaName}`;
    }

    const pool = new Pool({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        
        console.log(`1. Eliminando todas las ventas, alquileres, recargas, productos y clientes...`);
        // TRUNCATE vacía las tablas por completo y RESTART IDENTITY reinicia los IDs a 1
        await client.query(`
            TRUNCATE TABLE Detalle_Ventas, Ventas, Alquileres, Recargas, Clientes, Productos RESTART IDENTITY CASCADE;
        `);
        console.log(`✅ Datos de transacciones eliminados.`);

        console.log(`2. Eliminando usuarios de prueba...`);
        const res = await client.query(`
            DELETE FROM Usuarios WHERE Usuario != 'admin';
        `);
        console.log(`✅ ${res.rowCount} usuarios de prueba eliminados (Se conservó la cuenta 'admin').`);
        
        console.log(`🎉 ¡Base de datos ${schemaName.toUpperCase()} limpiada exitosamente!`);
        client.release();
    } catch (e) {
        console.error(`❌ Error al limpiar ${schemaName}:`, e.message);
    } finally {
        await pool.end();
    }
}

async function main() {
    // Limpiar Oximedic
    const oximedicUrl = process.env.DATABASE_URL;
    const oximedicSchema = process.env.SCHEMA_NAME || 'public';
    if (oximedicUrl) {
        await cleanDatabase(oximedicUrl, oximedicSchema);
    }

    // Leer .env.oxicenter manualmente ya que dotenv solo carga .env
    try {
        const envOxicenter = fs.readFileSync('.env.oxicenter', 'utf8');
        let oxicenterUrl = '';
        let oxicenterSchema = 'oxicenter';
        
        envOxicenter.split('\n').forEach(line => {
            if (line.startsWith('DATABASE_URL=')) oxicenterUrl = line.split('=')[1].trim();
            if (line.startsWith('SCHEMA_NAME=')) oxicenterSchema = line.split('=')[1].trim();
        });

        if (oxicenterUrl) {
            await cleanDatabase(oxicenterUrl, oxicenterSchema);
        }
    } catch (e) {
        console.error('No se pudo leer .env.oxicenter');
    }
    
    console.log(`\n======================================================`);
    console.log(`🚀 TODAS LAS BASES DE DATOS FUERON REINICIADAS CON ÉXITO.`);
    console.log(`======================================================\n`);
}

main();

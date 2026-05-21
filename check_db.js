const { Pool } = require('pg');
const pool = new Pool({
    connectionString: "postgresql://postgres.ixuhvktzlraaznyjwdt:oximedic2026@aws-1-sa-east-1.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        // 1. Listar tablas
        const tablas = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`);
        console.log('=== TABLAS ===');
        tablas.rows.forEach(r => console.log(' -', r.table_name));

        // 2. Estructura de cada tabla
        for (const t of tablas.rows) {
            const cols = await pool.query(`SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`, [t.table_name]);
            console.log(`\n=== ${t.table_name.toUpperCase()} ===`);
            cols.rows.forEach(c => console.log(`  ${c.column_name} | ${c.data_type} | ${c.is_nullable} | default: ${c.column_default || 'NULL'}`));
        }

        // 3. Usuarios existentes
        const users = await pool.query(`SELECT id_usuario, nombre_completo, usuario, rol FROM usuarios ORDER BY id_usuario`);
        console.log('\n=== USUARIOS EXISTENTES ===');
        users.rows.forEach(u => console.log(`  ID:${u.id_usuario} | ${u.nombre_completo} | ${u.usuario} | ${u.rol}`));

        await pool.end();
    } catch (e) {
        console.error('ERROR:', e.message);
        await pool.end();
    }
})();

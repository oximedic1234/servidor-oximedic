const { Client } = require('pg');
const fs = require('fs');

async function runSql(url, filePath, name) {
    console.log(`[${name}] Connecting to database...`);
    const client = new Client({
        connectionString: url,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log(`[${name}] Connected. Executing SQL...`);
        const sql = fs.readFileSync(filePath, 'utf8');
        await client.query(sql);
        console.log(`[${name}] SQL executed successfully!`);
    } catch (err) {
        console.error(`[${name}] Error:`, err);
    } finally {
        await client.end();
        console.log(`[${name}] Disconnected.`);
    }
}

async function main() {
    const oximedicUrl = 'postgresql://postgres:OXIMEDIC2026@db.mjemhzwngxttolhvuejg.supabase.co:5432/postgres';
    const oxicenterUrl = 'postgresql://postgres:OXICENTER2026@db.wljemvwsdpghvsclwwfk.supabase.co:5432/postgres';

    const oximedicSql = 'C:\\Users\\abrah\\servidor_oxigeno\\setup_database_public.sql';
    const oxicenterSql = 'C:\\Users\\abrah\\servidor_oxicenter\\setup_database.sql';

    await runSql(oximedicUrl, oximedicSql, 'OXIMEDIC');
    console.log('-----------------------------------');
    await runSql(oxicenterUrl, oxicenterSql, 'OXI-CENTER');
}

main();

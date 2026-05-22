const fs = require('fs');
const files = ['C:/Users/abrah/servidor_oxigeno/index.js', 'C:/Users/abrah/servidor_oxicenter/index.js'];

files.forEach(f => {
    if(fs.existsSync(f)) {
        let c = fs.readFileSync(f, 'utf8');
        c = c.replace(/as "CAJERO_SALIDA"/g, 'as "CAJERO"');
        c = c.replace(/as "CLIENTE"/g, 'as "NOMBRE_CLIENTE"');
        fs.writeFileSync(f, c);
    }
});

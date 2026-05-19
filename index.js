require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // <-- NUEVA LIBRERÍA DE POSTGRESQL

const app = express();
app.use(cors());
app.use(express.json());

// =======================================================
// CONEXIÓN A SUPABASE (POSTGRESQL)
// =======================================================
const pool = new Pool({
  // REEMPLAZA [YOUR-PASSWORD] CON TU CONTRASEÑA DE SUPABASE (SIN LOS CORCHETES)
 connectionString: "postgresql://postgres:oximedic2026@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
  ssl: { rejectUnauthorized: false } 
});

async function iniciarServidor() {
  try {
    const test = await pool.query('SELECT NOW()');
    console.log('✅ Conectado a la base de datos Supabase exitosamente.');

    const puerto = process.env.PORT || 3000;
    app.listen(puerto, () => {
      console.log(`🚀 Servidor API de OXIMEDIC corriendo en el puerto ${puerto}`);
    });
  } catch (error) {
    console.error('❌ Error crítico al conectar a Supabase: ', error);
  }
}

app.get('/', (req, res) => {
  res.send('El Servidor de OXIMEDIC está en línea y conectado a Supabase.');
});

// =======================================================
// Ruta para Iniciar Sesión (Login)
// =======================================================
app.post('/api/login', async (req, res) => {
  const { usuario, contrasena } = req.body;
  try {
    const resultado = await pool.query(
      `SELECT ID_Usuario AS "ID_USUARIO", Nombre_Completo AS "NOMBRE_COMPLETO", Rol AS "ROL" 
       FROM Usuarios 
       WHERE LOWER(TRIM(Usuario)) = LOWER(TRIM($1)) 
       AND TRIM(Contrasena) = TRIM($2)`,
      [usuario, contrasena]
    );

    if (resultado.rows.length > 0) {
      res.status(200).json({ exito: true, mensaje: 'Acceso concedido', usuario: resultado.rows[0] });
    } else {
      res.status(401).json({ exito: false, mensaje: 'Credenciales inválidas en la base de datos' });
    }
  } catch (error) {
    console.error('Error en el login:', error);
    res.status(500).json({ exito: false, mensaje: 'Error interno del servidor' });
  }
});

// =======================================================
// MÓDULO DE GESTIÓN DE USUARIOS
// =======================================================
app.get('/api/usuarios', async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT ID_Usuario AS "ID_USUARIO", Nombre_Completo AS "NOMBRE_COMPLETO", Usuario AS "USUARIO", Rol AS "ROL", Estado AS "ESTADO" 
       FROM Usuarios ORDER BY Rol, Nombre_Completo`
    );
    res.json({ exito: true, usuarios: resultado.rows });
  } catch (error) { res.status(500).json({ exito: false, mensaje: 'Error al cargar usuarios' }); }
});

app.post('/api/usuarios', async (req, res) => {
  const { nombre, usuario, rol, contrasena, palabraSeguridad } = req.body;
  try {
    await pool.query(
      `INSERT INTO Usuarios (Nombre_Completo, Usuario, Contrasena, Rol, Estado, Palabra_Seguridad) 
       VALUES ($1, $2, $3, $4, 'ACTIVO', $5)`,
      [nombre, usuario, contrasena, rol, palabraSeguridad || null]
    );
    res.status(201).json({ exito: true, mensaje: 'Usuario creado exitosamente' });
  } catch (error) { res.status(500).json({ exito: false, mensaje: 'Error al crear usuario.' }); }
});

app.delete('/api/usuarios/:id', async (req, res) => {
  try {
    await pool.query(`DELETE FROM Usuarios WHERE ID_Usuario = $1`, [req.params.id]);
    res.json({ exito: true, mensaje: 'Usuario eliminado' });
  } catch (error) { res.status(500).json({ exito: false, mensaje: 'Error al eliminar usuario' }); }
});

app.put('/api/usuarios/:id/password', async (req, res) => {
  try {
    await pool.query(`UPDATE Usuarios SET Contrasena = $1 WHERE ID_Usuario = $2`, [req.body.nuevaContrasena, req.params.id]);
    res.json({ exito: true, mensaje: 'Contraseña actualizada' });
  } catch (error) { res.status(500).json({ exito: false, mensaje: 'Error al actualizar contraseña' }); }
});

app.post('/api/usuarios/recuperar', async (req, res) => {
  const { usuario, palabraSeguridad, nuevaContrasena } = req.body;
  try {
    const validacion = await pool.query(
      `SELECT ID_Usuario AS "ID_USUARIO" FROM Usuarios WHERE Usuario = $1 AND Palabra_Seguridad = $2`,
      [usuario, palabraSeguridad]
    );

    if (validacion.rows.length > 0) {
      await pool.query(`UPDATE Usuarios SET Contrasena = $1 WHERE ID_Usuario = $2`, [nuevaContrasena, validacion.rows[0].ID_USUARIO]);
      res.json({ exito: true, mensaje: 'Contraseña restablecida correctamente' });
    } else {
      res.status(401).json({ exito: false, mensaje: 'Usuario o Palabra de Seguridad incorrectos' });
    }
  } catch (error) { res.status(500).json({ exito: false, mensaje: 'Error en el servidor al recuperar' }); }
});

app.put('/api/usuarios/cambiar-contrasena', async (req, res) => {
  const { id_administrador, id_usuario_destino, nueva_contrasena } = req.body;
  try {
    const verificarAdmin = await pool.query(
      `SELECT Rol FROM Usuarios WHERE ID_Usuario = $1 AND Rol = 'ADMINISTRADOR' AND Estado = 'ACTIVO'`,
      [id_administrador]
    );
    if (verificarAdmin.rows.length === 0) return res.status(403).json({ exito: false, mensaje: 'Acceso denegado.' });

    await pool.query(`UPDATE Usuarios SET Contrasena = TRIM($1) WHERE ID_Usuario = $2`, [nueva_contrasena, id_usuario_destino]);
    res.json({ exito: true, mensaje: 'Contraseña actualizada correctamente.' });
  } catch (error) { res.status(500).json({ exito: false, mensaje: 'Error interno en el servidor.' }); }
});

// =======================================================
// CATÁLOGO DE PRODUCTOS E INVENTARIO
// =======================================================
app.get('/api/productos', async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT ID_Producto AS "ID_PRODUCTO", Nombre_Producto AS "NOMBRE_PRODUCTO", Categoria AS "CATEGORIA", 
              Stock_Disponible AS "STOCK_DISPONIBLE", Precio AS "PRECIO", Estado AS "ESTADO" 
       FROM Productos WHERE Estado = 'ACTIVO'`
    );
    res.json({ exito: true, productos: resultado.rows });
  } catch (error) { res.status(500).json({ exito: false, mensaje: 'Error al leer la base de datos' }); }
});

app.post('/api/productos', async (req, res) => {
  const { nombre, categoria, precio, stock } = req.body;
  try {
    await pool.query(
      `INSERT INTO Productos (Nombre_Producto, Categoria, Precio, Stock_Disponible) VALUES ($1, $2, $3, $4)`,
      [nombre, categoria, precio, stock]
    );
    res.status(201).json({ exito: true, mensaje: 'Producto registrado' });
  } catch (error) { res.status(500).json({ exito: false, mensaje: 'Error al guardar el producto' }); }
});

app.put('/api/productos/:id', async (req, res) => {
  const { categoria, precio, stock } = req.body;
  try {
    await pool.query(
      `UPDATE Productos SET Categoria = $1, Precio = $2, Stock_Disponible = $3 WHERE ID_Producto = $4`,
      [categoria, precio, stock, req.params.id]
    );
    res.json({ exito: true, mensaje: 'Inventario actualizado' });
  } catch (error) { res.status(500).json({ exito: false, mensaje: 'Error al actualizar' }); }
});

app.delete('/api/productos/:id', async (req, res) => {
  try {
    await pool.query(`UPDATE Productos SET Estado = 'INACTIVO' WHERE ID_Producto = $1`, [req.params.id]);
    res.json({ exito: true, mensaje: 'Producto eliminado' });
  } catch (error) { res.status(500).json({ exito: false, mensaje: 'Error al eliminar' }); }
});

// =======================================================
// VENTAS (Con Transacciones de Postgres)
// =======================================================
app.post('/api/ventas', async (req, res) => {
  const { id_usuario, total, carrito } = req.body;
  const client = await pool.connect(); // <-- Inicio de transacción
  try {
    await client.query('BEGIN');
    const resultVenta = await client.query(
      `INSERT INTO Ventas (ID_Usuario, Total_Venta) VALUES ($1, $2) RETURNING ID_Venta AS "ID_VENTA"`,
      [id_usuario, total]
    );
    const idVenta = resultVenta.rows[0].ID_VENTA;

    for (let item of carrito) {
      await client.query(
        `INSERT INTO Detalle_Ventas (ID_Venta, ID_Producto, Cantidad, Precio_Unitario, Subtotal) 
         VALUES ($1, $2, $3, $4, $5)`,
        [idVenta, item.ID_PRODUCTO, item.CANTIDAD, item.PRECIO_FINAL, item.PRECIO_FINAL * item.CANTIDAD]
      );
      await client.query(
        `UPDATE Productos SET Stock_Disponible = Stock_Disponible - $1 WHERE ID_Producto = $2`,
        [item.CANTIDAD, item.ID_PRODUCTO]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ exito: true, mensaje: 'Venta registrada con éxito', id_venta: idVenta });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al registrar la venta:', error);
    res.status(500).json({ exito: false, mensaje: 'Error al procesar la venta' });
  } finally {
    client.release(); // <-- Fin de transacción
  }
});

// =======================================================
// ALQUILERES
// =======================================================
app.get('/api/clientes', async (req, res) => {
  try {
    const resultado = await pool.query(`SELECT ID_Cliente AS "ID_CLIENTE", Carnet_Identidad AS "CARNET_IDENTIDAD", Nombre || ' ' || Apellido AS "NOMBRE_COMPLETO" FROM Clientes`);
    res.json({ exito: true, clientes: resultado.rows });
  } catch (error) { res.status(500).json({ exito: false, mensaje: 'Error al leer clientes' }); }
});

app.post('/api/alquileres', async (req, res) => {
  const { carnet, nombre, apellido, celular, direccion, id_producto, id_usuario, costo_dia, monto_garantia, estado_botellon, fecha_prevista } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let idCliente;
    const busquedaCliente = await client.query(`SELECT ID_Cliente AS "ID_CLIENTE" FROM Clientes WHERE Carnet_Identidad = $1`, [carnet]);
    
    if (busquedaCliente.rows.length > 0) {
      idCliente = busquedaCliente.rows[0].ID_CLIENTE;
    } else {
      const nuevoCliente = await client.query(
        `INSERT INTO Clientes (Carnet_Identidad, Nombre, Apellido, Telefono, Direccion) VALUES ($1, $2, $3, $4, $5) RETURNING ID_Cliente AS "ID_CLIENTE"`,
        [carnet, nombre, apellido, celular, direccion]
      );
      idCliente = nuevoCliente.rows[0].ID_CLIENTE;
    }

    await client.query(
      `INSERT INTO Alquileres (ID_Cliente, ID_Producto, ID_Usuario, Costo_Por_Dia, Monto_Garantia, Estado_Botellon, Fecha_Prevista, Estado_Alquiler, Fecha_Salida) 
       VALUES ($1, $2, $3, $4, $5, $6, $7::date, 'PRESTADO', CURRENT_TIMESTAMP)`,
      [idCliente, id_producto, id_usuario, costo_dia, monto_garantia, estado_botellon, fecha_prevista || null]
    );
    
    await client.query(`UPDATE Productos SET Stock_Disponible = Stock_Disponible - 1 WHERE ID_Producto = $1`, [id_producto]);
    await client.query('COMMIT');
    res.status(201).json({ exito: true, mensaje: 'Salida registrada. Stock actualizado.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ exito: false, mensaje: 'Error al procesar alquiler' });
  } finally {
    client.release();
  }
});

app.get('/api/alquileres/activos', async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT a.ID_Alquiler AS "ID_ALQUILER", c.Carnet_Identidad AS "CARNET_IDENTIDAD", c.Nombre AS "NOMBRE", c.Apellido AS "APELLIDO", 
              p.ID_Producto AS "ID_PRODUCTO", p.Nombre_Producto AS "NOMBRE_PRODUCTO", 
              a.Fecha_Salida AS "FECHA_SALIDA", a.Costo_Por_Dia AS "COSTO_POR_DIA", a.Monto_Garantia AS "MONTO_GARANTIA", a.Estado_Botellon AS "ESTADO_BOTELLON",
              a.Fecha_Prevista AS "FECHA_PREVISTA", c.Telefono AS "TELEFONO", c.Direccion AS "DIRECCION"
       FROM Alquileres a
       JOIN Clientes c ON a.ID_Cliente = c.ID_Cliente
       JOIN Productos p ON a.ID_Producto = p.ID_Producto
       WHERE a.Estado_Alquiler = 'PRESTADO'
       ORDER BY a.Fecha_Salida DESC`
    );
    res.json({ exito: true, activos: resultado.rows });
  } catch (error) { res.status(500).json({ exito: false, mensaje: 'Error al cargar cilindros' }); }
});

app.post('/api/alquileres/devolver', async (req, res) => {
  const { id_alquiler, id_producto } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE Alquileres SET Estado_Alquiler = 'DEVUELTO', Fecha_Devolucion_Real = CURRENT_TIMESTAMP WHERE ID_Alquiler = $1`, [id_alquiler]
    );
    await client.query(`UPDATE Productos SET Stock_Disponible = Stock_Disponible + 1 WHERE ID_Producto = $1`, [id_producto]);
    await client.query('COMMIT');
    res.json({ exito: true, mensaje: 'Cilindro devuelto correctamente. Stock recuperado.' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ exito: false, mensaje: 'Error en la devolución' });
  } finally {
    client.release();
  }
});

// =======================================================
// DASHBOARD
// =======================================================
app.get('/api/dashboard', async (req, res) => {
  const { idUsuario } = req.query;
  try {
    const ingresos = await pool.query(
      `SELECT COALESCE(SUM(Total_Venta), 0) AS "INGRESOS" FROM Ventas WHERE Fecha_Venta::date = CURRENT_DATE AND ID_Usuario = $1`, [idUsuario]
    );
    const cilindros = await pool.query(`SELECT COUNT(*) AS "EN_CALLE" FROM Alquileres WHERE Estado_Alquiler = 'PRESTADO'`);
    const stock = await pool.query(`SELECT COUNT(*) AS "ALERTAS" FROM Productos WHERE Stock_Disponible <= 5 AND Estado = 'ACTIVO'`);

    res.json({
      exito: true,
      ingresosHoy: ingresos.rows[0].INGRESOS,
      cilindrosEnCalle: cilindros.rows[0].EN_CALLE,
      alertasStock: stock.rows[0].ALERTAS
    });
  } catch (error) { res.status(500).json({ exito: false, mensaje: 'Error en dashboard' }); }
});

// =======================================================
// SÚPER REPORTE GENERAL
// =======================================================
app.get('/api/reporte-general', async (req, res) => {
  const { periodo, mes, anio } = req.query; 
  try {
    let filtroVentas = "";
    let filtroAlquileres = "WHERE a.Estado_Alquiler = 'DEVUELTO'";

    const mesNum = Number(mes);
    const anioNum = Number(anio);

    if (periodo === 'HOY') {
      filtroVentas = "WHERE v.Fecha_Venta::date = CURRENT_DATE";
      filtroAlquileres += " AND a.Fecha_Devolucion_Real::date = CURRENT_DATE";
    } else if (periodo === 'MES_ACTUAL') {
      filtroVentas = "WHERE EXTRACT(MONTH FROM v.Fecha_Venta) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM v.Fecha_Venta) = EXTRACT(YEAR FROM CURRENT_DATE)";
      filtroAlquileres += " AND EXTRACT(MONTH FROM a.Fecha_Devolucion_Real) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM a.Fecha_Devolucion_Real) = EXTRACT(YEAR FROM CURRENT_DATE)";
    } else if (periodo === 'MES_ESPECIFICO' && mesNum && anioNum) {
      filtroVentas = `WHERE EXTRACT(MONTH FROM v.Fecha_Venta) = ${mesNum} AND EXTRACT(YEAR FROM v.Fecha_Venta) = ${anioNum}`;
      filtroAlquileres += ` AND EXTRACT(MONTH FROM a.Fecha_Devolucion_Real) = ${mesNum} AND EXTRACT(YEAR FROM a.Fecha_Devolucion_Real) = ${anioNum}`;
    } else if (periodo === 'ANIO_ESPECIFICO' && anioNum) {
      filtroVentas = `WHERE EXTRACT(YEAR FROM v.Fecha_Venta) = ${anioNum}`;
      filtroAlquileres += ` AND EXTRACT(YEAR FROM a.Fecha_Devolucion_Real) = ${anioNum}`;
    }

    const inventario = await pool.query(
      `SELECT Nombre_Producto AS "NOMBRE_PRODUCTO", Categoria AS "CATEGORIA", Stock_Disponible AS "STOCK_DISPONIBLE", Precio AS "PRECIO" 
       FROM Productos WHERE Estado = 'ACTIVO' ORDER BY Categoria, Nombre_Producto`
    );

    const ventas = await pool.query(
      `SELECT v.ID_Venta AS "ID_VENTA", v.Fecha_Venta AS "FECHA_VENTA", v.Total_Venta AS "TOTAL_VENTA", u.Nombre_Completo AS "CAJERO",
              STRING_AGG(d.Cantidad || 'x ' || p.Nombre_Producto, ' + ' ORDER BY p.Nombre_Producto) AS "DETALLE_COMPLETO"
       FROM Ventas v
       JOIN Detalle_Ventas d ON v.ID_Venta = d.ID_Venta
       JOIN Productos p ON d.ID_Producto = p.ID_Producto
       JOIN Usuarios u ON v.ID_Usuario = u.ID_Usuario
       ${filtroVentas}
       GROUP BY v.ID_Venta, v.Fecha_Venta, v.Total_Venta, u.Nombre_Completo
       ORDER BY v.ID_Venta DESC`
    );

    const alquileres = await pool.query(
      `SELECT c.Nombre || ' ' || c.Apellido AS "CLIENTE", c.Carnet_Identidad AS "CI", p.Nombre_Producto AS "NOMBRE_PRODUCTO", 
              a.Fecha_Salida AS "FECHA_SALIDA", a.Fecha_Devolucion_Real AS "FECHA_DEVOLUCION_REAL", a.Monto_Garantia AS "GARANTIA", 
              a.Costo_Por_Dia AS "COSTO_DIA", u.Nombre_Completo AS "CAJERO",
              GREATEST(a.Fecha_Devolucion_Real::date - a.Fecha_Salida::date, 1) AS "DIAS_COBRADOS",
              (GREATEST(a.Fecha_Devolucion_Real::date - a.Fecha_Salida::date, 1) * a.Costo_Por_Dia) AS "TOTAL_COBRADO"
       FROM Alquileres a
       JOIN Clientes c ON a.ID_Cliente = c.ID_Cliente
       JOIN Productos p ON a.ID_Producto = p.ID_Producto
       JOIN Usuarios u ON a.ID_Usuario = u.ID_Usuario
       ${filtroAlquileres}
       ORDER BY a.Fecha_Devolucion_Real DESC`
    );

    res.json({ exito: true, inventario: inventario.rows, ventas: ventas.rows, alquileres: alquileres.rows });
  } catch (error) { res.status(500).json({ exito: false, mensaje: 'Error al generar reporte' }); }
});

// Arrancar
iniciarServidor();
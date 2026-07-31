const { db, closeDb, config } = require("./database");

const categories = [
  "ADAPTADOR DE ENERGIA",
  "BOLSA A PROVA D'ÁGUA",
  "CABOS DE CARREGADOR",
  "CAPAS",
  "CARREGADOR COMPLETO",
  "CARREGADOR VEICULAR",
  "CHIP",
  "COPO TÉRMICO",
  "FONES",
  "HOVERBOARD",
  "IPHONES",
  "JBL",
  "LUZ PARA VÍDEO",
  "MAQUININHA DE APARAR PÉ",
  "PELÍCULA DE CÂMERA",
  "PELÍCULAS",
  "PENDRIVE",
  "PERFUMES ÁRABES",
  "POWER BANK",
  "RASTREADOR DE DISPOSITIVO",
  "SMART WATCH",
  "SUPORTE DE CELULAR",
  "TECLADO DE COMPUTADOR",
  "UMIDIFICADOR",
  "VIDEO GAMES",
];

const statements = [
  `CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(40) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    role ENUM('admin','gerente','caixa','vendedor','tecnico') NOT NULL,
    pin VARCHAR(20) NOT NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS role_permissions (
    role_name ENUM('gerente','caixa','vendedor','tecnico') NOT NULL,
    module_key VARCHAR(40) NOT NULL,
    allowed TINYINT(1) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (role_name, module_key)
  )`,
  `CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(40) PRIMARY KEY,
    code VARCHAR(80) NULL,
    name VARCHAR(180) NOT NULL,
    category VARCHAR(80) NOT NULL,
    subcategory VARCHAR(120) NULL,
    supplier VARCHAR(160) NULL,
    unit VARCHAR(40) NULL,
    stock INT NOT NULL DEFAULT 0,
    min_stock INT NOT NULL DEFAULT 0,
    cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    price DECIMAL(12,2) NOT NULL DEFAULT 0,
    wholesale_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    lot VARCHAR(80) NULL,
    validity DATE NULL,
    cover VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS repair_parts (
    id VARCHAR(40) PRIMARY KEY,
    code VARCHAR(80) NULL,
    name VARCHAR(180) NOT NULL,
    category VARCHAR(120) NULL,
    compatible_models VARCHAR(255) NULL,
    supplier VARCHAR(160) NULL,
    unit VARCHAR(40) NULL,
    stock INT NOT NULL DEFAULT 0,
    min_stock INT NOT NULL DEFAULT 0,
    cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    location VARCHAR(120) NULL,
    notes TEXT NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS repair_part_movements (
    id VARCHAR(40) PRIMARY KEY,
    part_id VARCHAR(40) NOT NULL,
    service_id VARCHAR(40) NULL,
    type ENUM('Entrada','Saida','Uso em OS','Ajuste') NOT NULL,
    qty INT NOT NULL,
    unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    description VARCHAR(255) NULL,
    operator VARCHAR(120) NULL,
    movement_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (part_id) REFERENCES repair_parts(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(40) PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    phone VARCHAR(40),
    document VARCHAR(40),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS services (
    id VARCHAR(40) PRIMARY KEY,
    customer VARCHAR(160) NOT NULL,
    phone_model VARCHAR(120) NOT NULL,
    issue TEXT NOT NULL,
    status VARCHAR(60) NOT NULL,
    estimate DECIMAL(12,2) NOT NULL DEFAULT 0,
    opened_at DATE NOT NULL,
    tech VARCHAR(120),
    customer_phone VARCHAR(40) NULL,
    customer_document VARCHAR(40) NULL,
    brand VARCHAR(80) NULL,
    imei VARCHAR(80) NULL,
    password_info VARCHAR(120) NULL,
    accessories TEXT NULL,
    device_condition TEXT NULL,
    diagnosis TEXT NULL,
    solution TEXT NULL,
    parts TEXT NULL,
    labor_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    parts_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    priority VARCHAR(40) NOT NULL DEFAULT 'Normal',
    warranty_days INT NOT NULL DEFAULT 90,
    approved_at DATETIME NULL,
    finished_at DATETIME NULL,
    delivered_at DATETIME NULL,
    notes TEXT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS service_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_id VARCHAR(40) NOT NULL,
    event_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    operator VARCHAR(120) NULL,
    event_type VARCHAR(60) NOT NULL,
    description TEXT NULL,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS sales (
    id VARCHAR(40) PRIMARY KEY,
    shift_id VARCHAR(40),
    sale_date DATE NOT NULL,
    customer VARCHAR(160),
    payment VARCHAR(60) NOT NULL,
    operator VARCHAR(120) NOT NULL,
    seller VARCHAR(120) NULL,
    discount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    fiscal_status VARCHAR(40) NOT NULL DEFAULT 'pendente',
    fiscal_key VARCHAR(60),
    fiscal_protocol VARCHAR(80),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS sale_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id VARCHAR(40) NOT NULL,
    product_id VARCHAR(40) NOT NULL,
    product_name VARCHAR(180) NOT NULL,
    qty INT NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS sale_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id VARCHAR(40) NOT NULL,
    method VARCHAR(60) NOT NULL,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    details VARCHAR(120) NULL,
    installments INT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS cash_movements (
    id VARCHAR(40) PRIMARY KEY,
    shift_id VARCHAR(40),
    type ENUM('Entrada','Saída') NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    movement_date DATE NOT NULL,
    operator VARCHAR(120)
  )`,
  `CREATE TABLE IF NOT EXISTS cash_shifts (
    id VARCHAR(40) PRIMARY KEY,
    shift_name VARCHAR(80) NOT NULL,
    operator VARCHAR(120) NOT NULL,
    opening_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    business_date DATE NULL,
    opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME NULL,
    closing_amount DECIMAL(12,2) NULL,
    expected_amount DECIMAL(12,2) NULL,
    difference_amount DECIMAL(12,2) NULL,
    status ENUM('open','closed') NOT NULL DEFAULT 'open',
    notes TEXT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS app_settings (
    setting_key VARCHAR(80) PRIMARY KEY,
    setting_value TEXT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS purchase_documents (
    id VARCHAR(40) PRIMARY KEY,
    document_type VARCHAR(80) NOT NULL DEFAULT 'Nota de compra de aparelho',
    document_date DATE NOT NULL,
    customer_name VARCHAR(160) NOT NULL,
    customer_document VARCHAR(40) NULL,
    customer_phone VARCHAR(40) NULL,
    customer_address VARCHAR(255) NULL,
    customer_district VARCHAR(120) NULL,
    customer_zip VARCHAR(40) NULL,
    customer_city VARCHAR(120) NULL,
    customer_state VARCHAR(30) NULL,
    device_brand VARCHAR(80) NULL,
    device_model VARCHAR(120) NOT NULL,
    device_imei VARCHAR(80) NULL,
    device_serial VARCHAR(80) NULL,
    device_color VARCHAR(60) NULL,
    device_storage VARCHAR(60) NULL,
    device_condition TEXT NULL,
    accessories TEXT NULL,
    quantity INT NOT NULL DEFAULT 1,
    warranty_months INT NOT NULL DEFAULT 6,
    purchase_value DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(80) NULL,
    notes TEXT NULL,
    operator VARCHAR(120) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS online_orders (
    id VARCHAR(40) PRIMARY KEY,
    customer_name VARCHAR(160) NOT NULL,
    customer_phone VARCHAR(40) NOT NULL,
    customer_document VARCHAR(40) NULL,
    delivery_type VARCHAR(40) NOT NULL DEFAULT 'Retirada',
    payment_method VARCHAR(60) NULL,
    address VARCHAR(255) NULL,
    notes TEXT NULL,
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(40) NOT NULL DEFAULT 'Novo',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS online_order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(40) NOT NULL,
    product_id VARCHAR(40) NOT NULL,
    product_name VARCHAR(180) NOT NULL,
    qty INT NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES online_orders(id) ON DELETE CASCADE
  )`,
];

const seeds = [
  `INSERT IGNORE INTO users (id, name, role, pin, active) VALUES
    ('u1','Administrador','admin','1234',1),
    ('u3','Vendedor','vendedor','3333',1),
    ('u4','Técnico','tecnico','4444',1)`,
  `INSERT IGNORE INTO products (id, name, category, stock, min_stock, cost, price) VALUES
    ('p1','iPhone 11 128GB','IPHONES',4,1,1450,1899),
    ('p2','Samsung A34 5G','CHIP',6,2,1220,1699),
    ('p3','Xiaomi Redmi Note 13','CHIP',8,2,980,1399),
    ('p4','Película 3D Premium','PELÍCULAS',42,10,8,35),
    ('p5','Carregador Turbo USB-C','CARREGADOR COMPLETO',21,6,32,79.90),
    ('p6','Capa Silicone Reforçada','CAPAS',33,8,12,49.90)`,
  `INSERT IGNORE INTO customers (id, name, phone, document) VALUES
    ('c1','Mariana Costa','(11) 98888-1212','123.456.789-00'),
    ('c2','Rafael Lima','(11) 97777-3434','987.654.321-00')`,
  `INSERT IGNORE INTO services (id, customer, phone_model, issue, status, estimate, opened_at, tech) VALUES
    ('s1','Mariana Costa','iPhone XR','Troca de tela e revisão do conector','Em diagnóstico',420,CURRENT_DATE,'Técnico'),
    ('s2','Rafael Lima','Samsung A52','Bateria descarregando rápido','Aguardando peça',180,CURRENT_DATE,'Técnico')`,
  `INSERT IGNORE INTO cash_movements (id, type, description, amount, movement_date, operator) VALUES
    ('m1','Entrada','Fundo inicial',250,CURRENT_DATE,'Administrador')`,
];

const permissionSeeds = {
  gerente: ["dashboard", "pos", "inventory", "parts", "services", "customers", "purchases", "documents", "operators", "reports", "settings", "backup"],
  vendedor: ["dashboard", "pos", "inventory", "services", "customers", "purchases", "documents", "reports"],
  tecnico: ["dashboard", "pos", "inventory", "parts", "services", "customers", "purchases", "documents", "reports"],
};

const allPermissionModules = [
  "dashboard",
  "pos",
  "inventory",
  "parts",
  "services",
  "customers",
  "purchases",
  "documents",
  "operators",
  "permissions",
  "reports",
  "settings",
  "backup",
];

async function migrate() {
  const connection = db();
  for (const sql of statements) await connection.query(sql);
  await connection.query("ALTER TABLE users MODIFY role ENUM('admin','gerente','caixa','vendedor','tecnico') NOT NULL");
  await connection.query("ALTER TABLE role_permissions MODIFY role_name ENUM('gerente','caixa','vendedor','tecnico') NOT NULL");
  await ensureColumn(connection, "sales", "shift_id", "VARCHAR(40) NULL");
  await ensureColumn(connection, "sales", "status", "VARCHAR(30) NOT NULL DEFAULT 'active'");
  await ensureColumn(connection, "sales", "canceled_at", "DATETIME NULL");
  await ensureColumn(connection, "sales", "canceled_by", "VARCHAR(120) NULL");
  await ensureColumn(connection, "sales", "cancel_reason", "VARCHAR(255) NULL");
  await ensureColumn(connection, "sales", "seller", "VARCHAR(120) NULL");
  await ensureColumn(connection, "cash_movements", "shift_id", "VARCHAR(40) NULL");
  await ensureColumn(connection, "cash_movements", "sale_id", "VARCHAR(40) NULL");
  await ensureColumn(connection, "cash_shifts", "business_date", "DATE NULL");
  await ensureColumn(connection, "products", "code", "VARCHAR(80) NULL");
  await ensureColumn(connection, "products", "subcategory", "VARCHAR(120) NULL");
  await ensureColumn(connection, "products", "supplier", "VARCHAR(160) NULL");
  await ensureColumn(connection, "products", "unit", "VARCHAR(40) NULL");
  await ensureColumn(connection, "products", "wholesale_price", "DECIMAL(12,2) NOT NULL DEFAULT 0");
  await ensureColumn(connection, "products", "lot", "VARCHAR(80) NULL");
  await ensureColumn(connection, "products", "validity", "DATE NULL");
  await ensureColumn(connection, "products", "cover", "VARCHAR(255) NULL");
  await ensureColumn(connection, "services", "customer_phone", "VARCHAR(40) NULL");
  await ensureColumn(connection, "services", "customer_document", "VARCHAR(40) NULL");
  await ensureColumn(connection, "services", "brand", "VARCHAR(80) NULL");
  await ensureColumn(connection, "services", "imei", "VARCHAR(80) NULL");
  await ensureColumn(connection, "services", "password_info", "VARCHAR(120) NULL");
  await ensureColumn(connection, "services", "accessories", "TEXT NULL");
  await ensureColumn(connection, "services", "device_condition", "TEXT NULL");
  await ensureColumn(connection, "services", "diagnosis", "TEXT NULL");
  await ensureColumn(connection, "services", "solution", "TEXT NULL");
  await ensureColumn(connection, "services", "parts", "TEXT NULL");
  await ensureColumn(connection, "services", "labor_cost", "DECIMAL(12,2) NOT NULL DEFAULT 0");
  await ensureColumn(connection, "services", "parts_cost", "DECIMAL(12,2) NOT NULL DEFAULT 0");
  await ensureColumn(connection, "services", "priority", "VARCHAR(40) NOT NULL DEFAULT 'Normal'");
  await ensureColumn(connection, "services", "warranty_days", "INT NOT NULL DEFAULT 90");
  await ensureColumn(connection, "services", "approved_at", "DATETIME NULL");
  await ensureColumn(connection, "services", "finished_at", "DATETIME NULL");
  await ensureColumn(connection, "services", "delivered_at", "DATETIME NULL");
  await ensureColumn(connection, "services", "notes", "TEXT NULL");
  await ensureColumn(connection, "purchase_documents", "customer_district", "VARCHAR(120) NULL");
  await ensureColumn(connection, "purchase_documents", "customer_zip", "VARCHAR(40) NULL");
  await ensureColumn(connection, "purchase_documents", "customer_city", "VARCHAR(120) NULL");
  await ensureColumn(connection, "purchase_documents", "customer_state", "VARCHAR(30) NULL");
  await ensureColumn(connection, "purchase_documents", "quantity", "INT NOT NULL DEFAULT 1");
  await ensureColumn(connection, "purchase_documents", "warranty_months", "INT NOT NULL DEFAULT 6");
  await ensureColumn(connection, "online_orders", "payment_method", "VARCHAR(60) NULL");
  await ensureIndex(connection, "products", "idx_products_code_unique", "CREATE UNIQUE INDEX idx_products_code_unique ON products (code)");
  for (const name of categories) {
    await connection.query("INSERT IGNORE INTO categories (name) VALUES (?)", [name]);
  }
  for (const [role, modules] of Object.entries(permissionSeeds)) {
    for (const module of allPermissionModules) {
      await connection.query(
        "INSERT IGNORE INTO role_permissions (role_name, module_key, allowed) VALUES (?, ?, ?)",
        [role, module, modules.includes(module) ? 1 : 0],
      );
      if (modules.includes(module)) {
        await connection.query("UPDATE role_permissions SET allowed = 1 WHERE role_name = ? AND module_key = ?", [role, module]);
      }
    }
  }
  await connection.query("UPDATE users SET active = 0 WHERE role = 'caixa'");
  await seedSetting(connection, "store.name", "Griffy Store");
  await seedSetting(connection, "store.phone", "");
  await seedSetting(connection, "store.cnpj", "");
  await seedSetting(connection, "store.ie", "");
  await seedSetting(connection, "store.address", "");
  await seedSetting(connection, "store.whatsapp", "");
  await seedSetting(connection, "store.instagram", "https://www.instagram.com/griffy_storeoficial_gs/");
  await seedSetting(connection, "site.theme", "auto");
  await seedSetting(connection, "site.promo.enabled", "false");
  await seedSetting(connection, "site.promo.title", "Promocao Griffy Store");
  await seedSetting(connection, "site.promo.text", "Ofertas especiais por tempo limitado.");
  await seedSetting(connection, "site.promo.buttonText", "Ver ofertas");
  await seedSetting(connection, "site.promo.target", "./catalogo.html");
  await seedSetting(connection, "site.themes", "[]");
  await seedSetting(connection, "fiscal.provider", "");
  await seedSetting(connection, "fiscal.enabled", "false");
  await seedSetting(connection, "fiscal.environment", "homologacao");
  await seedSetting(connection, "sales.cancel_by_operator", "false");
  await seedSetting(connection, "sales.cancel_operator_ids", "[]");
  for (const sql of seeds) await connection.query(sql);
  console.log(`Banco preparado: ${config.database} em ${config.host}:${config.port}`);
}

async function seedSetting(connection, key, value) {
  await connection.query("INSERT IGNORE INTO app_settings (setting_key, setting_value) VALUES (?, ?)", [key, value]);
}

async function ensureColumn(connection, table, column, definition) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  );
  if (Number(rows[0].total) === 0) {
    await connection.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function ensureIndex(connection, table, index, statement) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, index],
  );
  if (Number(rows[0].total) === 0) {
    await connection.query(statement);
  }
}

if (require.main === module) {
  migrate()
    .then(closeDb)
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

module.exports = { migrate };

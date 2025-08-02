const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: process.env.DB_CHARSET
};

const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const initDatabase = async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      // port: process.env.DB_PORT
    });
    await connection.end();

    await createTables();
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
};

const createTables = async () => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS presentations (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        creator_nickname VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS slides (
        id VARCHAR(36) PRIMARY KEY,
        presentation_id VARCHAR(36) NOT NULL,
        slide_order INT DEFAULT 0,
        background_color VARCHAR(7) DEFAULT '#ffffff',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (presentation_id) REFERENCES presentations(id) ON DELETE CASCADE
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS slide_elements (
        id VARCHAR(36) PRIMARY KEY,
        slide_id VARCHAR(36) NOT NULL,
        type ENUM('text', 'shape', 'image', 'drawing') NOT NULL,
        content JSON NOT NULL,
        x FLOAT DEFAULT 0,
        y FLOAT DEFAULT 0,
        width FLOAT DEFAULT 100,
        height FLOAT DEFAULT 50,
        styles JSON,
        z_index INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (slide_id) REFERENCES slides(id) ON DELETE CASCADE
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS presentation_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        presentation_id VARCHAR(36) NOT NULL,
        nickname VARCHAR(100) NOT NULL,
        socket_id VARCHAR(100),
        role ENUM('creator', 'editor', 'viewer') DEFAULT 'viewer',
        is_active BOOLEAN DEFAULT TRUE,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (presentation_id) REFERENCES presentations(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_presentation (presentation_id, nickname)
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS element_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        element_id VARCHAR(36),
        slide_id VARCHAR(36) NOT NULL,
        action ENUM('create', 'update', 'delete') NOT NULL,
        data_before JSON,
        data_after JSON,
        user_nickname VARCHAR(100) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (slide_id) REFERENCES slides(id) ON DELETE CASCADE
      )
    `);

    console.log('All tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
};

module.exports = { pool, initDatabase };
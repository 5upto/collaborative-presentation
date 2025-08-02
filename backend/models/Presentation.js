// const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { pool: db } = require('../config/database');

class Presentation {
  static async create(title, creatorNickname) {
    const id = uuidv4();
    const query = `
      INSERT INTO presentations (id, title, creator_nickname, created_at, updated_at)
      VALUES (?, ?, ?, NOW(), NOW())
    `;
    await db.execute(query, [id, title, creatorNickname]);
    return id;
  }

  static async getAll() {
    const query = `
      SELECT p.*, 
             (SELECT COUNT(*) FROM slides WHERE presentation_id = p.id) as slide_count,
             (SELECT COUNT(*) FROM presentation_users WHERE presentation_id = p.id AND is_active = 1) as active_users
      FROM presentations p
      ORDER BY p.updated_at DESC
    `;
    const [rows] = await db.execute(query);
    return rows;
  }

  static async getById(id) {
    const query = 'SELECT * FROM presentations WHERE id = ?';
    const [rows] = await db.execute(query, [id]);
    return rows[0];
  }

  static async updateLastActivity(id) {
    const query = 'UPDATE presentations SET updated_at = NOW() WHERE id = ?';
    await db.execute(query, [id]);
  }

  static async delete(id) {
    const query = 'DELETE FROM presentations WHERE id = ?';
    await db.execute(query, [id]);
  }
}

module.exports = Presentation;
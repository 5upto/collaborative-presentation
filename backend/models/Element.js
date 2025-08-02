const { pool: db } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Element {
  static async create(slideId, elementData) {
    const id = uuidv4();
    const query = `
      INSERT INTO slide_elements (id, slide_id, type, content, x, y, width, height, styles, z_index, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    const { type, content, x, y, width, height, styles, zIndex } = elementData;
    await db.execute(query, [
      id, slideId, type, JSON.stringify(content), x, y, width, height, 
      JSON.stringify(styles || {}), zIndex || 1
    ]);
    return id;
  }

  static async update(id, elementData) {
    const query = `
      UPDATE slide_elements 
      SET content = ?, x = ?, y = ?, width = ?, height = ?, styles = ?, z_index = ?, updated_at = NOW()
      WHERE id = ?
    `;
    const { content, x, y, width, height, styles, zIndex } = elementData;
    await db.execute(query, [
      JSON.stringify(content), x, y, width, height, 
      JSON.stringify(styles || {}), zIndex || 1, id
    ]);
  }

  static async delete(id) {
    const query = 'DELETE FROM slide_elements WHERE id = ?';
    await db.execute(query, [id]);
  }

  static async getById(id) {
    const query = 'SELECT * FROM slide_elements WHERE id = ?';
    const [rows] = await db.execute(query, [id]);
    return rows[0];
  }
}

module.exports = Element;
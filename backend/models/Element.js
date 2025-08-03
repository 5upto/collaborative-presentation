const { pool: db } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Element {
  static async create(slideId, elementData) {
    const id = elementData.id || uuidv4();
    // Ensure zIndex is within valid range
    const zIndex = Math.max(0, Math.min(elementData.zIndex || 1, 999999));
    const query = `
      INSERT INTO slide_elements (id, slide_id, type, content, x, y, width, height, styles, z_index, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    const { type, content, x, y, width, height, styles } = elementData;
    try {
      await db.execute(query, [
        id, slideId, type, JSON.stringify(content || {}), x || 0, y || 0, width || 100, height || 50, 
        JSON.stringify(styles || {}), zIndex
      ]);
      return id;
    } catch (error) {
      console.error('Element creation error:', error);
      throw new Error(`Failed to create element: ${error.message}`);
    }
  }

  static async update(id, elementData) {
    const query = `
      UPDATE slide_elements 
      SET content = ?, x = ?, y = ?, width = ?, height = ?, styles = ?, z_index = ?, updated_at = NOW()
      WHERE id = ?
    `;
    const { content, x, y, width, height, styles, zIndex } = elementData;
    // Ensure zIndex is within valid range
    const safeZIndex = Math.max(0, Math.min(zIndex || 1, 999999));
    try {
      await db.execute(query, [
        JSON.stringify(content), x, y, width, height, 
        JSON.stringify(styles || {}), safeZIndex, id
      ]);
    } catch (error) {
      console.error('Element update error:', error);
      throw new Error(`Failed to update element: ${error.message}`);
    }
  }

  static async delete(id) {
    const query = 'DELETE FROM slide_elements WHERE id = ?';
    await db.execute(query, [id]);
  }

  static async deleteBySlideId(slideId) {
    const query = 'DELETE FROM slide_elements WHERE slide_id = ?';
    await db.execute(query, [slideId]);
  }

  static async getById(id) {
    const query = 'SELECT * FROM slide_elements WHERE id = ?';
    const [rows] = await db.execute(query, [id]);
    return rows[0];
  }

  static async getBySlideId(slideId) {
    const [rows] = await db.execute(
      'SELECT * FROM slide_elements WHERE slide_id = ? ORDER BY z_index ASC LIMIT 1000',
      [slideId]
    );
    return rows.map(row => ({
      ...row,
      content: JSON.parse(row.content),
      styles: JSON.parse(row.styles || '{}')
    }));
  }
}

module.exports = Element;
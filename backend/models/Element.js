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

  static async getById(id) {
    const query = 'SELECT * FROM slide_elements WHERE id = ?';
    const [rows] = await db.execute(query, [id]);
    if (rows[0]) {
      return {
        ...rows[0],
        content: JSON.parse(rows[0].content || '{}'),
        styles: JSON.parse(rows[0].styles || '{}'),
        zIndex: rows[0].z_index
      };
    }
    return null;
  }

  static async update(id, elementData) {
    const query = `
      UPDATE slide_elements 
      SET type = ?, x = ?, y = ?, width = ?, height = ?, 
          content = ?, styles = ?, z_index = ?
      WHERE id = ?
    `;

    await db.execute(query, [
      elementData.type,
      Number(elementData.x) || 0,
      Number(elementData.y) || 0,
      Number(elementData.width) || 100,
      Number(elementData.height) || 50,
      JSON.stringify(elementData.content || {}),
      JSON.stringify(elementData.styles || {}),
      Number(elementData.zIndex) || 1,
      id
    ]);
  }

  static async delete(id) {
    const query = 'DELETE FROM slide_elements WHERE id = ?';
    await db.execute(query, [id]);
  }

  static async deleteBySlideId(slideId) {
    const query = 'DELETE FROM slide_elements WHERE slide_id = ?';
    await db.execute(query, [slideId]);
  }

  static async getBySlideId(slideId) {
    const [rows] = await db.execute(
      'SELECT * FROM slide_elements WHERE slide_id = ? ORDER BY z_index ASC LIMIT 1000',
      [slideId]
    );
    return rows.map(row => ({
      ...row,
      content: JSON.parse(row.content),
      styles: JSON.parse(row.styles || '{}'),
      zIndex: row.z_index
    }));
  }
}

module.exports = Element;
const { pool: db } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Slide {
  static async create(presentationId, order = 0) {
    const id = uuidv4();
    const query = `
      INSERT INTO slides (id, presentation_id, slide_order, created_at, updated_at)
      VALUES (?, ?, ?, NOW(), NOW())
    `;
    await db.execute(query, [id, presentationId, order]);
    return id;
  }

  static async getByPresentationId(presentationId) {
    const query = `
      SELECT s.*, 
             JSON_ARRAYAGG(
               CASE WHEN e.id IS NOT NULL THEN
                 JSON_OBJECT(
                   'id', e.id,
                   'type', e.type,
                   'content', e.content,
                   'x', e.x,
                   'y', e.y,
                   'width', e.width,
                   'height', e.height,
                   'styles', e.styles,
                   'z_index', e.z_index
                 )
               END
             ) as elements
      FROM slides s
      LEFT JOIN slide_elements e ON s.id = e.slide_id
      WHERE s.presentation_id = ?
      GROUP BY s.id
      ORDER BY s.slide_order
    `;
    const [rows] = await db.execute(query, [presentationId]);
    return rows.map(row => ({
      ...row,
      elements: row.elements[0] ? row.elements.filter(e => e !== null) : []
    }));
  }

  static async delete(id) {
    const query = 'DELETE FROM slides WHERE id = ?';
    await db.execute(query, [id]);
  }

  static async updateOrder(id, order) {
    const query = 'UPDATE slides SET slide_order = ?, updated_at = NOW() WHERE id = ?';
    await db.execute(query, [order, id]);
  }
}

module.exports = Slide;
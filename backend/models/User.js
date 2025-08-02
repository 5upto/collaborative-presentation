const { pool: db } = require('../config/database');

class User {
  static async joinPresentation(presentationId, nickname, socketId, role = 'viewer') {
    const query = `
      INSERT INTO presentation_users (presentation_id, nickname, socket_id, role, is_active, joined_at)
      VALUES (?, ?, ?, ?, 1, NOW())
      ON DUPLICATE KEY UPDATE 
        socket_id = VALUES(socket_id),
        is_active = 1,
        joined_at = NOW()
    `;
    await db.execute(query, [presentationId, nickname, socketId, role]);
  }

  static async leavePresentation(socketId) {
    const query = 'UPDATE presentation_users SET is_active = 0 WHERE socket_id = ?';
    await db.execute(query, [socketId]);
  }

  static async getActiveUsers(presentationId) {
    const query = `
      SELECT nickname, role, socket_id, joined_at
      FROM presentation_users
      WHERE presentation_id = ? AND is_active = 1
      ORDER BY joined_at
    `;
    const [rows] = await db.execute(query, [presentationId]);
    return rows;
  }

  static async updateRole(presentationId, nickname, role) {
    const query = `
      UPDATE presentation_users 
      SET role = ? 
      WHERE presentation_id = ? AND nickname = ?
    `;
    await db.execute(query, [role, presentationId, nickname]);
  }

  static async getBySocketId(socketId) {
    const query = `
      SELECT * FROM presentation_users 
      WHERE socket_id = ? AND is_active = 1
    `;
    const [rows] = await db.execute(query, [socketId]);
    return rows[0];
  }
}

module.exports = User;
const bcrypt = require('bcrypt');
const pool = require('../db/db.js');

const registerUser = async (req, res) => {
  const { full_name, email, password, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (user_id, full_name, email, password, role) VALUES (gen_random_uuid(), $1, $2, $3, $4) RETURNING *',
      [full_name, email, hashedPassword, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
module.exports = { registerUser };
const express = require('express');
const router = express.Router();
const pool = require('../db/db');

router.get('/api/search', async (req, res) => {
  const query = req.query.q;

  if (!query || query.trim() === '') {
    return res.json([]); // return empty array
  }

  try {
    const result = await pool.query(
      'SELECT "username", "Role" FROM "Users" WHERE username LIKE $1',
      [`%${query}%`]
    );

    res.json(result.rows); // send user list as JSON
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;

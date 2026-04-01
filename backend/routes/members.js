const express = require('express');
const pool    = require('../db');
const auth    = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/members — liste tous les membres (id + rp_name) pour les selects
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, rp_name FROM users ORDER BY rp_name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;

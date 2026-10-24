const express = require('express');
const router = express.Router();

const { getLogs, clearLogs, deleteLog } = require('../controllers/logs.controller');

router.get('/',        getLogs);
router.delete('/',      clearLogs);
router.delete('/:id',   deleteLog);

module.exports = router;

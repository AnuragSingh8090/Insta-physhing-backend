const express = require('express');
const router = express.Router();

const { getMeta, getLogs, clearLogs, deleteLog } = require('../controllers/logs.controller');

router.get('/meta',    getMeta);     // must be before /:id
router.get('/',        getLogs);
router.delete('/',     clearLogs);
router.delete('/:id',  deleteLog);

module.exports = router;

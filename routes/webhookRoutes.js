// routes/webhookRoutes.js
const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

router.post('/', webhookController.receiveWebhook);
router.get('/', webhookController.getEvents);

module.exports = router;

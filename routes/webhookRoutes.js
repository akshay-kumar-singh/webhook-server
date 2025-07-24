const express = require("express");
const router = express.Router();
const webhookController = require("../controllers/webhookController");
const githubController = require("../controllers/githubController");

router.post("/", webhookController.receiveWebhook);

router.get("/events", webhookController.getEvents);
router.get("/events/stats", webhookController.getRepoStats);
router.get("/events/trends", webhookController.getActivityTrends);
router.get("/events/distribution", webhookController.getEventDistribution);

router.get("/repos", githubController.getAllUserRepos);
router.get("/repos/total-lines", webhookController.getTotalLinesOfCode);
router.get("/repos/initialize", webhookController.initializeRepos);
router.get("/streak", webhookController.getStreakData);

module.exports = router;

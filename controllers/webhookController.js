const Event = require("../models/Event");
const formatDate = require("../utils/formatDate");

exports.receiveWebhook = async (req, res) => {
  try {
    const eventType = req.headers["x-github-event"];
    const event = req.body;

    const payload = {
      action: event.action || eventType,
      author: event.sender?.login || "Unknown",
      repo: event.repository?.full_name || "Unknown",
      commit_messages: [],
      from_branch: event.pull_request?.head?.ref || event.ref?.split("/").pop(),
      to_branch: event.pull_request?.base?.ref || event.base_ref || "main",
      timestamp: new Date(),
    };

    // Handle commit messages for push events
    if (eventType === "push" && event.commits) {
      payload.commit_messages = event.commits.map(commit => commit.message);
    }

    const duplicate = await Event.findOne({
      action: payload.action,
      author: payload.author,
      repo: payload.repo,
      from_branch: payload.from_branch,
      to_branch: payload.to_branch,
      timestamp: { $gte: new Date(Date.now() - 10000) }, // 10s duplicate filter
    });

    if (duplicate) {
      return res.status(200).json({ message: "Duplicate event ignored" });
    }

    await Event.create(payload);
    res.status(201).json({ message: "Event saved successfully" });
  } catch (err) {
    console.error("❌ Error saving event:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getEvents = async (req, res) => {
  try {
    const events = await Event.find({}).sort({ timestamp: -1 }).limit(20);

    res.status(200).json(events.map(event => ({
      ...event._doc,
      formatted: formatDate(event),
    })));
  } catch (err) {
    console.error("❌ Error fetching events:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

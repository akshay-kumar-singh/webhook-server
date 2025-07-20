const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  action: { type: String, required: true },
  author: String,
  repo: String,
  commit_messages: [String],
  from_branch: String,
  to_branch: String,
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Event', eventSchema);

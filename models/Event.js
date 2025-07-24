const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    author: {
      type: String,
      default: "Unknown",
      index: true,
    },
    repo: {
      type: String,
      required: true,
      index: true,
    },
    commit_messages: [String],
    from_branch: String,
    to_branch: String,
    lines_changed: {
      type: Number,
      default: 0,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

eventSchema.index({
  action: 1,
  author: 1,
  repo: 1,
  from_branch: 1,
  to_branch: 1,
  timestamp: 1,
});

module.exports = mongoose.model("Event", eventSchema);

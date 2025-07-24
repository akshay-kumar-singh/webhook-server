const mongoose = require("mongoose");

const repositorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  fullName: {
    type: String,
    required: true,
    unique: true,
  },
  totalLines: {
    type: Number,
    default: 0,
  },
  languages: {
    type: Object,
    default: {},
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Repository", repositorySchema);

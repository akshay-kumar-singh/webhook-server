const Event = require("../models/Event");
const Repository = require("../models/Repository");
const formatDate = require("../utils/formatDate");
const GitHubService = require("../services/githubService");

exports.receiveWebhook = async (req, res) => {
  try {
    const eventType = req.headers["x-github-event"];
    const event = req.body;
    const repoFullName = event.repository?.full_name;

    if (!repoFullName) {
      return res.status(400).json({ message: "No repository information" });
    }

    let repoRecord = await Repository.findOne({ fullName: repoFullName });
    if (!repoRecord) {
      repoRecord = await Repository.create({
        name: repoFullName.split("/")[1],
        fullName: repoFullName,
        totalLines: 0,
        languages: {},
      });
    }

    const payload = {
      action: event.action || eventType,
      author: event.sender?.login || "Unknown",
      repo: repoFullName,
      commit_messages: [],
      from_branch: event.pull_request?.head?.ref || event.ref?.split("/").pop(),
      to_branch: event.pull_request?.base?.ref || event.base_ref || "main",
      timestamp: new Date(),
      lines_changed: 0,
    };

    let linesChanged = 0;
    if (eventType === "push" && event.commits) {
      const result = await processPushEvent(event, repoFullName);
      linesChanged = result.linesChanged;
      payload.commit_messages = result.commitMessages;
    } else if (eventType === "pull_request" && event.pull_request) {
      linesChanged = await processPullRequestEvent(event, repoFullName);
    }

    if (linesChanged !== 0) {
      payload.lines_changed = linesChanged;
      repoRecord.totalLines = Math.max(0, repoRecord.totalLines + linesChanged);
      await repoRecord.save();
    }

    const duplicate = await Event.findOne({
      action: payload.action,
      author: payload.author,
      repo: payload.repo,
      from_branch: payload.from_branch,
      to_branch: payload.to_branch,
      timestamp: { $gte: new Date(Date.now() - 10000) },
    });

    if (duplicate) {
      return res.status(200).json({ message: "Duplicate event ignored" });
    }

    await Event.create(payload);
    res.status(201).json({ message: "Event processed successfully" });
  } catch (err) {
    console.error("❌ Error processing webhook:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

async function processPushEvent(event, repoFullName) {
  const githubToken = process.env.GITHUB_TOKEN;
  const githubService = new GitHubService(githubToken);

  let totalChanged = 0;
  const commitMessages = [];

  for (const commit of event.commits) {
    commitMessages.push(commit.message);

    try {
      const commitData = await githubService.getCommitDetails(
        repoFullName,
        commit.id
      );
      totalChanged +=
        (commitData.stats?.additions || 0) - (commitData.stats?.deletions || 0);
    } catch (err) {
      console.warn(
        `⚠️ Could not fetch stats for commit ${commit.id}:`,
        err.message
      );
    }
  }

  return { linesChanged: totalChanged, commitMessages };
}

async function processPullRequestEvent(event, repoFullName) {
  if (event.action !== "closed" || !event.pull_request.merged) {
    return 0;
  }

  const githubToken = process.env.GITHUB_TOKEN;
  const githubService = new GitHubService(githubToken);
  let totalChanged = 0;

  try {
    const files = await githubService.getPRFiles(
      repoFullName,
      event.pull_request.number
    );
    totalChanged = files.reduce((sum, file) => {
      return sum + (file.additions || 0) - (file.deletions || 0);
    }, 0);
  } catch (err) {
    console.warn(`⚠️ Could not fetch PR files:`, err.message);
  }

  return totalChanged;
}

exports.getEvents = async (req, res) => {
  try {
    const events = await Event.find({}).sort({ timestamp: -1 }); // No limit
    
    res.status(200).json(
      events.map((event) => ({
        ...event._doc,
        formatted: formatDate(event),
      }))
    );
  } catch (err) {
    console.error("❌ Error fetching events:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getRepoStats = async (req, res) => {
  try {
    const repoStats = await Event.aggregate([
      {
        $group: {
          _id: "$repo",
          eventCount: { $sum: 1 },
          lastActivity: { $max: "$timestamp" },
          totalLinesChanged: { $sum: "$lines_changed" },
        },
      },
      { $sort: { eventCount: -1 } },
      { $limit: 5 },
    ]);

    res.status(200).json(
      repoStats.map((stat) => ({
        name: stat._id.split("/")[1] || stat._id,
        fullName: stat._id,
        eventCount: stat.eventCount,
        lastActivity: stat.lastActivity,
        linesChanged: stat.totalLinesChanged,
      }))
    );
  } catch (err) {
    console.error("❌ Error fetching repo stats:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getActivityTrends = async (req, res) => {
  try {
    const timeRange = req.query.range || "week";
    let dateFilter = new Date();

    switch (timeRange) {
      case "7d":
      case "300":
        dateFilter.setDate(dateFilter.getDate() - 7);
        break;
      case "30d":
      case "900":
        dateFilter.setMonth(dateFilter.getMonth() - 1);
        break;
      case "1y":
      case "1Y":
        dateFilter.setFullYear(dateFilter.getFullYear() - 1);
        break;
      default:
        dateFilter.setDate(dateFilter.getDate() - 7);
    }

    const dailyActivity = await Event.aggregate([
      {
        $match: {
          timestamp: { $gte: dateFilter },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
          },
          eventCount: { $sum: 1 },
          linesChanged: { $sum: "$lines_changed" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      labels: dailyActivity.map((item) => item._id),
      events: dailyActivity.map((item) => item.eventCount),
      linesChanged: dailyActivity.map((item) => item.linesChanged),
    });
  } catch (err) {
    console.error("❌ Error fetching activity trends:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getEventDistribution = async (req, res) => {
  try {
    const eventDistribution = await Event.aggregate([
      {
        $group: {
          _id: "$action",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({
      labels: eventDistribution.map((item) => item._id),
      values: eventDistribution.map((item) => item.count),
    });
  } catch (err) {
    console.error("❌ Error fetching event distribution:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getTotalLinesOfCode = async (req, res) => {
  try {
    const result = await Repository.aggregate([
      {
        $group: {
          _id: null,
          totalLines: { $sum: "$totalLines" },
          repoCount: { $sum: 1 },
        },
      },
    ]);

    const eventCount = await Event.countDocuments();

    res.status(200).json({
      totalLines: result[0]?.totalLines || 0,
      totalRepositories: result[0]?.repoCount || 0,
      totalEvents: eventCount,
    });
  } catch (err) {
    console.error("❌ Error getting total LOC:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.initializeRepos = async (req, res) => {
  try {
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      return res.status(500).json({ message: "GitHub token not configured" });
    }

    const githubService = new GitHubService(githubToken);
    const userData = await githubService.getUser();
    const repos = await githubService.getAllRepos();

    let initializedCount = 0;
    for (const repo of repos) {
      if (repo.owner.login !== userData.login || repo.fork) continue;

      try {
        const languages = await githubService.getRepoLanguages(repo.full_name);
        const totalLines = Object.values(languages).reduce(
          (sum, val) => sum + val,
          0
        );

        await Repository.findOneAndUpdate(
          { fullName: repo.full_name },
          {
            name: repo.name,
            fullName: repo.full_name,
            totalLines,
            languages,
            lastUpdated: new Date(),
          },
          { upsert: true, new: true }
        );
        initializedCount++;
      } catch (err) {
        console.error(`Error initializing ${repo.full_name}:`, err.message);
      }
    }

    res.status(200).json({
      message: `${initializedCount} repositories initialized successfully`,
      initializedCount,
    });
  } catch (err) {
    console.error("Error initializing repositories:", err);
    res.status(500).json({
      message: "Failed to initialize repositories",
      error: err.message,
    });
  }
};

exports.getStreakData = async (req, res) => {
  try {
    const githubToken = process.env.GITHUB_TOKEN;
    const githubService = new GitHubService(githubToken);

    const response = await githubService.getContributionData();

    const contributionDays =
      response.data.viewer.contributionsCollection.contributionCalendar.weeks.flatMap(
        (week) => week.contributionDays
      );

    const activeDates = contributionDays
      .filter((day) => day.contributionCount > 0)
      .map((day) => day.date);

    const activeSet = new Set(activeDates);
    const allDates = activeDates.map((d) => new Date(d)).sort((a, b) => a - b);

    const getUTCDateString = (date) =>
      new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
        .toISOString()
        .split("T")[0];

    const today = new Date();
    const todayStr = getUTCDateString(today);

    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayStr = getUTCDateString(yesterday);

    let currentStreak = 0;
    let tempDate = new Date(today);

    while (true) {
      const dateStr = getUTCDateString(tempDate);
      if (activeSet.has(dateStr)) {
        currentStreak++;
        tempDate.setUTCDate(tempDate.getUTCDate() - 1);
      } else {
        if (dateStr === todayStr && activeSet.has(yesterdayStr)) {
          tempDate.setUTCDate(tempDate.getUTCDate() - 1);
          continue;
        } else {
          break;
        }
      }
    }

    let longestStreak = 0;
    let tempStreak = 1;

    for (let i = 1; i < allDates.length; i++) {
      const prev = allDates[i - 1];
      const curr = allDates[i];
      const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    res.status(200).json({
      currentStreak,
      longestStreak,
    });
  } catch (err) {
    console.error("❌ Error fetching streak data:", err.message);
    res.status(500).json({ message: "Failed to fetch streak data" });
  }
};

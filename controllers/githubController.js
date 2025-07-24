const GitHubService = require('../services/githubService');
const Repository = require("../models/Repository");

exports.getAllUserRepos = async (req, res) => {
  try {
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      return res.status(500).json({ message: "GitHub token not configured" });
    }

    const githubService = new GitHubService(githubToken);
    const userData = await githubService.getUser();
    const repos = await githubService.getAllRepos();

    const simplified = repos
      .filter((repo) => repo.owner.login === userData.login && !repo.fork)
      .map((repo) => ({
        name: repo.name,
        fullName: repo.full_name,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language,
        private: repo.private,
        url: repo.html_url,
      }));

    res.json({
      totalRepos: simplified.length,
      repos: simplified,
      user: {
        login: userData.login,
        avatar_url: userData.avatar_url,
        name: userData.name,
        bio: userData.bio,
        public_repos: userData.public_repos,
        followers: userData.followers,
        following: userData.following,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching GitHub repos:", err.message);
    res.status(500).json({ message: "Failed to fetch GitHub repositories" });
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
        const totalLines = Object.values(languages).reduce((sum, val) => sum + val, 0);

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

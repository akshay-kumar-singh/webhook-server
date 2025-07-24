const Repository = require("../models/Repository");
const GitHubService = require('../services/githubService');

const syncRepositories = async () => {
  try {
    const githubToken = process.env.GITHUB_TOKEN;
    const githubService = new GitHubService(githubToken);
    
    const repos = await githubService.getAllRepos();

    for (const repo of repos) {
      if (repo.owner.login !== "akshay-kumar-singh" || repo.fork) continue;

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
      } catch (err) {
        console.error(`Error syncing ${repo.full_name}:`, err.message);
      }
    }
  } catch (err) {
    console.error("Error syncing repositories:", err);
  }
};

module.exports = () => {
  const schedule = require("node-schedule");
  schedule.scheduleJob("0 3 * * *", syncRepositories);
};

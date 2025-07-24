const { BASE_URL, PER_PAGE, getAuthHeaders } = require("../config/github");
const axios = require("axios");

class GitHubService {
  constructor(token) {
    this.token = token;
  }

  async getUser() {
    return this._request("/user");
  }

  async getRepos(page = 1) {
    return this._request(`/user/repos?per_page=${PER_PAGE}&page=${page}`);
  }

  async getRepoLanguages(repoFullName) {
    return this._request(`/repos/${repoFullName}/languages`);
  }

  async getCommitDetails(repoFullName, commitId) {
    return this._request(`/repos/${repoFullName}/commits/${commitId}`);
  }

  async getPRFiles(repoFullName, prNumber) {
    return this._request(`/repos/${repoFullName}/pulls/${prNumber}/files`);
  }

  async getAllRepos() {
    const repos = [];
    let page = 1;

    while (true) {
      const data = await this.getRepos(page);
      if (data.length === 0) break;
      repos.push(...data);
      page++;
    }

    return repos;
  }

  async _request(endpoint) {
    const response = await axios.get(`${BASE_URL}${endpoint}`, {
      headers: getAuthHeaders(this.token),
    });
    return response.data;
  }
  async graphqlQuery(query) {
    const response = await axios.post(
      `${BASE_URL}/graphql`,
      { query },
      {
        headers: getAuthHeaders(this.token),
      }
    );
    return response.data;
  }

  async getContributionData() {
    const query = `
      {
        viewer {
          contributionsCollection {
            contributionCalendar {
              weeks {
                contributionDays {
                  date
                  contributionCount
                }
              }
            }
          }
        }
      }
    `;
    return this.graphqlQuery(query);
  }
}

module.exports = GitHubService;

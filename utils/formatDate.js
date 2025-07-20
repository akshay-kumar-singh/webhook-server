module.exports = (event) => {
  const options = {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
    hour12: true,
  };

  const formattedTime = new Date(event.timestamp).toLocaleString(
    "en-IN",
    options
  );

  const repoName = event.repo?.split("/")?.[1] || "unknown";

  const lines = [
    `Author: ${event.author}`,
    `Repo: ${repoName}`,
    `Action: ${
      event.action === "push" ? `pushed to [${event.to_branch}]` : event.action
    }`,
    `Time: ${formattedTime} IST`,
  ];

  if (event.commit_messages && event.commit_messages.length > 0) {
    lines.push("\nCommit Messages:");
    event.commit_messages.forEach((msg) => lines.push(`• ${msg}`));
  }

  return lines.join("\n");
};

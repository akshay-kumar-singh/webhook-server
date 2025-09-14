🔥 Real-Time GitHub Analytics Dashboard (MERN)

A real-time analytics dashboard that visualizes GitHub activity instantly using Webhooks, Node.js, and React.js.
Track commits, pull requests, streaks, language stats, and overall project activity — all in one place.

🌍 Real-World Use Case

Project Management: Helps team leads and managers track who pushed code, merged PRs, and monitor project activity in real-time.

Developers: Stay updated on contributions without manually checking GitHub.

⚡ Features

🪝 Instant Webhooks: Real-time GitHub events (pushes, merges, PRs) delivered instantly

⚡ Smart Backend: Node.js + Express handles events, verifies signatures & calculates stats

🤖 Automated Jobs: Cron jobs refresh repo data daily

📊 Deep Analytics: Streaks, total code lines, language breakdowns, and trends

🎨 Smooth UX: Shimmer UI, animations & responsive design

🛠️ Tech Stack

Frontend: React.js, Tailwind CSS

Backend: Node.js, Express.js

Database: MongoDB

Other Tools: GitHub Webhooks, Cron Jobs

🚀 Getting Started
1️⃣ Clone the Repository
git clone https://github.com/akshay-kumar-singh/github-analytics-dashboard.git
cd github-analytics-dashboard

2️⃣ Install Dependencies
npm install

3️⃣ Setup Environment Variables

Create a .env file in the root directory and add:

MONGO_URI=your_mongodb_uri
GITHUB_WEBHOOK_SECRET=your_secret
PORT=5000

4️⃣ Run the App

Start backend:

npm run server


Start frontend:

npm run client

📸 Screenshots

Add a couple of screenshots here (Dashboard UI, Analytics Page, etc.)

🔗 Live Demo

🌍 Live Project


Contributions are welcome! Feel free to fork this repo, submit issues, and create pull requests.

📜 License

This project is licensed under the MIT License.

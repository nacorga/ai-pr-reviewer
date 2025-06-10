# AI PR Reviewer

An automated bot that reviews GitHub Pull Requests using OpenAI to provide comments and improvement suggestions.

## Features

- Automatic Pull Request review
- Code analysis using OpenAI API
- Detailed comments on modified files
- GitHub integration via webhooks
- Support for PR events: opening, reopening, and synchronization

## Purpose

This application was developed to automate the code review process in GitHub repositories. It helps development teams by:

- Reducing time spent on manual code reviews
- Providing consistent and objective feedback
- Identifying potential issues and improvements
- Maintaining code quality standards

## Requirements

- Node.js
- GitHub account with personal access token
- OpenAI account with API key

## Setup

1. Clone the repository:
```bash
git clone https://github.com/your-username/ai-pr-reviewer.git
cd ai-pr-reviewer
```

2. Install dependencies:
```bash
npm install
```

3. Create and set up environment variables:
```bash
# Create a new .env file
touch .env
```

Add the following environment variables to your `.env` file:
```
# Required: Your GitHub webhook secret for verifying webhook payloads
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# Required: Your GitHub personal access token with repo scope
GITHUB_TOKEN=your_github_token

# Required: Your OpenAI API key for code analysis
OPENAI_API_KEY=your_openai_api_key
```

4. Configure the webhook in your GitHub repository:
   - Go to Settings > Webhooks
   - Add a new webhook
   - URL: `https://your-domain.com/webhooks`
   - Content type: `application/json`
   - Events: Select "Pull request"

## Usage

The bot will automatically trigger when:
- A new Pull Request is opened
- An existing Pull Request is reopened
- A Pull Request is synchronized with new commits

## Development

```bash
# Start the project
npm run start

# Build the project
npm run build
```

## Contributing

Contributions are welcome. Please open an issue first to discuss what you would like to change.

## License

MIT 
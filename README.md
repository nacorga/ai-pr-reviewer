# AI PR Reviewer

An automated bot that reviews GitHub and Bitbucket Pull Requests using OpenAI to provide comments and improvement suggestions.

## Features

- Automatic Pull Request review
- Code analysis using OpenAI API
- Detailed comments on modified files
- GitHub and Bitbucket integration via webhooks
- Support for PR events: opening, reopening, and synchronization
- Custom review guidelines via `.pr-guidelines` folder
- Smart context management for large codebases
- Secure webhook handling with signature verification

## Purpose

This application was developed to automate the code review process in GitHub and Bitbucket repositories. It helps development teams by:

- Reducing time spent on manual code reviews
- Providing consistent and objective feedback
- Identifying potential issues and improvements
- Maintaining code quality standards

## Requirements

- Node.js
- OpenAI account with API key
- At least one of:
  - GitHub account with personal access token
  - Bitbucket account with app password

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
# Required for all providers
OPENAI_API_KEY=your_openai_api_key

# Required for GitHub integration
WEBHOOK_SECRET=your_webhook_secret
GITHUB_TOKEN=your_github_token

# Required for Bitbucket integration
BITBUCKET_USERNAME=your_bitbucket_username
BITBUCKET_APP_PASSWORD=your_bitbucket_app_password
BITBUCKET_WORKSPACE=your_bitbucket_workspace

# Optional: Server port (defaults to 3000)
PORT=3000
```

Note: You only need to configure the variables for the provider(s) you plan to use. At least one provider (GitHub or Bitbucket) must be configured.

4. Configure the webhooks:

### GitHub
- Go to your repository Settings > Webhooks
- Add a new webhook
- URL: `https://your-domain.com/webhooks/github`
- Content type: `application/json`
- Secret: Use the same value as `WEBHOOK_SECRET`
- Events: Select "Pull request"

### Bitbucket
- Go to your repository Settings > Webhooks
- Add a new webhook
- URL: `https://your-domain.com/webhooks/bitbucket`
- Secret: Use the same value as `WEBHOOK_SECRET`
- Triggers: Select "Pull Request" events (Created, Updated, Merged)

## Security

The application implements webhook signature verification for both GitHub and Bitbucket:

- GitHub: Uses HMAC-SHA1 for signature verification
- Bitbucket: Uses HMAC-SHA256 for signature verification

Both providers use the same webhook secret (WEBHOOK_SECRET) for simplicity, but you can use different secrets if needed.

## Custom Guidelines

Add a `.pr-guidelines` folder to your repository with `.md` files containing your review guidelines. The bot will use these as context for reviews.

```
your-repo/
  ├── .pr-guidelines/
  │   ├── code-style.md
  │   └── best-practices.md
  └── ...
```

## Usage

The bot will automatically trigger when:
- A new Pull Request is opened
- An existing Pull Request is reopened
- A Pull Request is synchronized with new commits

## Development

```bash
# Build the project
npm run build

# Start the server
npm run start
```

## Contributing

Contributions are welcome. Please open an issue first to discuss what you would like to change.

## Privacy Notice

This tool sends code changes to the OpenAI API for analysis. Review your privacy requirements and filter any sensitive information before sending.

## License

MIT

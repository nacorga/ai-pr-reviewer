# PR Reviewer

An automated bot that reviews GitHub Pull Requests using OpenAI to provide comments and improvement suggestions.

## Features

- Automatic Pull Request review
- Code analysis using OpenAI
- Detailed comments on modified files
- GitHub integration via webhooks

## Purpose

This application was developed to automate the code review process in GitHub repositories. It helps development teams by:

- Reducing the time spent on manual code reviews
- Providing consistent and objective feedback
- Identifying potential issues and improvements
- Ensuring code quality standards are maintained
- Supporting both small and large codebases

## Usage Instructions

### Basic Usage

1. Once configured, the bot will automatically review any new or updated Pull Requests in your repository.

2. The bot will analyze:
   - Code changes
   - File modifications
   - Overall PR structure

3. Review comments will be posted directly on the PR with:
   - Line-specific suggestions
   - Code improvement recommendations
   - Best practices reminders
   - Potential issues or bugs

### Customization

You can customize the bot's behavior by:

1. Adjusting the OpenAI parameters in your configuration
2. Modifying the webhook settings to trigger on specific events
3. Setting up branch protection rules to require reviews

### Best Practices

- Keep PRs focused and manageable in size
- Respond to bot comments when clarification is needed
- Use the feedback to improve code quality
- Consider the bot's suggestions as part of your review process

## Requirements

- Node.js
- GitHub account with personal access token
- OpenAI account with API key

## Setup

1. Clone the repository:
```bash
git clone https://github.com/your-username/pr-reviewer.git
cd pr-reviewer
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit the `.env` file with your credentials:
```
GITHUB_TOKEN=your_github_token
OPENAI_API_KEY=your_openai_api_key
```

4. Configure the webhook in your GitHub repository:
   - Go to Settings > Webhooks
   - Add a new webhook
   - URL: `https://your-domain.com/webhook`
   - Content type: `application/json`
   - Events: Select "Pull request"

## Usage

The bot will automatically trigger when:
- A new Pull Request is opened
- An existing Pull Request is edited
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
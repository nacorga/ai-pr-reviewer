# 📦 Changelog

All notable changes to this project will be documented in this file.
### [1.0.1](https://github.com/nacorga/ai-pr-reviewer/compare/v1.0.0...v1.0.1) (2025-06-11)


### Features

* add configuration constants for GitHub comment rate limiting and file pattern ignoring ([6eb94cb](https://github.com/nacorga/ai-pr-reviewer/commit/6eb94cb01910549693f01e2df3e34abe1ce9a15f))
* add diffHunk property to Patch interface and GitHubService for improved patch tracking ([2029427](https://github.com/nacorga/ai-pr-reviewer/commit/2029427f33df365c9080885e528752f45acf21b3))
* add PR review prompt constant and refactor OpenAI service to use it ([b39b815](https://github.com/nacorga/ai-pr-reviewer/commit/b39b81589f363618771ccaab4cd3cb56b9459755))
* chunk patches before openai call ([520d341](https://github.com/nacorga/ai-pr-reviewer/commit/520d341968104b28c0e1e99c99b41564c8b8e92b))


### Bug Fixes

* correct line numbers in collectPatches ([e0e60c9](https://github.com/nacorga/ai-pr-reviewer/commit/e0e60c9c0893c2038654d9e53d43bde3435ec98f))
* improve validation for review comments by checking patch position ([9cf3036](https://github.com/nacorga/ai-pr-reviewer/commit/9cf30369d5fd59230373c160fdf6931a3725cc5c))
* update review comment creation to use line instead of position and prevent duplicates ([c507e6e](https://github.com/nacorga/ai-pr-reviewer/commit/c507e6e52cc343ca512b1d1d25c5541f61af1b4a))
* use line-based comments ([c580837](https://github.com/nacorga/ai-pr-reviewer/commit/c580837f6eb3b15456a17c4f3096c4777461fb3d))

## 1.0.0 (2025-06-10)


### Features

* add duplicate comment check in GitHub service to prevent redundant review comments ([76a7508](https://github.com/nacorga/ai-pr-reviewer/commit/76a75081fbc3d2adc8da4935defaa9d468f46e2a))
* add health check endpoint and update webhook path in configuration ([a9d4320](https://github.com/nacorga/ai-pr-reviewer/commit/a9d4320c2fae9b62bcd23b8555767427d4011291))
* add initial project setup with TypeScript, Express, and GitHub webhook integration ([92afb87](https://github.com/nacorga/ai-pr-reviewer/commit/92afb87b7b65fe523ba404efcf8dee162513a3e3))
* add logging middleware to track HTTP requests ([7a4b0cc](https://github.com/nacorga/ai-pr-reviewer/commit/7a4b0ccc94009d2382fdf98df7b77e150ba2a88a))
* app improves ([c004c5a](https://github.com/nacorga/ai-pr-reviewer/commit/c004c5a723a034d0a019ad6b4672d79cc278ac57))
* enhance webhook error handling and logging for pull request events ([6eb3eba](https://github.com/nacorga/ai-pr-reviewer/commit/6eb3eba0f9985bbc63363e04534c6aba114830cb))
* implement centralized error handling middleware and update webhook route ([c562da3](https://github.com/nacorga/ai-pr-reviewer/commit/c562da3f641d6feb390dcca57819add0c1f1628a))
* improve webhook configuration and enhance logging for all events ([ec5617e](https://github.com/nacorga/ai-pr-reviewer/commit/ec5617e4b5f2c60419edb71df584261cc36cfb83))


### Bug Fixes

* ensure secret is treated as a string in webhook configuration ([908e372](https://github.com/nacorga/ai-pr-reviewer/commit/908e372b674f0b73c4fc287c46927ec3ee4abd38))
* remove signing option from versioning workflow to streamline release process ([5baaf4e](https://github.com/nacorga/ai-pr-reviewer/commit/5baaf4ebc7b18a9d98b8df6f1276d51c77ff6042))

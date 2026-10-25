# Contributing

Keep the end-user app a self-contained HTML that works offline. Do not introduce accounts, remote dependencies, telemetry, persistent browser storage, or an installation requirement.

Run the build and tests in README.md. Explain the user-visible change and validation in pull requests. Add regression tests for meaningful behavior changes. Never include personal model files, saved libraries, or licensed third-party demos in source or public releases.

For filesystem changes, test on disposable fixtures and preserve explicit confirmation, permission checks, and content verification. Browser APIs differ: provide clear fallbacks.

Contributions are accepted under the project's MIT license.

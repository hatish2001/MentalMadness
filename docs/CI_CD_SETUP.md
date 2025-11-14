# CI/CD Setup Guide

## GitHub Actions Configuration

The project includes a comprehensive CI/CD pipeline using GitHub Actions. To enable it, you need to configure the following secrets in your GitHub repository settings.

### Required GitHub Secrets

Navigate to Settings → Secrets and variables → Actions in your GitHub repository and add:

1. **DOCKER_USERNAME**: Your Docker Hub username
2. **DOCKER_TOKEN**: Your Docker Hub access token (not password)
   - Generate at: https://hub.docker.com/settings/security

### Setting Up Secrets

```bash
# Example of how the secrets are used in the workflow:
# - DOCKER_USERNAME: Used for Docker Hub login and image tagging
# - DOCKER_TOKEN: Used for Docker Hub authentication
```

### Pipeline Overview

The CI/CD pipeline performs the following steps:

1. **Backend Tests**
   - Linting
   - Unit tests
   - Security audit
   - Runs with PostgreSQL and Redis services

2. **Dashboard Tests**
   - Linting
   - Unit tests
   - Production build verification

3. **Mobile Tests**
   - Linting
   - Unit tests

4. **Docker Build** (on main branch only)
   - Builds and pushes backend image
   - Builds and pushes dashboard image
   - Tags with latest and commit SHA

5. **Security Scan**
   - Runs Trivy vulnerability scanner
   - Reports results to GitHub Security tab

### Running Locally

To test the CI pipeline locally:

```bash
# Install act (GitHub Actions local runner)
brew install act

# Run the workflow
act push -s DOCKER_USERNAME=your-username -s DOCKER_TOKEN=your-token

# Run specific job
act -j backend-test
```

### Branch Protection

Recommended branch protection rules for `main`:

- Require pull request reviews
- Require status checks to pass:
  - backend-test
  - dashboard-test
  - mobile-test
- Require branches to be up to date
- Include administrators

### Monitoring

- Check Actions tab for pipeline status
- Enable notifications for failed workflows
- Review security alerts in Security tab

## Troubleshooting

### Common Issues

1. **Docker login fails**
   - Verify DOCKER_TOKEN is an access token, not password
   - Check token has correct permissions

2. **Tests fail with database connection**
   - Ensure test uses correct environment variables
   - Check service health checks are passing

3. **Build fails with out of memory**
   - May need to upgrade GitHub Actions runner
   - Consider using self-hosted runners for large builds

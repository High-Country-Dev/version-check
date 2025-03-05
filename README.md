# Check Versions Bumped Action

This GitHub Action checks if versions are bumped in the PR.

## Features

- Automatically checks if versions are bumped when a PR is opened, reopened, or updated

## Setup

1. Create a new repository for this action or clone this one.

2. Ensure you have Node.js installed (version 16 or later recommended).

3. Install dependencies:

   ```
   npm install
   ```

4. Build the action:
   ```
   npm run build
   ```

## Usage

To use this action in your workflow, add the following step to your `.github/workflows/your-workflow.yml` file:

```yaml
- name: Check Versions Bumped
  uses: high-country-dev/check-versions-bumped-action@v1
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

- `token`: The GitHub token used to create comments on PRs. (Required)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

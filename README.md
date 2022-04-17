# api-linter-setup-action

This action installs [`api-linter`](https://github.com/googleapis/api-linter) in your Github Actions pipelines.

## Configuration

You can configure `api-linter-setup-action` with these parameters:

Parameter | Description | Default
:---------|:------------|:-------
`version` | The version of the `api-linter` to install | `1.30.1`
`github_token` | The GitHub token to use when making API requests |


## Example usage

```yaml
steps:
  - uses: coscene-io/api-linter-setup-action@v0.2.0
  - run: api-linter --version
```
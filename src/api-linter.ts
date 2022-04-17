import * as os from 'os';
import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';
import { Octokit } from '@octokit/core';
import { Error, isError } from './error';

// versionPrefix is used in Github release names, and can
// optionally be specified in the action's version parameter.
const versionPrefix = "v";

export async function getAPILinter(version: string, githubToken: string): Promise<string | Error> {
  const binaryPath = tc.find('api-linter', version, os.arch());
  if (binaryPath !== '') {
    core.info(`Found in cache @ ${binaryPath}`);
    return binaryPath;
  }

  core.info(`Resolving the download URL for the current platform...`);
  const downloadURL = await getDownloadURL(version, githubToken);
  if (isError(downloadURL)) {
    return downloadURL
  }

  let cacheDir = "";
  core.info(`Downloading api-linter version "${version}" from ${downloadURL}`);
  const downloadPath = await tc.downloadTool(downloadURL);
  core.info(`Successfully downloaded api-linter version "${version}" from ${downloadURL} to ${downloadPath}`);

  core.info('Extracting api-linter ...');
  const extractPath = await tc.extractTar(downloadPath);
  core.info(`Successfully extracted api-linter to ${extractPath}`);

  core.info('Adding api-linter to the cache...');
  cacheDir = await tc.cacheDir(
    extractPath,
    'api-linter',
    version,
    os.arch()
  );

  core.info(`Successfully cached api-linter to ${cacheDir}`);
  return cacheDir;
}

// getDownloadURL resolves API Linter's Github download URL for the
// current architecture and platform.
// TODO(juchao): Support all architecture and platform.
async function getDownloadURL(version: string, githubToken: string): Promise<string | Error> {
  let architecture = '';
  switch (os.arch()) {
    // The available architectures can be found at:
    // https://nodejs.org/api/process.html#process_process_arch
    case 'x64':
      architecture = 'amd64';
      break;
    case 'arm64':
      architecture = 'arm';
      break;
    default:
      return {
        message: `The "${os.arch()}" architecture is not supported with a api-linter release.`
      };
  }

  let platform = '';
  switch (os.platform()) {
    // The available platforms can be found at:
    // https://nodejs.org/api/process.html#process_process_platform
    case 'linux':
      platform = 'linux';
      break;
    case 'darwin':
      platform = 'darwin';
      architecture = 'amd64';
      break;
    case 'win32':
      platform = 'windows';
      break;
    default:
      return {
        message: `The "${os.platform()}" platform is not supported with a api-linter release.`
      };
  }

  let assetName = `api-linter-${version}-${platform}-${architecture}.tar.gz`;
  const octokit = new Octokit({ auth: githubToken });
  const tag = releaseTagForVersion(version);
  const { data: release } = await octokit.request(
    'GET /repos/{owner}/{repo}/releases/tags/{tag}',
    {
      owner: 'googleapis',
      repo: 'api-linter',
      tag: tag,
    }
  );
  for (const asset of release.assets) {
    if (assetName === asset.name) {
      return asset.browser_download_url;
    }
  }
  return {
    message: `Unable to find API Linter version "${version}" for platform "${platform}" and architecture "${architecture}".`
  };
}

// releaseTagForVersion returns the release tag name based on a given version configuration.
// Github releases include the 'v' prefix, but the `api-linter --version` does not. Thus, we permit
// both versions, e.g. v0.38.0 and 0.38.0.
function releaseTagForVersion(version: string): string {
  if (version.indexOf(versionPrefix) === 0) {
    return version
  }
  return versionPrefix + version
}

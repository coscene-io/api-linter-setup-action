import cp from 'child_process';
import * as os from 'os';
import * as path from 'path';
import * as core from '@actions/core';
import * as io from '@actions/io';
import { getAPILinter } from './api-linter';
import { Error, isError } from './error';

export async function run(): Promise<void> {
    try {
        const result = await runSetup()
        if (result !== null && isError(result)) {
            core.setFailed(result.message);
        }
    } catch (error) {
        // In case we ever fail to catch an error
        // in the call chain, we catch the error
        // and mark the build as a failure. The
        // user is otherwise prone to false positives.
        if (isError(error)) {
            core.setFailed(error.message);
            return;
        }
        core.setFailed('Internal error');
    }
}

// runSetup runs the api-linter-setup action, and returns
// a non-empty error if it fails.
async function runSetup(): Promise<null|Error> {
    const version = core.getInput('version');
    if (version === '') {
        return {
            message: 'a version was not provided'
        };
    }

    const githubToken = core.getInput('github_token');
    if (githubToken === '') {
        core.warning('No github_token supplied, API requests will be subject to stricter rate limiting');
    }


    core.info(`Setting up api-linter version "${version}"`);
    const installDir = await getAPILinter(version, githubToken);
    if (isError(installDir)) {
        return installDir
    }

    core.info('Adding api-linter binary to PATH');
    core.addPath(installDir);
    let binaryPath = '';
    binaryPath = await io.which('api-linter', true);
    if (binaryPath === '') {
        return {
            message: 'api-linter was not found on PATH'
        };
    }

    core.info(`Successfully setup api-linter version ${version}`);
    core.info(cp.execSync(`${binaryPath} --version`).toString());

    return null;
}

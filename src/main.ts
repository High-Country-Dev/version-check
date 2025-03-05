import * as core from "@actions/core";
import * as github from "@actions/github";
import fs from "fs/promises";
import semverDiff from "semver-diff";

interface PullRequest {
  number: number;
  title: string;
  base: { ref: string };
  head: { ref: string };
}

async function main() {
  const token = process.env.TOKEN ?? core.getInput("token");
  const prNumber = process.env.PR_NUMBER ?? core.getInput("pr-number");

  const octokit = github.getOctokit(token);

  const { context } = github;

  const { owner, repo } = context.repo;

  let currentPR: PullRequest;
  if (context.payload.pull_request) {
    currentPR = context.payload.pull_request as PullRequest;
  } else {
    const { data: pr } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: parseInt(prNumber, 10),
    });
    currentPR = pr as PullRequest;
  }

  const baseBranch = currentPR.base.ref;

  if (baseBranch !== "dev" && baseBranch !== "staging") return;

  const expoVersion = await checkFile("./expo-package.json");
  const appConfigVersion = await checkFile("./src/app.config.ts");
  const nextjsVersion = await checkFile("./nextjs-package.json");
  const rootVersion = await checkFile("./root-package.json");

  const baseSha = github.context.payload.pull_request?.base.sha;
  const baseUrl = `https://raw.githubusercontent.com/${github.context.repo.owner}/${github.context.repo.repo}/${baseSha}/package.json`;

  const headers: Record<string, string> = {};
  if (token) {
    core.info("Using specified token");
    headers.Authorization = `token ${token}`;
  }

  fetch(baseUrl, { headers })
    .then((res) => res.json())
    .then((res) => res.version)
    .then((version) => {
      if (semverDiff(version, appConfigVersion)) {
        core.setFailed("App Config version is not bumped");
      }

      if (semverDiff(version, expoVersion)) {
        core.setFailed("Expo package version is not bumped");
      }

      if (semverDiff(version, nextjsVersion)) {
        core.setFailed("NextJS package version is not bumped");
      }

      if (semverDiff(version, rootVersion)) {
        core.setFailed("Root package version is not bumped");
      }
    });
}

async function checkFile(filePath: string) {
  const content = await fs.readFile(filePath, "utf8");
  const regex = /["|']*version["|']*:\s*["|']*(\d+\.\d+\.\d+)["|']*/g;
  const matches = content.matchAll(regex);
  return matches.next().value?.[1] ?? "";
}

main();

import * as core from "@actions/core";
import * as github from "@actions/github";
import fs from "fs/promises";
import semverDiff from "semver-diff";

interface PullRequest {
  number: number;
  title: string;
  base: { ref: string; label: string };
  head: { ref: string; label: string };
}

async function main() {
  const token = process.env.TOKEN ?? core.getInput("token");
  const prNumber = process.env.PR_NUMBER ?? core.getInput("pr-number");

  const octokit = github.getOctokit(token);

  const { context } = github;

  const repo = context.repo;

  let currentPR: PullRequest;
  if (context.payload.pull_request) {
    currentPR = context.payload.pull_request as PullRequest;
  } else {
    const { data: pr } = await octokit.rest.pulls.get({
      owner: repo.owner,
      repo: repo.repo,
      pull_number: parseInt(prNumber, 10),
    });
    currentPR = pr as PullRequest;
  }

  const baseBranch = currentPR.base.ref;

  if (baseBranch !== "dev" && baseBranch !== "staging") return;

  const expoVersion = await checkFile("./apps/expo/package.json");
  const appConfigVersion = await checkFile("./apps/expo/app.config.ts");
  const nextjsVersion = await checkFile("./apps/nextjs/package.json");
  const rootVersion = await checkFile("./package.json");

  const baseSha = github.context.payload.pull_request?.base.sha;
  const baseUrl = `https://raw.githubusercontent.com/${github.context.repo.owner}/${github.context.repo.repo}/${baseSha}/package.json`;

  const headers: Record<string, string> = {};
  if (token) {
    core.info("Using specified token");
    headers.Authorization = `token ${token}`;
  }

  fetch(baseUrl, { headers })
    .then(async (res) => {
      const json = await res.json();
      return json;
    })
    .then((json) => {
      const version = json?.version ?? "";

      console.log(
        `current ${currentPR.base.label} package.json version`,
        version
      );
      console.log("appConfigVersion", appConfigVersion);
      console.log("expoVersion", expoVersion);
      console.log("nextjsVersion", nextjsVersion);
      console.log("rootVersion", rootVersion);

      if (!version) {
        core.setFailed(
          `No package.json version found in ${currentPR.base.label} branch`
        );
        return;
      }

      if (!semverDiff(version, appConfigVersion)) {
        core.setFailed("App Config version is not bumped");
      }

      if (!semverDiff(version, expoVersion)) {
        core.setFailed("Expo package version is not bumped");
      }

      if (!semverDiff(version, nextjsVersion)) {
        core.setFailed("NextJS package version is not bumped");
      }

      if (!semverDiff(version, rootVersion)) {
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

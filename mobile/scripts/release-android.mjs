// Builds a Google Play app bundle on EAS and saves it to builds/output.
//
// Play rejects a release whose bundle reuses an uploaded versionCode ("does
// not add or remove any app bundles") or is lower than one already served
// ("doesn't allow any existing users to upgrade"). The versionCode lives on
// EAS (appVersionSource: remote) and the production profile auto-increments
// it, so every run of this script yields a bundle Play will accept.
//
//   npm run release:android                 # checks, build, download
//   npm run release:android -- --skip-checks
//   npm run release:android -- --submit     # also upload to the internal track
import { Buffer } from "node:buffer";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { mobileRoot } from "./backend-env.mjs";

const args = new Set(process.argv.slice(2));
const outputDir = path.join(mobileRoot, "..", "builds", "output");
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: mobileRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  });
  if (result.status !== 0)
    throw Error(`${command} ${commandArgs.join(" ")} failed.`);
  return result;
}

function eas(commandArgs) {
  return execFileSync(npx, ["eas-cli", ...commandArgs], {
    cwd: mobileRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    shell: process.platform === "win32",
    maxBuffer: 64 * 1024 * 1024,
  });
}

if (!args.has("--skip-checks")) run("npm", ["run", "check"]);

const current = eas([
  "build:version:get",
  "-p",
  "android",
  "--json",
  "--non-interactive",
]);
const currentCode = Number(JSON.parse(current).versionCode);
console.log(
  `EAS versionCode is ${currentCode}; this build will be ${currentCode + 1}.`,
);

const buildArgs = [
  "build",
  "-p",
  "android",
  "--profile",
  "production",
  "--non-interactive",
  "--wait",
  "--json",
];
if (args.has("--submit")) buildArgs.push("--auto-submit");

const [build] = JSON.parse(eas(buildArgs));
const url =
  build?.artifacts?.applicationArchiveUrl ?? build?.artifacts?.buildUrl;
if (build?.status !== "FINISHED" || !url?.endsWith(".aab"))
  throw Error(`EAS build ${build?.id ?? "?"} did not produce an app bundle.`);

const versionCode = Number(build.appBuildVersion);
if (!(versionCode > currentCode))
  throw Error(
    `Build ${build.id} has versionCode ${build.appBuildVersion}, expected more than ${currentCode}.`,
  );

const response = await fetch(url);
if (!response.ok) throw Error(`Download failed: HTTP ${response.status}.`);
const bytes = Buffer.from(await response.arrayBuffer());
// An .aab is a zip archive; anything else is an error page, not a bundle.
if (bytes.readUInt32LE(0) !== 0x04034b50)
  throw Error("Downloaded file is not an Android App Bundle.");

mkdirSync(outputDir, { recursive: true });
const file = path.join(
  outputDir,
  `gulmeli-fancy-stores-${build.appVersion}-${versionCode}.aab`,
);
writeFileSync(file, bytes);
writeFileSync(
  path.join(outputDir, "latest.json"),
  JSON.stringify(
    {
      file: path.basename(file),
      versionName: build.appVersion,
      versionCode,
      easBuildId: build.id,
      gitCommit: build.gitCommitHash,
      builtAt: build.completedAt,
    },
    null,
    2,
  ) + "\n",
);

const megabytes = (statSync(file).size / 1024 / 1024).toFixed(1);
console.log(
  `\nSaved ${file} (${megabytes} MB)\nversionName ${build.appVersion}, versionCode ${versionCode}\n` +
    "Upload it in Play Console as a NEW release on the track; remove any older bundle from that release first.",
);

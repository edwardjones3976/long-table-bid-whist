// Lanes: one private checkout per provider and task, so several coding agents can work
// in this repository at the same time without stepping on each other.
//
//   npm run lane -- <command>      from the main folder or from inside any lane
//
// MAIN FOLDER  the repository's primary checkout. Its branch is the integration branch.
// LANE         a git worktree at _provider_worktrees/<provider>-<task>, on its own
//              branch lane/<provider>-<task>.
// AREA         a folder or file, written from the top of the repository, that one lane
//              has claimed. Two areas overlap when one is the other or is inside it.
//
// Each lane, and the main folder, keeps its facts in a git-ignored .lane.json at its
// root. This tool never deletes a lane and never commits, pushes or merges: the
// workspace owner does those by hand. It starts git and npm with argument lists, never
// with a command string, and it works out where it is from the folder it is started in.

import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Windows: never run a git.exe or npm.exe found in a lane's folder instead of the one on the PATH.
process.env.NoDefaultCurrentDirectoryInExePath = "1";

const USAGE =
  "Usage: npm run lane -- new <provider> <task> --area <path> [--area <path> ...] [--install] | status | claim --area <path>... | release --area <path>... | run <typecheck|test|build|e2e|server|client> | handin [--build] [--e2e]";
const LANES_FOLDER = "_provider_worktrees";
const FACTS_FILE = ".lane.json";
const LOCK_WAIT_MS = 30_000;
/** The main folder's facts until it claims an area. Its base is HEAD: what differs is its uncommitted work. */
const MAIN_FACTS = { provider: "owner", task: "main", number: 0, serverPort: 3000, clientPort: 5173, areas: [], base: "HEAD" };
/** The names "run" and "handin" use, and the npm script each one starts. */
const SCRIPTS = { typecheck: "typecheck", test: "test", build: "build", e2e: "test:e2e", server: "dev:server", client: "dev:client" };
/** Starts with a letter or digit, so a name can never be read as an option. */
const NAME = /^[a-z0-9][a-z0-9-]{0,39}$/;
/** One folder or file name inside an area: plain characters, with spaces only in the middle. */
const AREA_PART = /^[A-Za-z0-9._@+-]([A-Za-z0-9._@+ -]*[A-Za-z0-9._@+-])?$/;

// ---------- small helpers ----------

/** Ends the command with a plain message. */
class Stop extends Error {
  constructor(message, exitCode = 1) {
    super(message);
    this.exitCode = exitCode;
  }
}

function stop(message) {
  throw new Stop(message);
}

function badUse(message) {
  throw new Stop(`${message}\n${USAGE}`, 2);
}

/** Paths are printed with forward slashes: cmd, Git Bash and POSIX shells all take them. */
const show = (folder) => folder.split(path.sep).join("/");

/** One spelling per folder, so a short name, a link or letter case cannot make one place look like two. */
const real = (folder) => (existsSync(folder) ? realpathSync.native(folder) : path.resolve(folder));

const samePlace = (one, other) => path.relative(one, other) === "";

/** The time now, read from the clock, in UTC to the second. */
const utcNow = () => new Date().toISOString().replace(/\.\d+Z$/, "Z");

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

// ---------- areas ----------

/** The stored form of an area ("client/src/" becomes "client/src"), or null when it is not a plain path inside the repository. */
function areaFrom(text) {
  const area = text.replace(/\/+$/, "");
  const plain = area.split("/").every((part) => AREA_PART.test(part) && !/^\.+$/.test(part));
  return plain ? area : null;
}

/** Whether a path is the area itself or lies inside it. Letter case does not count. */
function covers(area, file) {
  const outer = area.toLowerCase();
  const inner = file.toLowerCase();
  return inner === outer || inner.startsWith(`${outer}/`);
}

const overlap = (one, other) => covers(one, other) || covers(other, one);

const sameArea = (one, other) => one.toLowerCase() === other.toLowerCase();

const straysOf = (files, areas) => files.filter((file) => !areas.some((area) => covers(area, file)));

/** Adds areas to a list, skipping any the list already has. */
function addAreas(held, wanted) {
  const all = [...held];
  for (const area of wanted) if (!all.some((one) => sameArea(one, area))) all.push(area);
  return all;
}

/** Stops when a wanted area overlaps one that somebody else holds, and says who. */
function refuseOverlaps(wanted, others) {
  for (const area of wanted) {
    for (const other of others) {
      // A lane this tool made still holds its areas and its number after its facts file is gone.
      if (other.facts === null && other.branch === `lane/${other.name}`) {
        stop(`Refused: lane ${other.name} has lost its ${FACTS_FILE}, so its areas and ports are unknown. Ask the workspace owner to restore it.`);
      }
      const theirs = other.facts?.areas.find((held) => overlap(area, held));
      if (theirs !== undefined) {
        stop(`Refused: area "${area}" overlaps "${theirs}", which ${other.label} holds. Choose another area, or ask the workspace owner to sort it out.`);
      }
    }
  }
}

// ---------- arguments ----------

/** Splits arguments into plain words, --area paths and the options this command allows. Everything is checked here, before git or the disk sees it. */
function parse(args, allowed = []) {
  const words = [];
  const areas = [];
  const options = new Set();
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--area" && allowed.includes(arg)) {
      i += 1;
      areas.push(wantedArea(args[i]));
    } else if (allowed.includes(arg)) options.add(arg);
    else if (arg.startsWith("-")) badUse(`Unknown option ${JSON.stringify(arg)}.`);
    else words.push(arg);
  }
  return { words, areas, options };
}

function wantedArea(text) {
  if (text === undefined || text.startsWith("-")) badUse("--area needs a path after it.");
  return (
    areaFrom(text) ??
    stop(
      `Refused: ${JSON.stringify(text)} is not a usable area. Name a folder or file inside the repository from its top, with forward slashes, like client/src/world: no "..", no leading slash, no drive letter, no backslash, no wildcard.`,
    )
  );
}

// ---------- git and npm ----------

/** Runs git with an argument list and returns what it printed. With mayFail, a failure returns null instead of stopping. */
function git(folder, args, { mayFail = false, hint = "" } = {}) {
  const result = spawnSync("git", args, {
    cwd: folder,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
    // Other agents are working in these folders: looking must never take git's optional locks.
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
  });
  if (result.error) stop("Could not start git. Install it, or put it on the PATH, and try again.");
  if (result.status === 0) return result.stdout;
  if (mayFail) return null;
  return stop(`git ${args[0]} failed in ${show(folder)}:\n${result.stderr.trim()}${hint && `\n${hint}`}`);
}

/** How to start npm without a shell. On Windows npm is a .cmd file, which cannot be started that way, so its script is run with node. */
function npmStart() {
  const beside = path.dirname(process.execPath);
  const script = [
    process.env.npm_execpath ?? "",
    path.join(beside, "node_modules", "npm", "bin", "npm-cli.js"),
    path.join(beside, "..", "lib", "node_modules", "npm", "bin", "npm-cli.js"),
  ].find((file) => path.basename(file) === "npm-cli.js" && existsSync(file));
  return script ? [process.execPath, [script]] : ["npm", []];
}

/** Runs npm in a folder with that folder's ports, shows its output as it comes, and returns its exit code. */
function npm(folder, args, facts) {
  const [command, first] = npmStart();
  // shortcut: if this tool is killed, the npm child keeps running; start it without "Sync" and pass signals on if that ever bites.
  const result = spawnSync(command, [...first, ...args], {
    cwd: folder,
    stdio: "inherit",
    windowsHide: true,
    env: { ...process.env, PORT: String(facts.serverPort), CLIENT_PORT: String(facts.clientPort) },
  });
  if (result.error) stop('Could not start npm. Run this through "npm run lane -- ...", or put npm on the PATH.');
  return result.status ?? 1;
}

// ---------- where things are ----------

/** Finds the folder this command runs in, the main folder, and the shared git folder where the lock lives. */
function findWorkspace() {
  const cwd = process.cwd();
  const found = git(cwd, ["rev-parse", "--show-toplevel", "--git-common-dir"], { mayFail: true });
  if (found === null) stop("This folder is not inside the repository. Change into the main folder or a lane and try again.");
  const [top, common] = found.split(/\r?\n/);
  const gitFolder = real(path.resolve(cwd, common));
  return { here: real(top), main: path.dirname(gitFolder), gitFolder };
}

/** The main folder first, then every lane git knows whose folder is still there. */
function findHolders({ main }) {
  const entries = git(main, ["worktree", "list", "--porcelain"])
    .split(/\r?\n\r?\n/)
    .filter((entry) => entry.trim() !== "")
    .map((entry) => {
      const field = (name) => entry.split(/\r?\n/).find((line) => line.startsWith(`${name} `))?.slice(name.length + 1);
      return { folder: real(field("worktree")), branch: field("branch")?.replace(/^refs\/heads\//, "") };
    });
  const lanesFolder = path.join(main, LANES_FOLDER);
  const lanes = entries
    .filter((entry) => samePlace(path.dirname(entry.folder), lanesFolder) && existsSync(entry.folder))
    .map((entry) => ({ ...entry, name: path.basename(entry.folder), label: `lane ${path.basename(entry.folder)}`, isMain: false }));
  const branch = entries.find((entry) => samePlace(entry.folder, main))?.branch;
  return [{ folder: main, branch, name: "main", label: "the main folder", isMain: true }, ...lanes];
}

/** The lane or main folder this command was started in, with its facts. */
function mine(space, holders) {
  const me = holders.find((holder) => samePlace(holder.folder, space.here));
  if (!me) stop("This folder is neither the main folder nor a lane. Change into one of them and try again.");
  const facts = factsOf(me) ?? stop(`${show(me.folder)} has no ${FACTS_FILE}, so "lane new" did not make it. Ask the workspace owner to set it up.`);
  return { ...me, facts };
}

// ---------- .lane.json ----------

/** Reads a folder's facts. Returns null when it has none, and stops when the file cannot be trusted. */
function readFacts(folder) {
  const file = path.join(folder, FACTS_FILE);
  if (!existsSync(file)) return null;
  let facts = null;
  try {
    facts = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    // reported below
  }
  const name = (value) => typeof value === "string" && NAME.test(value);
  const port = (value) => Number.isInteger(value) && value > 0 && value < 65536;
  const sound =
    facts !== null &&
    typeof facts === "object" &&
    name(facts.provider) &&
    name(facts.task) &&
    Number.isInteger(facts.number) &&
    facts.number >= 0 &&
    port(facts.serverPort) &&
    port(facts.clientPort) &&
    Array.isArray(facts.areas) &&
    facts.areas.every((area) => typeof area === "string" && areaFrom(area) === area) &&
    typeof facts.base === "string" &&
    /^(HEAD|[0-9a-f]{40,64})$/.test(facts.base);
  if (!sound) stop(`${show(file)} is damaged or was edited by hand. Ask the workspace owner to repair it.`);
  return facts;
}

const factsOf = (holder) => readFacts(holder.folder) ?? (holder.isMain ? { ...MAIN_FACTS } : null);

const withFacts = (holder) => ({ ...holder, facts: factsOf(holder) });

function writeFacts(folder, facts) {
  writeFileSync(path.join(folder, FACTS_FILE), `${JSON.stringify(facts, null, 2)}\n`);
}

// ---------- one writer at a time ----------

/** Runs the work while holding the lock, so two commands cannot pick the same number or both pass the overlap check. */
function locked({ gitFolder }, work) {
  const file = path.join(gitFolder, "lane.lock");
  takeLock(file);
  try {
    ignoreFacts(gitFolder);
    return work();
  } finally {
    rmSync(file, { force: true });
  }
}

/** Keeps .lane.json ignored in every checkout, also one cut from a commit whose .gitignore does not list it. */
function ignoreFacts(gitFolder) {
  const exclude = path.join(gitFolder, "info", "exclude"); // shared by every worktree
  const text = existsSync(exclude) ? readFileSync(exclude, "utf8") : "";
  if (text.split(/\r?\n/).includes(`/${FACTS_FILE}`)) return;
  mkdirSync(path.dirname(exclude), { recursive: true });
  appendFileSync(exclude, `${text && !text.endsWith("\n") ? "\n" : ""}/${FACTS_FILE}\n`);
}

function takeLock(file) {
  const started = Date.now();
  let deniedSince = 0;
  for (;;) {
    try {
      writeFileSync(file, String(process.pid), { flag: "wx" });
      return;
    } catch (error) {
      const held = error.code === "EEXIST";
      // Windows can answer "not permitted" for a moment while the last holder's file is going away.
      if (!held && !["EPERM", "EACCES", "EBUSY", "EROFS"].includes(error.code)) throw error;
      // That moment is timed from its own start, not from when the wait began.
      deniedSince = held ? 0 : deniedSince || Date.now();
      // shortcut: two commands that both find a dead holder at the same instant could both get in; that needs a crash and a tie.
      if (held && holderIsGone(file)) rmSync(file, { force: true });
      else if (Date.now() - (held ? started : deniedSince) > (held ? LOCK_WAIT_MS : 2000)) {
        stop(
          held
            ? `Another lane command still holds ${show(file)}. Wait for it and try again. If nothing is running, the workspace owner can remove that file.`
            : `Cannot write ${show(file)}. This session may not be allowed to change the workspace: ask the workspace owner to run the command.`,
        );
      } else sleep(50);
    }
  }
}

/** True when the process that wrote the lock is no longer running, as after a crash. */
function holderIsGone(file) {
  let pid = NaN;
  try {
    pid = Number(readFileSync(file, "utf8"));
  } catch {
    return false; // just released
  }
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return false;
  } catch (error) {
    return error.code === "ESRCH";
  }
}

// ---------- what a lane has changed ----------

/** Every file that differs from the base: committed on the branch or not, untracked included. */
function changedFiles(folder, base) {
  const list = (args) => git(folder, args).split("\0").filter(Boolean);
  const files = new Set([
    ...list(["diff", "--name-only", "--no-renames", "-z", base, "--"]),
    ...list(["ls-files", "--others", "--exclude-standard", "-z"]),
  ]);
  // The facts file is this tool's own, also in a lane cut from a commit that did not ignore it yet.
  files.delete(FACTS_FILE);
  return [...files].sort();
}

// ---------- commands ----------

function newLane(args) {
  const { words, areas, options } = parse(args, ["--area", "--install"]);
  if (words.length !== 2) badUse('new needs a provider, a task and each area after --area. If you typed that, check that "--" comes right after "npm run lane".');
  const [provider, task] = words;
  for (const [what, value] of [["provider", provider], ["task", task]]) {
    if (!NAME.test(value)) {
      stop(`Refused: the ${what} ${JSON.stringify(value)} must be lower-case letters, digits and dashes, start with a letter or digit, and be at most 40 long.`);
    }
  }
  if (areas.length === 0) stop('Refused: new needs at least one --area <path>. If you typed one, check that "--" comes right after "npm run lane".');

  const space = findWorkspace();
  const { folder, branch, from, facts } = locked(space, () => createLane(space, provider, task, areas));

  console.log(`Created lane ${provider}-${task}.`);
  console.log(`  folder: ${show(folder)}`);
  console.log(`  branch: ${branch}, started from ${from} at ${facts.base.slice(0, 12)}`);
  console.log(`  areas:  ${facts.areas.join(", ")}`);
  console.log(`  ports:  server ${facts.serverPort}, client ${facts.clientPort}`);
  console.log(`Uncommitted work in the main folder is NOT in the lane: the lane starts from the last commit on ${from}.`);
  if (!existsSync(path.join(folder, "tools", "lane.mjs"))) {
    console.log(`That commit has no tools/lane.mjs yet. Until it does, run this copy from inside the lane: node "${show(fileURLToPath(import.meta.url))}" <command>`);
  }
  const installed = options.has("--install") ? npm(folder, ["ci"], facts) : 0;
  if (installed !== 0) console.error(`npm ci failed (exit ${installed}). The lane is there: fix the problem and run "npm ci" inside it.`);
  console.log("Next:");
  console.log(`  cd "${show(folder)}"`);
  if (!options.has("--install")) console.log("  npm ci                     (only if the lane needs its own node_modules: without it npm uses the main folder's)");
  console.log("  npm run lane -- status");
  console.log("  npm run lane -- run test");
  console.log("  npm run lane -- handin");
  return installed;
}

/** Checks everything first, then makes the worktree and writes its facts. Runs inside the lock. */
function createLane(space, provider, task, areas) {
  const name = `${provider}-${task}`;
  const branch = `lane/${name}`;
  const folder = path.join(space.main, LANES_FOLDER, name);
  const everyone = findHolders(space).map(withFacts);
  const from = everyone[0].branch ?? stop("The main folder is not on a branch. Check out the integration branch there, then try again.");
  if (existsSync(folder)) stop(`Refused: the lane ${name} already exists at ${show(folder)}. Work there, or choose another task name.`);
  refuseOverlaps(areas, everyone);
  if (git(space.main, ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`], { mayFail: true }) !== null) {
    stop(`Refused: the branch ${branch} already exists. Choose another task name, or ask the workspace owner about the old branch.`);
  }
  const taken = new Set(everyone.map((holder) => holder.facts?.number));
  let number = 1;
  while (taken.has(number)) number += 1;

  // The full ref name, so a tag with the same name as the branch cannot be picked instead.
  git(space.main, ["worktree", "add", "-b", branch, folder, `refs/heads/${from}`], {
    hint: `If a half-made lane is left at ${show(folder)}, ask the workspace owner to remove it and the branch ${branch} before you try again.`,
  });
  const base = git(folder, ["rev-parse", "HEAD"]).trim();
  const facts = { provider, task, number, serverPort: 3100 + number, clientPort: 5200 + number, areas: addAreas([], areas), base, created: utcNow() };
  writeFacts(folder, facts);
  return { folder, branch, from, facts };
}

function status(args) {
  if (parse(args).words.length > 0) badUse("status takes no arguments.");
  const space = findWorkspace();
  for (const holder of findHolders(space)) {
    console.log(holder.isMain ? "MAIN FOLDER" : `LANE ${holder.name}`);
    console.log(`  folder:        ${show(holder.folder)}`);
    try {
      printFacts(holder);
    } catch (error) {
      if (!(error instanceof Stop)) throw error;
      console.log(`  problem:       ${error.message}`);
    }
    console.log("");
  }
  return 0;
}

function printFacts(holder) {
  const facts = factsOf(holder) ?? stop(`no ${FACTS_FILE} here, so "lane new" did not make this folder`);
  const files = changedFiles(holder.folder, facts.base);
  const strays = straysOf(files, facts.areas);
  const base = facts.base === "HEAD" ? "HEAD" : `base ${facts.base.slice(0, 12)}`;
  console.log(`  provider:      ${facts.provider}`);
  console.log(`  task:          ${facts.task}`);
  console.log(`  branch:        ${holder.branch ?? "(none: detached)"}`);
  console.log(`  areas:         ${facts.areas.join(", ") || "(none)"}`);
  console.log(`  ports:         server ${facts.serverPort}, client ${facts.clientPort}`);
  console.log(`  changed files: ${files.length} (compared with ${base}; uncommitted and untracked included)`);
  if (facts.areas.length === 0 && files.length > 0) console.log(`  outside areas: all ${files.length}, because no area is claimed here`);
  else console.log(`  outside areas: ${strays.length}`);
  if (facts.areas.length > 0) for (const file of strays) console.log(`    ${file}`);
}

function claim(args) {
  const { words, areas } = parse(args, ["--area"]);
  if (words.length > 0 || areas.length === 0) badUse("claim needs --area <path>, once or more.");
  const space = findWorkspace();
  return locked(space, () => {
    const holders = findHolders(space);
    const me = mine(space, holders);
    refuseOverlaps(areas, holders.filter((holder) => holder.folder !== me.folder).map(withFacts));
    const facts = { ...me.facts, areas: addAreas(me.facts.areas, areas), created: me.facts.created ?? utcNow() };
    writeFacts(me.folder, facts);
    console.log(`Areas now held by ${me.label}: ${facts.areas.join(", ")}`);
    return 0;
  });
}

function release(args) {
  const { words, areas } = parse(args, ["--area"]);
  if (words.length > 0 || areas.length === 0) badUse("release needs --area <path>, once or more.");
  const space = findWorkspace();
  return locked(space, () => {
    const me = mine(space, findHolders(space));
    const notHeld = areas.find((area) => !me.facts.areas.some((one) => sameArea(one, area)));
    if (notHeld !== undefined) {
      stop(`Refused: "${notHeld}" is not an area held by ${me.label} (it holds: ${me.facts.areas.join(", ") || "none"}). Nothing was released.`);
    }
    const kept = me.facts.areas.filter((one) => !areas.some((area) => sameArea(one, area)));
    writeFacts(me.folder, { ...me.facts, areas: kept });
    console.log(`Areas now held by ${me.label}: ${kept.join(", ") || "none"}`);
    return 0;
  });
}

function run(args) {
  const { words } = parse(args);
  if (words.length !== 1 || !Object.hasOwn(SCRIPTS, words[0])) badUse(`run needs one of: ${Object.keys(SCRIPTS).join(", ")}.`);
  const space = findWorkspace();
  const me = mine(space, findHolders(space));
  return npm(me.folder, ["run", SCRIPTS[words[0]]], me.facts);
}

function handin(args) {
  const { words, options } = parse(args, ["--build", "--e2e"]);
  if (words.length > 0) badUse("handin takes only --build and --e2e.");
  const space = findWorkspace();
  const holders = findHolders(space);
  const me = mine(space, holders);
  if (me.isMain) stop("handin works inside a lane only. Change into your lane folder and run it there.");

  const names = ["typecheck", "test", ...["build", "e2e"].filter((name) => options.has(`--${name}`))];
  const checks = names.map((name) => ({ name, code: npm(me.folder, ["run", SCRIPTS[name]], me.facts) }));
  const files = changedFiles(me.folder, me.facts.base);
  const strays = straysOf(files, me.facts.areas);
  // Areas written into .lane.json by hand never went through the overlap check, so check them again here.
  const clashes = holders
    .filter((holder) => holder.folder !== me.folder)
    .flatMap((other) => {
      let held = [];
      try {
        held = factsOf(other)?.areas ?? []; // another lane's damaged file must not stop this hand-in
      } catch (error) {
        if (!(error instanceof Stop)) throw error;
      }
      return me.facts.areas.flatMap((area) => held.filter((one) => overlap(area, one)).map((one) => `${area} overlaps ${one}, held by ${other.label}`));
    });

  console.log("");
  console.log("LANE HAND-IN");
  console.log(`provider:    ${me.facts.provider}`);
  console.log(`task:        ${me.facts.task}`);
  console.log(`branch:      ${me.branch ?? "(none: detached)"}`);
  console.log(`base commit: ${me.facts.base}`);
  console.log(`time (UTC):  ${utcNow()}`);
  console.log(`areas:       ${me.facts.areas.join(", ") || "(none)"}`);
  console.log(`changed files: ${files.length}`);
  for (const file of files) console.log(`  ${file}${strays.includes(file) ? "   (outside the lane's areas)" : ""}`);
  console.log(`strays: ${strays.length}`);
  for (const file of strays) console.log(`  ${file}`);
  console.log(`overlaps: ${clashes.length}`);
  for (const clash of clashes) console.log(`  ${clash}`);
  console.log("checks:");
  for (const { name, code } of checks) console.log(`  ${name}: ${code === 0 ? "PASS" : "FAIL"} (exit ${code})`);
  return strays.length > 0 || clashes.length > 0 || checks.some((check) => check.code !== 0) ? 1 : 0;
}

// ---------- start ----------

const COMMANDS = { new: newLane, status, claim, release, run, handin };

try {
  const [command = "", ...args] = process.argv.slice(2);
  if (!Object.hasOwn(COMMANDS, command)) throw new Stop(USAGE, 2);
  process.exitCode = COMMANDS[command](args);
} catch (error) {
  if (!(error instanceof Stop)) throw error;
  console.error(error.message);
  process.exitCode = error.exitCode;
}

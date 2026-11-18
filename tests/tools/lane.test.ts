// @vitest-environment node
/**
 * Runs the real tools/lane.mjs against throwaway git repositories under the system temp
 * folder. A tiny package.json whose scripts print PORT and CLIENT_PORT stands in for the
 * app, so nothing here installs packages, listens on a port or uses the network.
 */
import { execFile } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import clientConfig from "../../client/vite.config";

// Every test waits on child processes in its own repository, so they can all run side by side.
vi.setConfig({ maxConcurrency: 16 });

const TOOL = fileURLToPath(new URL("../../tools/lane.mjs", import.meta.url));
const NPM_SCRIPTS = ["typecheck", "test", "build", "test:e2e", "dev:server", "dev:client"];
/** Stands in for every npm script: says which one ran with which ports, and fails on request. */
const SAY = [
  "const name = process.argv[2];",
  "console.log(`ran ${name} PORT=${process.env.PORT} CLIENT_PORT=${process.env.CLIENT_PORT}`);",
  "process.exit(process.env.FIXTURE_FAIL === name ? 7 : 0);",
  "",
].join("\n");
const COMMIT = ["-c", "user.name=fixture", "-c", "user.email=fixture", "-c", "commit.gpgsign=false", "commit", "-q"];

/**
 * GIT_DIR and its relatives from an outer git command must never point these runs at another repository.
 * NoDefaultCurrentDirectoryInExePath is left out too, so the tool has to set it itself.
 */
const baseEnv = Object.fromEntries(
  Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_") && name.toLowerCase() !== "nodefaultcurrentdirectoryinexepath"),
);

interface Ran {
  code: number;
  out: string;
}

let root = "";
let template = "";
let repos = 0;

function start(file: string, args: string[], cwd: string, env: Record<string, string> = {}): Promise<Ran> {
  // An empty git configuration: the settings of whoever runs the tests (signing, hooks, line endings) stay out.
  const gitEnv = { GIT_CONFIG_GLOBAL: join(root, "gitconfig"), GIT_CONFIG_NOSYSTEM: "1" };
  return new Promise((resolve) => {
    execFile(file, args, { cwd, env: { ...baseEnv, ...gitEnv, ...env }, windowsHide: true }, (error, stdout, stderr) => {
      const code = error ? (typeof error.code === "number" ? error.code : -1) : 0;
      resolve({ code, out: `${stdout}${stderr}` });
    });
  });
}

const lane = (cwd: string, ...args: string[]) => start(process.execPath, [TOOL, ...args], cwd);
const git = (cwd: string, ...args: string[]) => start("git", args, cwd);
const said = async (cwd: string, ...args: string[]) => (await git(cwd, ...args)).out.trim();
const laneFolder = (repo: string, name: string) => join(repo, "_provider_worktrees", name);
const factsIn = (folder: string) => JSON.parse(readFileSync(join(folder, ".lane.json"), "utf8"));

beforeAll(async () => {
  // The space in the name makes every test also cover a repository path with a space in it.
  root = realpathSync.native(mkdtempSync(join(tmpdir(), "lane test ")));
  writeFileSync(join(root, "gitconfig"), "");
  template = join(root, "template");
  mkdirSync(join(template, "client", "src"), { recursive: true });
  mkdirSync(join(template, "docs"));
  const scripts = Object.fromEntries(NPM_SCRIPTS.map((name) => [name, `node say.mjs ${name}`]));
  writeFileSync(join(template, "package.json"), JSON.stringify({ name: "lane-fixture", private: true, scripts }));
  writeFileSync(join(template, "say.mjs"), SAY);
  // .lane.json is left out on purpose: a lane cut from a commit that does not ignore it yet must still work.
  writeFileSync(join(template, ".gitignore"), "_provider_worktrees/\n");
  writeFileSync(join(template, "client", "src", "app.txt"), "app\n");
  writeFileSync(join(template, "docs", "notes.txt"), "notes\n");
  await git(template, "init", "-q", "-b", "trunk");
  await git(template, "add", "-A");
  const made = await git(template, ...COMMIT, "-m", "fixture");
  expect(made.code, made.out).toBe(0);
});

afterAll(() => {
  // Only ever the folder made above: an empty path must never reach a recursive delete.
  if (root !== "") rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

/** Each test gets its own repository: a copy of the one-commit template. */
function makeRepo(): string {
  repos += 1;
  const repo = join(root, `repo ${repos}`);
  cpSync(template, repo, { recursive: true });
  return repo;
}

/** Branch tips, git's worktree records, lane folders and every .lane.json: equal before and after means nothing changed. */
async function state(repo: string): Promise<string> {
  const names = (folder: string) => (existsSync(folder) ? readdirSync(folder).sort() : []);
  const lanes = names(join(repo, "_provider_worktrees"));
  const facts = [repo, ...lanes.map((name) => laneFolder(repo, name))].map((folder) => {
    const file = join(folder, ".lane.json");
    return existsSync(file) ? readFileSync(file, "utf8") : "(no facts)";
  });
  return [await said(repo, "for-each-ref", "refs/heads"), ...names(join(repo, ".git", "worktrees")), "lanes:", ...lanes, ...facts].join("\n");
}

describe.concurrent("npm run lane", { timeout: 60_000 }, () => {
  it("new makes the worktree, the branch and .lane.json, and the next lane gets the next number", async () => {
    const repo = makeRepo();
    writeFileSync(join(repo, "docs", "notes.txt"), "not committed\n");
    const made = await lane(repo, "new", "codex", "tables", "--area", "client/src/", "--area", "docs/notes.txt");
    expect(made.code, made.out).toBe(0);
    expect(made.out).toContain("_provider_worktrees/codex-tables");
    expect(made.out).toContain("server 3101, client 5201");
    expect(made.out).toContain("Uncommitted work in the main folder is NOT in the lane");

    const folder = laneFolder(repo, "codex-tables");
    expect(readFileSync(join(folder, "docs", "notes.txt"), "utf8").trim()).toBe("notes");
    const facts = factsIn(folder);
    expect(Object.keys(facts)).toEqual(["provider", "task", "number", "serverPort", "clientPort", "areas", "base", "created"]);
    expect(facts).toMatchObject({
      provider: "codex",
      task: "tables",
      number: 1,
      serverPort: 3101,
      clientPort: 5201,
      areas: ["client/src", "docs/notes.txt"],
      base: await said(repo, "rev-parse", "HEAD"),
    });
    expect(facts.created).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
    expect(await said(folder, "rev-parse", "--abbrev-ref", "HEAD")).toBe("lane/codex-tables");
    // The fixture's .gitignore does not list .lane.json, so only the tool's own exclude line keeps it out of a commit.
    expect(await said(folder, "status", "--porcelain", "--untracked-files=all")).not.toContain(".lane.json");

    const next = await lane(repo, "new", "grok", "cards", "--area", "server");
    expect(next.code, next.out).toBe(0);
    expect(factsIn(laneFolder(repo, "grok-cards"))).toMatchObject({ number: 2, serverPort: 3102, clientPort: 5202, areas: ["server"] });
    expect((await said(repo, "worktree", "list", "--porcelain")).match(/^worktree /gm)).toHaveLength(3);
    expect(await said(repo, "for-each-ref", "--format=%(refname:short)", "refs/heads")).toBe("lane/codex-tables\nlane/grok-cards\ntrunk");
  });

  it("refuses bad names, a missing area and areas that leave the repository, changing nothing", async () => {
    const repo = makeRepo();
    const before = await state(repo);
    const refused = [
      ["new", "Codex", "tables", "--area", "docs"],
      ["new", "codex", "my_task", "--area", "docs"],
      ["new", "codex", "a/b", "--area", "docs"],
      ["new", "codex", "..", "--area", "docs"],
      ["new", "codex", "x".repeat(41), "--area", "docs"],
      ["new", "-codex", "tables", "--area", "docs"],
      ["new", "codex", "", "--area", "docs"],
      ["new", "codex", "--area", "docs"],
      ["new", "codex", "tables"],
      ["new", "codex", "tables", "--area"],
      ["new", "codex", "tables", "--area", ""],
      ["new", "codex", "tables", "--area", "."],
      ["new", "codex", "tables", "--area", "../outside"],
      ["new", "codex", "tables", "--area", "client/../../outside"],
      ["new", "codex", "tables", "--area", "docs", "--area", "client/.."],
      ["new", "codex", "tables", "--area", "/etc"],
      ["new", "codex", "tables", "--area", "//host/share"],
      ["new", "codex", "tables", "--area", "C:/Windows"],
      ["new", "codex", "tables", "--area", "C:\\Windows"],
      ["new", "codex", "tables", "--area", "c:docs"],
      ["new", "codex", "tables", "--area", "client\\src"],
      ["new", "codex", "tables", "--area", "client/*"],
      ["new", "codex", "tables", "--area", "docs", "--force"],
    ];
    const results = await Promise.all(refused.map((args) => lane(repo, ...args)));
    results.forEach((result, index) => expect(result.code, `${refused[index].join(" ")}\n${result.out}`).toBeGreaterThan(0));
    expect(await state(repo)).toBe(before);
    expect(existsSync(join(repo, "_provider_worktrees"))).toBe(false);
  });

  it("refuses an area that overlaps another lane's or the main folder's, and a lane or branch that exists", async () => {
    const repo = makeRepo();
    expect((await lane(repo, "new", "codex", "tables", "--area", "client/src/tables")).code).toBe(0);
    expect((await lane(repo, "claim", "--area", "server")).code).toBe(0);
    await git(repo, "branch", "lane/grok-old");
    const before = await state(repo);

    const refused: [string[], string][] = [
      [["new", "grok", "same", "--area", "client/src/tables"], "lane codex-tables"],
      [["new", "grok", "parent", "--area", "client/src"], "lane codex-tables"],
      [["new", "grok", "child", "--area", "client/src/tables/felt.ts"], "lane codex-tables"],
      [["new", "grok", "case", "--area", "Client/SRC/Tables/"], "lane codex-tables"],
      [["new", "grok", "main", "--area", "docs", "--area", "server/rooms.ts"], "the main folder"],
      [["new", "codex", "tables", "--area", "docs"], "the lane codex-tables already exists"],
      [["new", "grok", "old", "--area", "docs"], "the branch lane/grok-old already exists"],
    ];
    const results = await Promise.all(refused.map(([args]) => lane(repo, ...args)));
    results.forEach((result, index) => {
      expect(result.code, `${refused[index][0].join(" ")}\n${result.out}`).toBe(1);
      expect(result.out).toContain(refused[index][1]);
    });
    expect(await state(repo)).toBe(before);

    // A folder that only begins with the same letters is a different area.
    const sibling = await lane(repo, "claim", "--area", "client/src/tables-two");
    expect(sibling.code, sibling.out).toBe(0);

    // A lane that lost its .lane.json still holds its areas and its number: new and claim stop.
    rmSync(join(laneFolder(repo, "codex-tables"), ".lane.json"));
    const lost = await state(repo);
    for (const args of [["new", "grok", "cards", "--area", "tests"], ["claim", "--area", "docs"]]) {
      const result = await lane(repo, ...args);
      expect(result.code, result.out).toBe(1);
      expect(result.out).toContain("lane codex-tables has lost its .lane.json");
    }
    expect(await state(repo)).toBe(lost);
  });

  it("claim and release change the areas of the lane or main folder they run in", async () => {
    const repo = makeRepo();
    expect((await lane(repo, "new", "codex", "tables", "--area", "client/src")).code).toBe(0);
    const folder = laneFolder(repo, "codex-tables");

    expect((await lane(folder, "claim", "--area", "docs/", "--area", "CLIENT/src")).code).toBe(0);
    expect(factsIn(folder).areas).toEqual(["client/src", "docs"]);

    // The main folder has no .lane.json until its first claim goes through.
    const taken = await lane(repo, "claim", "--area", "Docs/Notes.txt");
    expect(taken.code, taken.out).toBe(1);
    expect(taken.out).toContain("lane codex-tables");
    expect(existsSync(join(repo, ".lane.json"))).toBe(false);
    expect((await lane(repo, "claim", "--area", "server")).code).toBe(0);
    expect(factsIn(repo)).toMatchObject({ provider: "owner", task: "main", number: 0, serverPort: 3000, clientPort: 5173, areas: ["server"] });

    const blocked = await lane(folder, "claim", "--area", "tests", "--area", "server/rooms.ts");
    expect(blocked.code, blocked.out).toBe(1);
    expect(blocked.out).toContain("the main folder");
    const notHeld = await lane(folder, "release", "--area", "docs", "--area", "server");
    expect(notHeld.code, notHeld.out).toBe(1);
    expect(factsIn(folder).areas).toEqual(["client/src", "docs"]);

    expect((await lane(folder, "release", "--area", "DOCS/")).code).toBe(0);
    expect(factsIn(folder).areas).toEqual(["client/src"]);
    expect((await lane(repo, "claim", "--area", "docs")).code).toBe(0);
    expect(factsIn(repo).areas).toEqual(["server", "docs"]);
  });

  it("status counts the files changed from the base, untracked included, and names those outside the areas", async () => {
    const repo = makeRepo();
    expect((await lane(repo, "new", "codex", "tables", "--area", "client")).code).toBe(0);
    const folder = laneFolder(repo, "codex-tables");
    writeFileSync(join(folder, "client", "src", "app.txt"), "committed on the lane branch\n");
    expect((await git(folder, ...COMMIT, "-am", "lane work")).code).toBe(0);
    writeFileSync(join(folder, "client", "new.txt"), "untracked, inside\n");
    writeFileSync(join(folder, "docs", "notes.txt"), "edited, outside\n");
    writeFileSync(join(folder, "extra.txt"), "untracked, outside\n");
    writeFileSync(join(repo, "docs", "notes.txt"), "edited in the main folder\n");

    const shown = await lane(repo, "status");
    expect(shown.code, shown.out).toBe(0);
    const [mainBlock, laneBlock] = shown.out.trimEnd().split("\n\n");
    expect(mainBlock).toMatch(/^MAIN FOLDER\n/);
    expect(mainBlock).toMatch(/provider: +owner\n +task: +main\n +branch: +trunk\n +areas: +\(none\)\n +ports: +server 3000, client 5173\n/);
    expect(mainBlock).toMatch(/changed files: 1 /);
    expect(laneBlock).toMatch(/^LANE codex-tables\n/);
    expect(laneBlock).toMatch(/provider: +codex\n +task: +tables\n +branch: +lane\/codex-tables\n +areas: +client\n +ports: +server 3101, client 5201\n/);
    expect(laneBlock).toMatch(/changed files: 4 /);
    expect(laneBlock).toMatch(/outside areas: 2\n +docs\/notes\.txt\n +extra\.txt$/);
  });

  it("run starts the matching npm script with the folder's ports and passes the exit code through", async () => {
    const repo = makeRepo();
    expect((await lane(repo, "new", "codex", "tables", "--area", "client")).code).toBe(0);
    const folder = laneFolder(repo, "codex-tables");
    const [browser, failing, main, unknown] = await Promise.all([
      lane(folder, "run", "e2e"),
      start(process.execPath, [TOOL, "run", "typecheck"], folder, { FIXTURE_FAIL: "typecheck" }),
      lane(repo, "run", "client"),
      lane(folder, "run", "deploy"),
    ]);
    expect(browser.code, browser.out).toBe(0);
    expect(browser.out).toContain("ran test:e2e PORT=3101 CLIENT_PORT=5201");
    expect(failing.code, failing.out).toBe(7);
    expect(failing.out).toContain("ran typecheck PORT=3101 CLIENT_PORT=5201");
    expect(main.code, main.out).toBe(0);
    expect(main.out).toContain("ran dev:client PORT=3000 CLIENT_PORT=5173");
    expect(unknown.code).toBeGreaterThan(0);
    expect(unknown.out).not.toContain("ran ");
  });

  it("handin runs the checks, prints the LANE HAND-IN block and never commits", async () => {
    const repo = makeRepo();
    expect((await lane(repo, "new", "codex", "tables", "--area", "client", "--area", "docs")).code).toBe(0);
    const folder = laneFolder(repo, "codex-tables");
    writeFileSync(join(folder, "client", "src", "app.txt"), "lane work\n");
    writeFileSync(join(folder, "docs", "new.txt"), "new file\n");
    const before = await state(repo);

    const handed = await lane(folder, "handin", "--build", "--e2e");
    expect(handed.code, handed.out).toBe(0);
    for (const script of ["typecheck", "test", "build", "test:e2e"]) expect(handed.out).toContain(`ran ${script} PORT=3101 CLIENT_PORT=5201`);
    const block = handed.out.slice(handed.out.indexOf("LANE HAND-IN"));
    expect(block).toMatch(/^LANE HAND-IN\nprovider: +codex\ntask: +tables\nbranch: +lane\/codex-tables\n/);
    expect(block).toContain(`base commit: ${await said(repo, "rev-parse", "HEAD")}\n`);
    const time = /time \(UTC\): +(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ)\n/.exec(block)?.[1] ?? "";
    expect(Math.abs(Date.parse(time) - Date.now())).toBeLessThan(120_000);
    expect(block).toMatch(/areas: +client, docs\n/);
    expect(block).toContain("changed files: 2\n  client/src/app.txt\n  docs/new.txt\nstrays: 0\n");
    expect(block).toContain("checks:\n  typecheck: PASS (exit 0)\n  test: PASS (exit 0)\n  build: PASS (exit 0)\n  e2e: PASS (exit 0)\n");

    // Same branch tips as before and the work is still uncommitted.
    expect(await state(repo)).toBe(before);
    expect(await said(folder, "status", "--porcelain", "--untracked-files=all")).toContain("M client/src/app.txt");

    const inMain = await lane(repo, "handin");
    expect(inMain.code).toBe(1);
    expect(inMain.out).toContain("inside a lane only");
  });

  it("handin fails when a file lies outside the lane's areas", async () => {
    const repo = makeRepo();
    expect((await lane(repo, "new", "codex", "tables", "--area", "client")).code).toBe(0);
    const folder = laneFolder(repo, "codex-tables");
    writeFileSync(join(folder, "client", "src", "app.txt"), "lane work\n");
    writeFileSync(join(folder, "docs", "notes.txt"), "not this lane's file\n");

    const handed = await lane(folder, "handin");
    expect(handed.code, handed.out).toBe(1);
    expect(handed.out).toContain("changed files: 2\n  client/src/app.txt\n  docs/notes.txt   (outside the lane's areas)\nstrays: 1\n  docs/notes.txt\n");
    expect(handed.out).toContain("  typecheck: PASS (exit 0)\n  test: PASS (exit 0)\n");
  });

  it("handin fails when a check fails, and still runs and reports the others", async () => {
    const repo = makeRepo();
    expect((await lane(repo, "new", "codex", "tables", "--area", "client")).code).toBe(0);
    const folder = laneFolder(repo, "codex-tables");
    writeFileSync(join(folder, "client", "src", "app.txt"), "lane work\n");

    const handed = await start(process.execPath, [TOOL, "handin"], folder, { FIXTURE_FAIL: "typecheck" });
    expect(handed.code, handed.out).toBe(1);
    expect(handed.out).toContain("strays: 0\noverlaps: 0\nchecks:\n  typecheck: FAIL (exit 7)\n  test: PASS (exit 0)\n");
  });

  it("handin fails when .lane.json was widened by hand onto an area somebody else holds", async () => {
    const repo = makeRepo();
    expect((await lane(repo, "claim", "--area", "server")).code).toBe(0);
    expect((await lane(repo, "new", "codex", "tables", "--area", "docs")).code).toBe(0);
    const folder = laneFolder(repo, "codex-tables");
    const facts = factsIn(folder);
    writeFileSync(join(folder, ".lane.json"), JSON.stringify({ ...facts, areas: [...facts.areas, "server/rooms.ts"] }));

    const handed = await lane(folder, "handin");
    expect(handed.code, handed.out).toBe(1);
    expect(handed.out).toContain("strays: 0\noverlaps: 1\n  server/rooms.ts overlaps server, held by the main folder\nchecks:\n");
  });

  it("handin lists both sides of a rename, so a file moved out of another area is a stray", async () => {
    const repo = makeRepo();
    expect((await lane(repo, "new", "codex", "tables", "--area", "client")).code).toBe(0);
    const folder = laneFolder(repo, "codex-tables");
    expect((await git(folder, "mv", "docs/notes.txt", "client/notes.txt")).code).toBe(0);

    const handed = await lane(folder, "handin");
    expect(handed.code, handed.out).toBe(1);
    expect(handed.out).toContain("changed files: 2\n  client/notes.txt\n  docs/notes.txt   (outside the lane's areas)\nstrays: 1\n  docs/notes.txt\n");
  });

  it("gives a removed lane's number to the next new lane", async () => {
    const repo = makeRepo();
    expect((await lane(repo, "new", "a", "one", "--area", "client")).code).toBe(0);
    expect((await lane(repo, "new", "b", "one", "--area", "docs")).code).toBe(0);
    rmSync(laneFolder(repo, "a-one"), { recursive: true, force: true });

    expect((await lane(repo, "new", "c", "one", "--area", "server")).code).toBe(0);
    expect(factsIn(laneFolder(repo, "c-one"))).toMatchObject({ number: 1, serverPort: 3101, clientPort: 5201 });
    expect((await lane(repo, "new", "d", "one", "--area", "shared")).code).toBe(0);
    expect(factsIn(laneFolder(repo, "d-one")).number).toBe(3);
  });

  it("refuses new while a lane's .lane.json is damaged, and a hand-made worktree holds nothing", async () => {
    const repo = makeRepo();
    expect((await lane(repo, "new", "a", "one", "--area", "client")).code).toBe(0);
    writeFileSync(join(laneFolder(repo, "a-one"), ".lane.json"), "{");
    expect((await git(repo, "worktree", "add", "-q", "_provider_worktrees/hand-made")).code).toBe(0);

    const damaged = await lane(repo, "new", "b", "one", "--area", "docs");
    expect(damaged.code, damaged.out).toBe(1);
    expect(damaged.out).toContain(".lane.json is damaged");
    const shownDamaged = await lane(repo, "status");
    expect(shownDamaged.code, shownDamaged.out).toBe(0);
    expect(shownDamaged.out).toMatch(/LANE a-one\n +folder: .*\n +problem: .*\.lane\.json is damaged/);

    rmSync(laneFolder(repo, "a-one"), { recursive: true, force: true });
    const made = await lane(repo, "new", "b", "one", "--area", "docs");
    expect(made.code, made.out).toBe(0);
    const shown = await lane(repo, "status");
    expect(shown.code, shown.out).toBe(0);
    expect(shown.out).toMatch(/LANE hand-made\n +folder: .*\n +problem: /);
    expect(shown.out).toMatch(/LANE b-one\n +folder: .*\n +provider: +b\n +task: +one\n +branch: +lane\/b-one\n +areas: +docs\n/);
  });

  it.skipIf(process.platform !== "win32")("status never runs a git.exe found at the top of a lane", async () => {
    const repo = makeRepo();
    expect((await lane(repo, "new", "codex", "tables", "--area", "client")).code).toBe(0);
    // A copy of node named git.exe: run in place of git, it fails, and the lane's block becomes a problem line.
    copyFileSync(process.execPath, join(laneFolder(repo, "codex-tables"), "git.exe"));

    const shown = await lane(repo, "status");
    expect(shown.code, shown.out).toBe(0);
    expect(shown.out).not.toContain("problem:");
    expect(shown.out).toMatch(/LANE codex-tables\n[^]*outside areas: 1\n +git\.exe/);
  });

  it("works when started from a subfolder of the main folder or of a lane", async () => {
    const repo = makeRepo();
    const made = await lane(join(repo, "docs"), "new", "codex", "tables", "--area", "client");
    expect(made.code, made.out).toBe(0);
    const folder = laneFolder(repo, "codex-tables");
    const deep = join(folder, "client", "src");

    const [shown, ran] = await Promise.all([lane(deep, "status"), lane(deep, "run", "test")]);
    expect(shown.out).toContain("MAIN FOLDER");
    expect(shown.out).toContain("LANE codex-tables");
    expect(ran.out).toContain("ran test PORT=3101 CLIENT_PORT=5201");
    expect((await lane(deep, "claim", "--area", "docs")).code).toBe(0);
    expect(factsIn(folder).areas).toEqual(["client", "docs"]);
    expect(existsSync(join(deep, ".lane.json"))).toBe(false);
  });

  it("takes one new at a time: lanes made at the same moment get different numbers and cannot share an area", async () => {
    const repo = makeRepo();
    const results = await Promise.all([
      lane(repo, "new", "alpha", "one", "--area", "client/a"),
      lane(repo, "new", "beta", "one", "--area", "client/b"),
      lane(repo, "new", "gamma", "one", "--area", "client/c"),
      lane(repo, "new", "delta", "one", "--area", "shared"),
      lane(repo, "new", "delta", "two", "--area", "shared/cards"),
    ]);
    expect(results.slice(0, 3).map((result) => result.code)).toEqual([0, 0, 0]);
    expect(results.slice(3).map((result) => result.code).sort()).toEqual([0, 1]);
    const numbers = readdirSync(join(repo, "_provider_worktrees")).map((name) => factsIn(laneFolder(repo, name)).number);
    expect(numbers.sort()).toEqual([1, 2, 3, 4]);
    expect(existsSync(join(repo, ".git", "lane.lock"))).toBe(false);
  });

  it("takes over a lock left behind by a command that is no longer running", async () => {
    const repo = makeRepo();
    writeFileSync(join(repo, ".git", "lane.lock"), "2147483644"); // no process has this id
    const made = await lane(repo, "new", "codex", "tables", "--area", "client");
    expect(made.code, made.out).toBe(0);
    expect(existsSync(join(repo, ".git", "lane.lock"))).toBe(false);
  });

  it("prints a one-line usage for an unknown command", async () => {
    const [unknown, none] = await Promise.all([lane(root, "frobnicate"), lane(root)]);
    for (const result of [unknown, none]) {
      expect(result.code).toBeGreaterThan(0);
      expect(result.out).toMatch(/^Usage: npm run lane -- .*\n$/);
    }
  });
});

describe("the agent rules", () => {
  it("keeps the lane rules in AGENTS.md, so a sync that puts its own file back fails the tests", () => {
    expect(readFileSync(fileURLToPath(new URL("../../AGENTS.md", import.meta.url)), "utf8")).toMatch(/^# Rules for AI agents in this repository/);
  });
});

describe("the client dev server", () => {
  it("takes its port from CLIENT_PORT and its game server from PORT, so two lanes can run at once", () => {
    const serverOptions = (clientPort?: string, serverPort?: string) => {
      vi.stubEnv("CLIENT_PORT", clientPort);
      vi.stubEnv("PORT", serverPort);
      try {
        return clientConfig({ command: "serve", mode: "development" }).server;
      } finally {
        vi.unstubAllEnvs();
      }
    };
    expect(serverOptions("5207", "3107")).toMatchObject({ port: 5207, strictPort: true, proxy: { "/socket.io": { target: "http://localhost:3107" } } });
    expect(serverOptions()).toMatchObject({ port: 5173, strictPort: true, proxy: { "/socket.io": { target: "http://localhost:3000" } } });
  });
});

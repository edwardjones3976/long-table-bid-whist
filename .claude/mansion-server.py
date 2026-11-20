"""Run the game server on port 3000 as a detached process, so it outlives the Claude session that starts it.

    python .claude/mansion-server.py start | stop | restart | status

Windows only (tasklist, taskkill, detached process flags). Python standard library, no PowerShell.
Build first (npm run build): the server serves client/dist.
Log: .claude/mansion-server.log   PID: .claude/mansion-server.pid   (both git-ignored)
"""
import os
import subprocess
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HERE = os.path.join(ROOT, ".claude")
PID = os.path.join(HERE, "mansion-server.pid")
LOG = os.path.join(HERE, "mansion-server.log")
URL = "http://localhost:3000/"

DETACHED = 0x00000008  # DETACHED_PROCESS: no console, not tied to ours
GROUP = 0x00000200  # CREATE_NEW_PROCESS_GROUP: Ctrl+C in our console does not reach it
BREAKAWAY = 0x01000000  # CREATE_BREAKAWAY_FROM_JOB: survives the session's job object being closed


def answering() -> bool:
    try:
        return urllib.request.urlopen(URL, timeout=2).status == 200
    except OSError:
        return False


def running_pid():
    try:
        pid = int(open(PID).read().strip())
    except (OSError, ValueError):
        return None
    out = subprocess.run(["tasklist", "/FI", f"PID eq {pid}", "/NH"], capture_output=True, text=True).stdout
    return pid if str(pid) in out else None


def start() -> None:
    if running_pid() or answering():
        sys.exit("port 3000 is already served; use restart")
    log = open(LOG, "a", encoding="utf-8")
    command = ["node", "--import", "tsx", "server/main.ts"]
    kwargs = dict(cwd=ROOT, stdin=subprocess.DEVNULL, stdout=log, stderr=subprocess.STDOUT, close_fds=True)
    try:
        process = subprocess.Popen(command, creationflags=DETACHED | GROUP | BREAKAWAY, **kwargs)
    except OSError:
        # The job may forbid breakaway; detached still survives the console closing.
        process = subprocess.Popen(command, creationflags=DETACHED | GROUP, **kwargs)
    open(PID, "w").write(str(process.pid))
    for _ in range(40):
        if answering():
            print(f"serving {URL} (pid {process.pid}, log {LOG})")
            return
        time.sleep(0.5)
    sys.exit(f"started pid {process.pid} but {URL} does not answer; see {LOG}")


def stop() -> None:
    pid = running_pid()
    if pid:
        # /T stops the whole tree (node and anything it started).
        subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"], capture_output=True)
        print(f"stopped pid {pid}")
    else:
        print("no recorded server running")
    if os.path.exists(PID):
        os.remove(PID)


if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else "status"
    if action == "start":
        start()
    elif action == "stop":
        stop()
    elif action == "restart":
        stop()
        time.sleep(1)
        start()
    else:
        print(f"pid {running_pid()}, answering {answering()}")

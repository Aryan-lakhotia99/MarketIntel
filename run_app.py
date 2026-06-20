import os
import subprocess
import sys
import time
import signal

def run():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "backend")
    frontend_dir = os.path.join(root_dir, "frontend")

    print("\n[Start] Starting MarketIntel Application...")

    # 1. Determine Backend Python command (check for virtual env)
    venv_python = None
    if sys.platform == "win32":
        candidate = os.path.join(backend_dir, ".venv", "Scripts", "python.exe")
        if os.path.exists(candidate):
            venv_python = candidate
    else:
        candidate = os.path.join(backend_dir, ".venv", "bin", "python")
        if os.path.exists(candidate):
            venv_python = candidate

    python_cmd = venv_python if venv_python else sys.executable
    print(f"[Python] Using python executable: {python_cmd}")

    # 2. Check if npm packages are installed in frontend
    node_modules_dir = os.path.join(frontend_dir, "node_modules")
    if not os.path.exists(node_modules_dir):
        print("[Setup] node_modules not found in frontend. Running 'npm install'...")
        try:
            npm_install_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
            subprocess.run([npm_install_cmd, "install"], cwd=frontend_dir, check=True)
        except Exception as e:
            print(f"[Warning] Failed to run npm install automatically: {e}")

    # 3. Start Backend process
    print("[Backend] Starting FastAPI Backend on http://127.0.0.1:8000...")
    backend_proc = subprocess.Popen(
        [python_cmd, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=backend_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    # 4. Start Frontend process
    print("[Frontend] Starting Next.js Frontend on http://localhost:3000...")
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=frontend_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    # Set up thread-safe streaming logs
    import threading

    def stream_output(process, prefix):
        while True:
            line = process.stdout.readline()
            if not line and process.poll() is not None:
                break
            if line:
                print(f"[{prefix}] {line.strip()}")

    t_back = threading.Thread(target=stream_output, args=(backend_proc, "Backend"))
    t_front = threading.Thread(target=stream_output, args=(frontend_proc, "Frontend"))
    
    t_back.daemon = True
    t_front.daemon = True
    
    t_back.start()
    t_front.start()

    print("\n[Info] Both servers running. Press Ctrl+C to terminate application.\n")

    try:
        while True:
            # Check if any process terminated unexpectedly
            back_status = backend_proc.poll()
            front_status = frontend_proc.poll()

            if back_status is not None:
                print(f"[Error] Backend exited with code {back_status}")
                break
            if front_status is not None:
                print(f"[Error] Frontend exited with code {front_status}")
                break

            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[Shutdown] Shutting down servers gracefully...")
    finally:
        # Kill both processes
        for proc, name in [(backend_proc, "Backend"), (frontend_proc, "Frontend")]:
            try:
                if proc.poll() is None:
                    if sys.platform == "win32":
                        # Send taskkill to kill process tree (needed for npm run dev child processes)
                        subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    else:
                        os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
                    print(f"[OK] Stopped {name}")
            except Exception:
                pass
        print("[Done] All servers stopped.")

if __name__ == "__main__":
    run()

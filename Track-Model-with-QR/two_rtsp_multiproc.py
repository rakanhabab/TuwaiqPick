import os, cv2, time, multiprocessing as mp

# Set per-process to be safe on Windows/Linux
FFMPEG_OPTS = (
    "rtsp_transport;tcp"
    "|stimeout;5000000"     # 5s (µs)
    "|max_delay;0"
    "|buffer_size;102400"
)

URLS  = ["rtsp://192.168.1.7:8554/camA", "rtsp://192.168.1.7:8555/camB"]
NAMES = ["Pi RTSP A", "Pi RTSP B"]

def viewer(url: str, title: str, stop: mp.Event):
    # IMPORTANT: set env in the child process *before* opening VideoCapture
    os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = FFMPEG_OPTS

    cap = None
    last_ok = 0.0
    while not stop.is_set():
        if cap is None:
            cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
            if not cap.isOpened():
                time.sleep(0.3)
                try: cap.release()
                except: pass
                cap = None
                continue

        ok, frame = cap.read()
        if not ok or frame is None:
            # reconnect if stalled for >2s
            if time.time() - last_ok > 2:
                try: cap.release()
                except: pass
                cap = None
                time.sleep(0.25)
            continue

        last_ok = time.time()
        cv2.imshow(title, frame)
        if (cv2.waitKey(1) & 0xFF) == 27:  # ESC closes both
            stop.set()
            break

    if cap is not None:
        cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    mp.set_start_method("spawn", force=True)
    stop = mp.Event()
    procs = [mp.Process(target=viewer, args=(u, n, stop), daemon=True)
             for u, n in zip(URLS, NAMES)]
    for p in procs: p.start()

    try:
        while not stop.is_set():
            time.sleep(0.2)
    except KeyboardInterrupt:
        stop.set()
    finally:
        for p in procs: p.join()
import cv2, threading, queue, time

def gst_pipeline(url: str) -> str:
    return (
        f"rtspsrc location={url} protocols=tcp latency=0 drop-on-latency=true ! "
        "rtph264depay ! h264parse ! avdec_h264 ! videoconvert ! "
        "appsink sync=false max-buffers=1 drop=true"
    )

URLS = [
    "rtsp://192.168.1.7:8554/camA",
    "rtsp://192.168.1.7:8555/camB",
]
NAMES = ["Pi RTSP A", "Pi RTSP B"]

def reader(url: str, out_q: queue.Queue, stop: threading.Event):
    cap = cv2.VideoCapture(gst_pipeline(url), cv2.CAP_GSTREAMER)
    while not stop.is_set():
        if not cap.isOpened():
            time.sleep(0.2)
            cap.release()
            cap = cv2.VideoCapture(gst_pipeline(url), cv2.CAP_GSTREAMER)
            continue
        ok, frame = cap.read()
        if not ok or frame is None:
            time.sleep(0.01)
            continue
        # keep only latest frame
        if not out_q.empty():
            try: out_q.get_nowait()
            except: pass
        out_q.put(frame)
    cap.release()

def main():
    stop = threading.Event()
    queues = [queue.Queue(maxsize=1) for _ in URLS]
    threads = [threading.Thread(target=reader, args=(u, q, stop), daemon=True)
               for u, q in zip(URLS, queues)]
    for t in threads: t.start()

    try:
        while not stop.is_set():
            for name, q in zip(NAMES, queues):
                if not q.empty():
                    frame = q.get()
                    cv2.imshow(name, frame)
            if (cv2.waitKey(1) & 0xFF) == 27:
                stop.set()
    finally:
        stop.set()
        for t in threads: t.join()
        cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
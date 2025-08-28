"""
Main application for tracking customers, linking them via QR codes, and detecting products on tables.

This script extends the original single‑camera implementation to fully support a second table (Table B)
and connect to Raspberry Pi RTSP streams for both table cameras. Each table camera is viewed in a
separate process using Python's multiprocessing module to satisfy Raspberry Pi streaming constraints.

Key changes:
  • Added FFMPEG options and RTSP URLs for the Pi cameras.
  • Added a `viewer` function which runs in its own process to display raw frames from the Pi streams.
  • Defined coordinates for Table B in `TABLES` and enabled snapshot/detection logic for it.
  • Initialized both `cap_table_a` and `cap_table_b` using the RTSP URLs instead of local device indices.
  • Added a live annotation window for Table B similar to Table A.

Note: This file only implements the new Table B and RTSP integration. Other suggestions discussed
previously (such as using `Counter` for diffs, decoupling HTTP with threads, or throttling detection)
are **not** implemented here, but are reiterated in the final comments for future reference.
"""

import os
import cv2
import time
import multiprocessing as mp
import numpy as np
from ultralytics import YOLO
from collections import defaultdict
from api import InvoiceItem, InvoiceCreate
import requests
from typing import List
import torch

# ------------------------------------------------------------------------------
# Raspberry Pi RTSP configuration
# ------------------------------------------------------------------------------
# These options instruct OpenCV to use TCP transport for RTSP, set reasonable
# timeouts, disable internal buffering and tune the buffer size. Without them
# the Pi streams may hang or introduce significant latency.
FFMPEG_OPTS = (
    "rtsp_transport;tcp"
    "|stimeout;5000000"     # 5s (µs)
    "|max_delay;0"
    "|buffer_size;102400"
)

# Replace these with the actual RTSP URLs of your Raspberry Pi cameras. camA
# corresponds to Table A, and camB corresponds to Table B.
URLS = [
    "rtsp://192.168.1.7:8554/camA",  # Table A camera
    "rtsp://192.168.1.7:8555/camB",  # Table B camera
]

# Human friendly names for the viewer windows. Used by the viewer processes.
NAMES = ["Pi RTSP A", "Pi RTSP B"]

def viewer(url: str, title: str, stop: mp.Event):
    """
    Separate process to display a raw RTSP stream from a Raspberry Pi. This function
    runs in its own process via multiprocessing to avoid conflicts with the main
    OpenCV loop. Closing the window (ESC key) will signal all viewers to stop.

    Parameters
    ----------
    url : str
        The RTSP URL to connect to.
    title : str
        The title of the window.
    stop : mp.Event
        Shared event used to stop all viewer processes.
    """
    # Set the FFMPEG options inside the child process. Each spawned process
    # needs its own environment setting for OpenCV FFMPEG capture options.
    os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = FFMPEG_OPTS

    cap = None
    last_ok = 0.0
    while not stop.is_set():
        # Lazily (re)open the connection if it's not open or has failed
        if cap is None:
            cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
            if not cap.isOpened():
                time.sleep(0.3)
                try:
                    cap.release()
                except Exception:
                    pass
                cap = None
                continue

        ok, frame = cap.read()
        if not ok or frame is None:
            # If stalled for more than two seconds, reconnect
            if time.time() - last_ok > 2:
                try:
                    cap.release()
                except Exception:
                    pass
                cap = None
                time.sleep(0.25)
            continue

        last_ok = time.time()
        cv2.imshow(title, frame)
        # Exit on ESC key; propagate stop to all processes
        if (cv2.waitKey(1) & 0xFF) == 27:
            stop.set()
            break

    if cap is not None:
        cap.release()
    cv2.destroyAllWindows()

# ------------------------------------------------------------------------------
# Invoice API configuration
# ------------------------------------------------------------------------------
INVOICE_API_URL = "http://127.0.0.1:8000/invoices"

# ------------------------------------------------------------------------------
# YOLO model configuration
# ------------------------------------------------------------------------------
MOTION_CAM_INDEX = 0  # YOLO tracking camera (local webcam)
PERSON_CLASS_ID = 0
NEAR_MARGIN_PX = 30

# Hard‑coded table zones by pixel coordinates. Table B has been enabled with
# placeholder coordinates; adjust these values to match the actual location of
# Table B in your motion camera feed.
TABLES = {
    "Table A": (229, 202, 302, 296),
    "Table B": (400, 200, 480, 300),  # example coordinates; update as needed
}

# Whether to clear the latest user IDs on exit. Retained for compatibility.
CLEAR_LATEST_ON_EXIT = False

# Maps (track_id, zone) → baseline snapshot list
baseline_snapshots: dict[tuple[int, str], list[str]] = {}

# Create separate model for item detection (same weights). Use GPU if available.
device = "cuda" if torch.cuda.is_available() else "cpu"
item_model = YOLO(r"C:\Users\Rakan\Desktop\Capstone\TuwaiqPick\Track-Model-with-QR\weights.pt")
item_model.to(device)

# Initialize the FFMPEG options for the main process. This ensures that
# VideoCapture will pick up the Raspberry Pi streams correctly when used in
# capture_snapshot or live annotation windows. Without this, OpenCV may fall
# back to UDP transport or large buffers which can cause latency.
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = FFMPEG_OPTS

def capture_snapshot(table_name: str) -> list[str]:
    """
    Capture a frame from the table camera, run object detection, and return a
    list of class names (duplicates preserved). Now supports both Table A and
    Table B using their RTSP feeds.

    Parameters
    ----------
    table_name : str
        Either "Table A" or "Table B". For unsupported names an empty list is
        returned.

    Returns
    -------
    list[str]
        The detected class names (one entry per detected instance).
    """
    if table_name == "Table A":
        cam = cap_table_a
    elif table_name == "Table B":
        cam = cap_table_b
    else:
        return []

    ret, frame = cam.read()
    if not ret or frame is None:
        print(f"[snapshot] Failed to read from {table_name} camera.")
        return []

    # Run detection on the snapshot frame; duplicates are preserved
    results = item_model(
        frame,
        conf=0.30,
        iou=0.45,
        agnostic_nms=True,
        verbose=False
    )

    if results and results[0].boxes is not None:
        return [item_model.names[int(box.cls[0])] for box in results[0].boxes]
    return []

def compute_missing(baseline: list[str], current: list[str]) -> list[str]:
    """
    Compare baseline and current lists and return items missing from the current
    list (duplicates preserved). This function iteratively removes matching
    entries and appends missing ones to a new list.

    Parameters
    ----------
    baseline : list[str]
        The list of item names captured when a person entered the zone.
    current : list[str]
        The list of item names captured when the person left the zone.

    Returns
    -------
    list[str]
        Items that are present in baseline but not in current (respecting
        duplicates).
    """
    current_copy = list(current)
    missing = []
    for item in baseline:
        if item in current_copy:
            current_copy.remove(item)
        else:
            missing.append(item)
    return missing

def on_zone_enter(track_id: int, zone: str):
    """
    Fired when a person enters a zone (including switching from another zone).
    Captures a baseline snapshot of items on the table.
    """
    print(f"[enter] track {track_id} -> {zone} | LatestA={TableALatestID} LatestB={TableBLatestID}")
    if zone in ["Table A", "Table B"]:
        # Take snapshot at moment of entering
        baseline = capture_snapshot(zone)
        baseline_snapshots[(track_id, zone)] = baseline
        print(f"[snapshot] Baseline for {zone}, track {track_id}: {baseline}")

def on_zone_exit(track_id: int, zone: str):
    """
    Fired when a person leaves a zone (including switching to another zone).
    Captures current snapshot, computes missing items, and queues them.
    """
    global TableALatestID, TableBLatestID

    # Process item differences if we have a baseline for this track in this zone
    baseline = baseline_snapshots.pop((track_id, zone), None)
    if baseline is not None:
        current_items = capture_snapshot(zone)
        missing = compute_missing(baseline, current_items)
        if missing:
            print(f"[snapshot] Missing items for {zone}, track {track_id}: {missing}")
            for item_name in missing:
                # Each duplicate item is queued separately
                queue_invoice_item(track_id, item_name, 1)

    # Maintain last user ID logic
    user_id = identity_map.get(track_id, (str(track_id), ""))[0]
    if zone == "Table A":
        TableALatestID = user_id
    elif zone == "Table B":
        TableBLatestID = user_id

    print(f"[leave] track {track_id} <- {zone} | LatestA={TableALatestID} LatestB={TableBLatestID}")

def on_zone_change(track_id: int, new_zone: str | None, old_zone: str | None):
    # No movement
    if new_zone == old_zone:
        return

    # Left all zones
    if old_zone is not None and new_zone is None:
        on_zone_exit(track_id, old_zone)
        return

    # Entered from no zone
    if old_zone is None and new_zone is not None:
        on_zone_enter(track_id, new_zone)
        return

    # Switched zones (treat as exit then enter)
    if old_zone is not None and new_zone is not None:
        on_zone_exit(track_id, old_zone)
        on_zone_enter(track_id, new_zone)
        return

def on_identity_linked(track_id: int, user_id: str, user_name: str):
    print(f"[identity] track {track_id} linked to {user_name} ({user_id})")

# ----------------------------
# UTILS
# ----------------------------

def queue_invoice_item(track_id: int, name: str, quantity: int):
    """
    Call this whenever your shelf logic decides the person took an item.
    Example: queue_invoice_item(track_id, "Pepsi 330ml", 1)
    """
    try:
        item = InvoiceItem(name=name, quantity=quantity)
        cart_items[track_id].append(item)
        print(f"[cart] track {track_id}: +{quantity} x {name} (total items now {len(cart_items[track_id])})")
    except Exception as e:
        print(f"[cart] Failed to queue item for track {track_id}: {e}")

def _get_user_id_for_track(track_id: int) -> str | None:
    """
    Extract user_id previously linked via QR. Returns None if not linked.
    """
    if track_id in identity_map:
        return identity_map[track_id][0]  # (user_id, user_name)
    return None

def _flush_invoice_for_track(track_id: int):
    """
    Build and POST InvoiceCreate for this track if possible.
    Clears the cart on success (or leaves it intact on failure).
    """
    user_id = _get_user_id_for_track(track_id)
    items = cart_items.get(track_id, [])

    if not user_id:
        print(f"[invoice] track {track_id}: no user_id bound; skipping invoice.")
        return

    if not items:
        print(f"[invoice] track {track_id}: no items; nothing to invoice.")
        return

    # Build pydantic model then POST as JSON
    try:
        payload = InvoiceCreate(user_id=user_id, items=items)
        print(payload.model_dump())
        resp = requests.post(INVOICE_API_URL, json=payload.model_dump())
        if resp.status_code >= 200 and resp.status_code < 300:
            print(f"[invoice] track {track_id}: SUCCESS {resp.status_code}")
            cart_items.pop(track_id, None)  # clear on success
        else:
            print(f"[invoice] track {track_id}: FAILED {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"[invoice] track {track_id}: ERROR posting invoice: {e}")

def on_person_left(track_id: int):
    """
    Called when a track disappears from the frame.
    """
    print(f"[leave] track {track_id} left the frame; attempting to flush invoice.")
    _flush_invoice_for_track(track_id)

    # Clean up identity map and last_zone to avoid growth
    identity_map.pop(track_id, None)
    last_zone.pop(track_id, None)

def point_in_rect_with_margin(pt, rect, margin=0):
    x, y = pt
    x1, y1, x2, y2 = rect
    return (x1 - margin) <= x <= (x2 + margin) and (y1 - margin) <= y <= (y2 + margin)

def rect_center(rect):
    x1, y1, x2, y2 = rect
    return ((x1 + x2) // 2, (y1 + y2) // 2)

def choose_zone_for_point(pt):
    candidates = []
    for name, rect in TABLES.items():
        if point_in_rect_with_margin(pt, rect, NEAR_MARGIN_PX):
            cx, cy = rect_center(rect)
            dist2 = (pt[0] - cx) ** 2 + (pt[1] - cy) ** 2
            candidates.append((dist2, name))
    if not candidates:
        return None
    candidates.sort(key=lambda t: t[0])
    return candidates[0][1]

# ---- OpenCV QR helpers (version‑safe)
def decode_multi(detector, frame):
    out = detector.detectAndDecodeMulti(frame)
    if isinstance(out, tuple):
        if len(out) == 3:
            decoded_info, points, _ = out
            ok = points is not None and len(decoded_info) > 0
            return ok, decoded_info, points
        elif len(out) == 4:
            retval, decoded_info, points, _ = out
            ok = bool(retval) and points is not None and len(decoded_info) > 0
            return ok, decoded_info, points
    return False, [], None

def decode_single(detector, frame):
    out = detector.detectAndDecode(frame)
    if isinstance(out, tuple):
        if len(out) == 3:
            text, points, _ = out
            return text, points
        elif len(out) == 4:
            retval, text, points, _ = out
            return text, points
    return str(out) if out is not None else "", None

clicked_points_qr = []            # show clicks on QR window
selected_track_id = [None]
last_zone = defaultdict(lambda: None)
identity_map = {}                 # track_id -> (user_id, user_name)
TableALatestID = ""
TableBLatestID = ""
cart_items = defaultdict(list)
_active_ids_prev = set()

# mouse: QR window
def mouse_qr(event, x, y, flags, param):
    if event == cv2.EVENT_LBUTTONDOWN:
        print(f"[QR window] Clicked at: x={x}, y={y}")
        clicked_points_qr.append((x, y))

# motion window select nearest track under click
def mouse_motion_factory(current_tracks_ref):
    # current_tracks_ref(): returns list of (track_id, cx, cy, bbox)
    def cb(event, x, y, flags, param):
        if event == cv2.EVENT_LBUTTONDOWN:
            tracks = current_tracks_ref()
            if not tracks:
                print("[motion] No tracks to select.")
                return
            # choose nearest center
            best = None
            best_d2 = 1e18
            for tid, cx, cy, bbox in tracks:
                d2 = (x - cx) ** 2 + (y - cy) ** 2
                if d2 < best_d2:
                    best_d2 = d2
                    best = tid
            selected_track_id[0] = int(best)
            print(f"[motion] Selected track ID: {selected_track_id[0]}")
    return cb

def main():
    # Spawn viewer processes for the Pi streams. Using spawn start method is
    # recommended on Windows. We do this early so that the windows show the raw
    # streams independently of the annotated views in the main process.
    mp.set_start_method("spawn", force=True)
    stop_event = mp.Event()
    viewer_processes = [
        mp.Process(target=viewer, args=(url, name, stop_event), daemon=True)
        for url, name in zip(URLS, NAMES)
    ]
    for p in viewer_processes:
        p.start()

    # Prepare QR camera (1) — unchanged from original code
    cap_qr = cv2.VideoCapture(1, cv2.CAP_DSHOW)
    if not cap_qr.isOpened():
        raise RuntimeError("Could not open QR camera (index 1).")

    # Prepare table cameras by connecting to the Pi RTSP streams. Use FFMPEG
    # capture backend. The global variables `cap_table_a` and `cap_table_b` are
    # updated here so that capture_snapshot can read frames from them.
    global cap_table_a, cap_table_b
    cap_table_a = cv2.VideoCapture(URLS[0], cv2.CAP_FFMPEG)
    cap_table_b = cv2.VideoCapture(URLS[1], cv2.CAP_FFMPEG)

    table_a_win = "Table A Cam"
    table_b_win = "Table B Cam"
    cv2.namedWindow(table_a_win)
    cv2.namedWindow(table_b_win)

    if not cap_table_a.isOpened():
        raise RuntimeError("Could not open Table A camera via RTSP.")
    if not cap_table_b.isOpened():
        raise RuntimeError("Could not open Table B camera via RTSP.")

    # Optionally set snapshot camera resolutions (helps consistent FPS)
    cap_table_a.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap_table_a.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    cap_table_b.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap_table_b.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    # prepare windows
    motion_win = "Proximity Tracker (click to select track, q to quit)"
    qr_win = "QR Scanner (click shows x,y)"
    cv2.namedWindow(motion_win)
    cv2.namedWindow(qr_win)
    cv2.setMouseCallback(qr_win, mouse_qr)

    # the motion window needs current track data for selection:
    current_tracks = []  # list of (track_id, cx, cy, (x1,y1,x2,y2))
    def get_current_tracks():
        return list(current_tracks)

    cv2.setMouseCallback(motion_win, mouse_motion_factory(get_current_tracks))

    # YOLO model & stream from motion cam (0)
    model = YOLO("yolov8n.pt")
    results_stream = model.track(
        source=MOTION_CAM_INDEX,
        stream=True,
        persist=True,
        classes=[PERSON_CLASS_ID],
        tracker="bytetrack.yaml",
        verbose=False
    )

    detector = cv2.QRCodeDetector()
    seen_qr = set()  # avoid spamming duplicates

    print("Running. In the motion window, click a person to select their track.\n"
          "In the QR window, click to see (x,y). Press 'q' in any window to quit.")

    global _active_ids_prev
    for result in results_stream:
        # motion (cam 0)
        frame_motion = result.orig_img
        h0, w0 = frame_motion.shape[:2]
        current_tracks.clear()

        # draw zones
        for name, (x1, y1, x2, y2) in TABLES.items():
            cv2.rectangle(frame_motion, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.rectangle(frame_motion, (x1 - NEAR_MARGIN_PX, y1 - NEAR_MARGIN_PX),
                          (x2 + NEAR_MARGIN_PX, y2 + NEAR_MARGIN_PX), (0, 255, 0), 1)
            cv2.putText(frame_motion, name, (x1, max(20, y1 - 8)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2, cv2.LINE_AA)

        boxes = result.boxes
        if boxes is not None and boxes.id is not None:
            ids = boxes.id.cpu().numpy().astype(int)
            xyxy = boxes.xyxy.cpu().numpy().astype(int)
            cls = boxes.cls.cpu().numpy().astype(int)

            for i, box in enumerate(xyxy):
                if cls[i] != PERSON_CLASS_ID:
                    continue
                track_id = int(ids[i])
                x1, y1, x2, y2 = box
                cx = (x1 + x2) // 2
                cy = (y1 + y2) // 2

                current_tracks.append((track_id, cx, cy, (x1, y1, x2, y2)))

                zone = choose_zone_for_point((cx, cy))
                if zone != last_zone[track_id]:
                    on_zone_change(track_id, zone, last_zone[track_id])
                    last_zone[track_id] = zone

                # draw bbox
                color = (255, 255, 255)
                if selected_track_id[0] == track_id:
                    color = (0, 255, 255)
                cv2.rectangle(frame_motion, (x1, y1), (x2, y2), color, 2)

                # label show linked identity
                if track_id in identity_map:
                    user_id, user_name = identity_map[track_id]
                    id_text = f"{user_name} ({user_id})"
                else:
                    id_text = f"ID {track_id}"
                label = f"{id_text} | {zone or 'No table'}"
                cv2.putText(frame_motion, label, (x1, max(20, y1 - 8)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.65, color, 2, cv2.LINE_AA)

                cv2.circle(frame_motion, (cx, cy), 4, color, -1)

        # Update active ID tracking
        current_ids = {tid for (tid, cx, cy, box) in current_tracks}
        left_ids = _active_ids_prev - current_ids
        for tid in left_ids:
            on_person_left(tid)
        _active_ids_prev = current_ids

        # QR (cam 1)
        ok_qr, frame_qr = cap_qr.read()
        if not ok_qr or frame_qr is None:
            frame_qr = np.zeros((360, 480, 3), dtype=np.uint8)
            cv2.putText(frame_qr, "QR cam read failed", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

        # decode multi QR first
        success, decoded_info, pts_list = decode_multi(detector, frame_qr)
        if success:
            for text, pts in zip(decoded_info, pts_list):
                if pts is None:
                    continue
                pts = pts.astype(int).reshape(-1, 2)
                for i in range(len(pts)):
                    cv2.line(frame_qr, tuple(pts[i]), tuple(pts[(i+1) % len(pts)]), (0, 255, 0), 2)

                if text:
                    x, y = pts[0]
                    cv2.putText(frame_qr, text, (x, max(y - 10, 0)),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                    # Add this later: text not in seen_qr and
                    if selected_track_id[0] is not None:
                        payload = text.strip()
                        user_id, user_name = payload, payload
                        identity_map[selected_track_id[0]] = (user_id, user_name)
                        on_identity_linked(selected_track_id[0], user_id, user_name)
                        seen_qr.add(text)
        else:
            text, pts = decode_single(detector, frame_qr)
            if pts is not None and text:
                pts = pts.astype(int).reshape(-1, 2)
                for i in range(len(pts)):
                    cv2.line(frame_qr, tuple(pts[i]), tuple(pts[(i+1) % len(pts)]), (0, 255, 0), 2)
                x, y = pts[0]
                cv2.putText(frame_qr, text, (x, max(y - 10, 0)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                if text not in seen_qr and selected_track_id[0] is not None:
                    payload = text.strip()
                    user_id, user_name = payload, payload
                    identity_map[selected_track_id[0]] = (user_id, user_name)
                    on_identity_linked(selected_track_id[0], user_id, user_name)
                    seen_qr.add(text)

        # draw markers
        for (qx, qy) in clicked_points_qr:
            cv2.circle(frame_qr, (qx, qy), 4, (0, 0, 255), -1)
            cv2.putText(frame_qr, f"({qx},{qy})", (qx + 5, qy - 5),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)

        # Table A live detection overlay
        ok_a, frame_a = cap_table_a.read()
        if ok_a and frame_a is not None:
            res_a = item_model(
                frame_a,
                conf=0.30,
                iou=0.45,
                agnostic_nms=True,
                verbose=False
            )
            frame_a_annot = res_a[0].plot(line_width=2, labels=True, conf=True)
            cv2.imshow(table_a_win, frame_a_annot)
        else:
            placeholder_a = np.zeros((360, 480, 3), dtype=np.uint8)
            cv2.putText(placeholder_a, "Table A cam read failed", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            cv2.imshow(table_a_win, placeholder_a)

        # Table B live detection overlay
        ok_b, frame_b = cap_table_b.read()
        if ok_b and frame_b is not None:
            res_b = item_model(
                frame_b,
                conf=0.30,
                iou=0.45,
                agnostic_nms=True,
                verbose=False
            )
            frame_b_annot = res_b[0].plot(line_width=2, labels=True, conf=True)
            cv2.imshow(table_b_win, frame_b_annot)
        else:
            placeholder_b = np.zeros((360, 480, 3), dtype=np.uint8)
            cv2.putText(placeholder_b, "Table B cam read failed", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            cv2.imshow(table_b_win, placeholder_b)

        cv2.imshow(motion_win, frame_motion)
        cv2.imshow(qr_win, frame_qr)

        # Quit on 'q'
        if (cv2.waitKey(1) & 0xFF) == ord('q'):
            break

    # On exit, signal viewer processes to stop and wait for them to finish
    stop_event.set()
    for p in viewer_processes:
        p.join()

    cap_qr.release()
    cap_table_a.release()
    cap_table_b.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
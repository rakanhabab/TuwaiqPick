import os
import cv2
import numpy as np
from ultralytics import YOLO
from collections import defaultdict


MOTION_CAM_INDEX = 0        #YOLO tracking camera
QR_CAM_INDEX = 1            #QR scanning camera
MODEL_WEIGHTS = "yolov8n.pt"
PERSON_CLASS_ID = 0
NEAR_MARGIN_PX = 30

#hard coded table zones by pixel
TABLES = {
    "Table A": (125, 195, 175, 225),
    "Table B": (410, 225, 500, 250),
}

def on_zone_change(track_id: int, new_zone: str | None, old_zone: str | None):
    print(f"[event] track {track_id}: {old_zone} -> {new_zone}")

def on_identity_linked(track_id: int, user_id: str, user_name: str):
    print(f"[identity] track {track_id} linked to {user_name} ({user_id})")

# ----------------------------
# UTILS
# ----------------------------
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

# ---- OpenCV QR helpers (version-safe)
def decode_multi(detector, frame):
    out = detector.detectAndDecodeMulti(frame)
    # (decoded_info, points, straight) OR (retval, decoded_info, points, straight)
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
    # (text, points, straight) OR (retval, text, points, straight)
    if isinstance(out, tuple):
        if len(out) == 3:
            text, points, _ = out
            return text, points
        elif len(out) == 4:
            retval, text, points, _ = out
            return text, points
    return str(out) if out is not None else "", None



clicked_points_qr = []            #show clicks on QR window
selected_track_id = [None]        
last_zone = defaultdict(lambda: None)
identity_map = {}                 # track_id -> (user_id, user_name)

#mouse: QR window
def mouse_qr(event, x, y, flags, param):
    if event == cv2.EVENT_LBUTTONDOWN:
        print(f"[QR window] Clicked at: x={x}, y={y}")
        clicked_points_qr.append((x, y))

#motion window select nearest track under click
def mouse_motion_factory(current_tracks_ref):
    #current_tracks_ref(): returns list of (track_id, cx, cy, bbox)
    def cb(event, x, y, flags, param):
        if event == cv2.EVENT_LBUTTONDOWN:
            tracks = current_tracks_ref()
            if not tracks:
                print("[motion] No tracks to select.")
                return
            #choose nearest center
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
    os.environ["ULTRALYTICS_LAP"] = "scipy"

    #prrepare QR camera (1)
    cap_qr = cv2.VideoCapture(QR_CAM_INDEX, cv2.CAP_DSHOW)
    if not cap_qr.isOpened():
        raise RuntimeError("Could not open QR camera (index 1).")

    #prepare windows
    motion_win = "Proximity Tracker (click to select track, q to quit)"
    qr_win = "QR Scanner (click shows x,y)"
    cv2.namedWindow(motion_win)
    cv2.namedWindow(qr_win)
    cv2.setMouseCallback(qr_win, mouse_qr)

    #the motion window needs current track data for selection:
    current_tracks = []  # list of (track_id, cx, cy, (x1,y1,x2,y2))
    def get_current_tracks():
        return list(current_tracks)

    cv2.setMouseCallback(motion_win, mouse_motion_factory(get_current_tracks))

    #YOLO model & stream from motion cam (0)
    model = YOLO(MODEL_WEIGHTS)
    results_stream = model.track(
        source=MOTION_CAM_INDEX,
        stream=True,
        persist=True,
        classes=[PERSON_CLASS_ID],
        tracker="bytetrack.yaml",
        verbose=False
    )

    detector = cv2.QRCodeDetector()
    seen_qr = set()  #avoid spamming duplicates

    print("Running. In the motion window, click a person to select their track.\n"
          "In the QR window, click to see (x,y). Press 'q' in any window to quit.")

    for result in results_stream:
        # motion (cam 0) 
        frame_motion = result.orig_img 
        h0, w0 = frame_motion.shape[:2]
        current_tracks.clear()

        #draw zones
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

        # QR (cam 1)
        ok_qr, frame_qr = cap_qr.read()
        if not ok_qr:
            # If QR cam hiccups, just keep motion going
            frame_qr = np.zeros((360, 480, 3), dtype=np.uint8)
            cv2.putText(frame_qr, "QR cam read failed", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

        #decode multi first
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
                    if text not in seen_qr and selected_track_id[0] is not None:
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

        #draw markers
        for (qx, qy) in clicked_points_qr:
            cv2.circle(frame_qr, (qx, qy), 4, (0, 0, 255), -1)
            cv2.putText(frame_qr, f"({qx},{qy})", (qx + 5, qy - 5),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)

        cv2.imshow(motion_win, frame_motion)
        cv2.imshow(qr_win, frame_qr)

        if (cv2.waitKey(1) & 0xFF) == ord('q'):
            break

    cap_qr.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
import cv2
from ultralytics import YOLO
import torch

# Automatically select device: CUDA if available, otherwise CPU
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

# Load YOLO model with weights
model = YOLO(r"C:\Users\Rakan\Desktop\Capstone\TuwaiqPick\Track-Model-with-QR\weights.pt")
model.to(device)

# Try DirectShow on Windows for better camera access
cap = cv2.VideoCapture(1, cv2.CAP_DSHOW)  # change 0/1/2 depending on your camera index
if not cap.isOpened():
    raise RuntimeError("Could not open camera. Try index 0/1/2, or check privacy permissions.")

# Set resolution
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

# ---- Snapshot logic ----
baseline_items = set()   # what was visible when you last refreshed
last_missing = []        # last reported missing list (for your reference)

def build_current_items(result_obj):
    """
    From a YOLO result, build the set of unique class names currently visible.
    """
    if result_obj is None or result_obj.boxes is None or len(result_obj.boxes) == 0:
        return set()
    return [model.names[int(box.cls[0])] for box in result_obj.boxes]

def refresh_snapshot(current_set):
    """
    Set the baseline snapshot to the current visible items.
    """
    global baseline_items
    baseline_items = list(current_set)
    print("Snapshot refreshed. Baseline items:", sorted(baseline_items))

def get_missing_items(current_set):
    """
    Return the items that are missing now compared to the last snapshot.
    Missing = in baseline but NOT in current.
    """
    current_copy = list(current_set)  # make a copy
    missing = []
    for item in baseline_items:
        if item in current_copy:
            current_copy.remove(item)  # consume one occurrence
        else:
            missing.append(item)
    print("Missing items:", missing)

    return missing

print("Controls: [R] refresh snapshot | [SPACE] show missing since snapshot | [Q/ESC] quit")

while True:
    ret, frame = cap.read()
    if not ret:
        print("Frame grab failed; exiting.")
        break

    # Run YOLO on the BGR frame
    results = model(
        frame,
        conf=0.30,          # confidence threshold
        iou=0.45,           # NMS IoU threshold
        agnostic_nms=True,  # class-agnostic NMS
        verbose=False
    )

    # Build current items from this frame
    current_items = build_current_items(results[0] if results else None)

    # Draw detections
    annotated = results[0].plot(line_width=2, labels=True, conf=True) if results else frame
    cv2.imshow("YOLO Live", annotated)

    key = cv2.waitKey(1) & 0xFF
    if key == ord('r'):  # Refresh snapshot to the items visible NOW
        refresh_snapshot(current_items)
    elif key == ord(' '):  # SPACE -> print/return missing items since last snapshot
        last_missing = get_missing_items(current_items)
        # you can use last_missing programmatically here if needed
    elif key == ord('q') or key == 27:  # q or ESC to exit
        break

cap.release()
cv2.destroyAllWindows()

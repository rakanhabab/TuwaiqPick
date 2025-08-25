import cv2
from ultralytics import YOLO
import torch

# اختاري الجهاز تلقائياً: CUDA إن وُجد، وإلا CPU
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

# استبدلي "weights.pt" بوزن صحيح (مثلاً yolov8n.pt أو مسار وزناتك)
model = YOLO("weights.pt")
model.to(device)

# في ويندوز جرّبي DirectShow لتحسين فتح الكاميرا
cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)  # بدّلي 0 إلى 1/2 لو عندك كام ثانية
if not cap.isOpened():
    raise RuntimeError("Could not open camera. Try index 0/1/2, or check privacy permissions.")

# دقة مناسبة
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

while True:
    ret, frame = cap.read()
    if not ret:
        print("Frame grab failed; exiting.")
        break

    # تشغيل YOLO مباشرة على إطار BGR
    results = model(
        frame,
        conf=0.30,          # حدّ الثقة
        iou=0.45,           # حدّ الـ NMS IoU
        agnostic_nms=True,  # دمج عبر الأصناف
        verbose=False
    )

    # رسم النتائج على الإطار
    annotated = results[0].plot(line_width=2, labels=True, conf=True)

    cv2.imshow("YOLO Live", annotated)

    key = cv2.waitKey(1) & 0xFF
    if key == ord('q') or key == 27:  # q أو ESC للخروج
        break

cap.release()
cv2.destroyAllWindows()
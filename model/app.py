import numpy as np
from flask import Flask, request, jsonify, render_template
import cv2
import pyaudio
import threading
import time

app = Flask(__name__)

# Load YOLO model
net = cv2.dnn.readNet("yolov3 (3).weights", "yolov3 (2).cfg")
layer_names = net.getLayerNames()
output_layers = [layer_names[i - 1] for i in net.getUnconnectedOutLayers()]

# Load COCO class labels
with open("coco.names", "r") as f:
    classes = f.read().strip().split("\n")

# Define class IDs for people, cell phones, and books (adjust based on your YOLO model's classes)
person_class_id = 0
cell_phone_class_id = 67
book_class_id = 74

# Audio detection parameters
chunk = 1024
format = pyaudio.paInt16
channels = 1
rate = 44100
threshold = 1000  # Adjust this threshold based on your needs
cooldown_time = 2

p = pyaudio.PyAudio()
audio_stream = None
audio_alert = False

def detect_objects(frame):
    height, width, _ = frame.shape

    # Preprocess the frame for YOLO input
    blob = cv2.dnn.blobFromImage(frame, 0.00392, (416, 416), (0, 0, 0), True, crop=False)
    net.setInput(blob)

    # Forward pass through YOLO network
    outs = net.forward(output_layers)

    # Initialize variables for object detection
    class_ids = []
    confidences = []
    boxes = []

    # Process each detection
    for out in outs:
        for detection in out:
            scores = detection[5:]
            class_id = np.argmax(scores)
            confidence = scores[class_id]

            if confidence > 0.5:
                # Calculate object coordinates and dimensions
                center_x = int(detection[0] * width)
                center_y = int(detection[1] * height)
                w = int(detection[2] * width)
                h = int(detection[3] * height)

                # Calculate top-left corner coordinates
                x = int(center_x - w / 2)
                y = int(center_y - h / 2)

                class_ids.append(class_id)
                confidences.append(float(confidence))
                boxes.append([x, y, w, h])

    # Perform Non-Maximum Suppression (NMS) to eliminate redundant boxes
    indices = cv2.dnn.NMSBoxes(boxes, confidences, score_threshold=0.5, nms_threshold=0.4)

    if len(indices) > 0:
        indices = indices.flatten()  # Flatten the indices array

        # Filter out the detected objects based on NMS results
        filtered_boxes = [boxes[i] for i in indices]
        filtered_confidences = [confidences[i] for i in indices]
        filtered_class_ids = [class_ids[i] for i in indices]

        return filtered_class_ids, filtered_confidences, filtered_boxes

    return [], [], []

def listen_audio():
    global audio_alert
    stream = p.open(format=format,
                    channels=channels,
                    rate=rate,
                    input=True,
                    frames_per_buffer=chunk)

    last_alert_time = 0

    try:
        while audio_stream:
            data = stream.read(chunk, exception_on_overflow=False)
            audio_data = np.frombuffer(data, dtype=np.int16)
            volume = np.linalg.norm(audio_data)
            current_time = time.time()

            if volume > threshold and (current_time - last_alert_time > cooldown_time):
                audio_alert = True
                last_alert_time = current_time
    finally:
        stream.stop_stream()
        stream.close()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/start_detection', methods=['POST'])
def start_detection():
    global audio_stream
    audio_stream = True
    threading.Thread(target=listen_audio).start()
    return jsonify(message="Detection started")

@app.route('/stop_detection', methods=['POST'])
def stop_detection():
    global audio_stream
    audio_stream = False
    return jsonify(message="Detection stopped")

@app.route('/process_image', methods=['POST'])
def process_image():
    global audio_alert
    if 'image' not in request.files:
        return jsonify(message="No image uploaded", alert=False)

    file = request.files['image']
    image = cv2.imdecode(np.frombuffer(file.read(), np.uint8), cv2.IMREAD_COLOR)

    if image is None:
        return jsonify(message="Error: Unable to load image", alert=False)

    # Detect objects in the frame and apply NMS
    class_ids, confidences, boxes = detect_objects(image)

    # Track the number of people and presence of cell phones or books
    person_count = class_ids.count(person_class_id)
    cell_phone_detected = cell_phone_class_id in class_ids
    book_detected = book_class_id in class_ids

    # Prepare the response message
    message = "Detection results: "
    alert = False

    # Check for no face detection
    if person_count == 0:
        message += "No face detected. "
        alert = True

    # Keep all other detections unchanged
    if person_count > 1:
        message += f"{person_count} people detected. "
        alert = True
    if cell_phone_detected:
        message += "Cell phone detected. "
        alert = True
    if book_detected:
        message += "Book detected. "
        alert = True

    # Check if there was an audio alert
    if audio_alert:
        message += "Audio detected! "
        alert = True
        audio_alert = False  # Reset the audio alert

    return jsonify(message=message, alert=alert)

if __name__ == '__main__':
    app.run(debug=True)
import sys
import json
import threading
import sounddevice as sd
import numpy as np
from faster_whisper import WhisperModel
import queue
import argparse

# Constants
SAMPLE_RATE = 16000
CHANNELS = 1

# Global state
recording = False
audio_queue = queue.Queue()
model = None
g_model_size = "base"
g_device = "cpu"
g_compute_type = "int8"

def load_model():
    global model
    # Load model on startup? or on first request?
    # Let's load on startup for responsiveness, might take a few seconds
    print(json.dumps({"status": "loading_model"}))
    sys.stdout.flush()
    # Use 'tiny' or 'base' for speed during dev, 'medium' or 'large-v3' for prod/quality
    try:
        model = WhisperModel(g_model_size, device=g_device, compute_type=g_compute_type)
    except ValueError as e:
        if "float16" in str(e) and g_device == "cpu":
            print(json.dumps({"status": "error", "message": "float16 not supported on CPU. Falling back to int8."}), file=sys.stderr)
            sys.stderr.flush()
            model = WhisperModel(g_model_size, device=g_device, compute_type="int8")
        else:
            raise e
            
    print(json.dumps({"status": "ready"}))
    sys.stdout.flush()

def record_audio():
    global recording
    print(json.dumps({"status": "recording"}))
    sys.stdout.flush()
    
    with sd.InputStream(samplerate=SAMPLE_RATE, channels=CHANNELS, callback=audio_callback):
        while recording:
            sd.sleep(100)
            
    print(json.dumps({"status": "recording_stopped"}))
    sys.stdout.flush()

def audio_callback(indata, frames, time, status):
    if status:
        print(status, file=sys.stderr)
    audio_queue.put(indata.copy())

def transcribe_audio():
    global model
    if not model:
        load_model() # Ensure model is loaded

    print(json.dumps({"status": "transcribing"}))
    sys.stdout.flush()

    # Collect all audio from queue
    audio_data = []
    while not audio_queue.empty():
        audio_data.append(audio_queue.get())
    
    if not audio_data:
        print(json.dumps({"error": "No audio recorded"}))
        sys.stdout.flush()
        return

    # Concatenate and convert to float32
    audio_np = np.concatenate(audio_data, axis=0).flatten().astype(np.float32)

    # Transcribe
    segments, info = model.transcribe(audio_np, beam_size=5)
    
    full_text = ""
    for segment in segments:
        full_text += segment.text

    print(json.dumps({"status": "done", "text": full_text.strip()}))
    sys.stdout.flush()

def main():
    global recording, g_model_size, g_device, g_compute_type
    
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="base", help="Model size")
    parser.add_argument("--device", default="cpu", help="Device (cpu, cuda)")
    args = parser.parse_args()
    
    g_model_size = args.model
    g_device = args.device
    
    print(f"Starting with model={g_model_size}, device={g_device}")
    sys.stdout.flush()
    
    # Preload model in a separate thread to not block initial handshake if any
    threading.Thread(target=load_model, daemon=True).start()

    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break
            
            cmd = line.strip()
            if cmd == "start_record":
                if not recording:
                    recording = True
                    # Clear queue
                    with audio_queue.mutex:
                        audio_queue.queue.clear()
                    # Start recording thread
                    threading.Thread(target=record_audio).start()
            
            elif cmd == "stop_record":
                if recording:
                    recording = False
                    # Wait for recording to finish? 
                    # The recording thread checks 'recording' flag. 
                    # We might need a small delay or sync, but for now let's assume it stops quickly.
                    # Transcribe
                    transcribe_audio()
            
            elif cmd == "exit":
                break
                
        except Exception as e:
            print(json.dumps({"error": str(e)}))
            sys.stdout.flush()

if __name__ == "__main__":
    main()

import sys
import json
import threading
import sounddevice as sd
import numpy as np
from faster_whisper import WhisperModel
import queue
import argparse
import time
import traceback

# Constants
SAMPLE_RATE = 16000
CHANNELS = 1
# Silero VAD v6 requires exactly 512 samples at 16kHz
FRAME_SIZE = 512
# Wait ~480ms of silence before transcribing (longer = better context, less cutting)
SILENCE_THRESHOLD_FRAMES = 15
# Minimum speech frames before transcribing (avoids transcribing noise bursts)
MIN_SPEECH_FRAMES = 8  # ~256ms minimum speech

# Global state
recording = False
realtime_active = False
normal_audio_queue = queue.Queue()
realtime_frame_queue = queue.Queue()
model = None
vad_model = None
g_model_size = "base"
g_device = "cpu"
g_compute_type = "int8"
g_language = None  # None = auto-detect


def emit(obj):
    print(json.dumps(obj))
    sys.stdout.flush()


def load_model():
    global model
    emit({"status": "loading_model"})
    try:
        model = WhisperModel(g_model_size, device=g_device, compute_type=g_compute_type)
    except ValueError as e:
        if "float16" in str(e) and g_device == "cpu":
            model = WhisperModel(g_model_size, device=g_device, compute_type="int8")
        else:
            raise e
    emit({"status": "ready"})


def load_vad_model():
    global vad_model
    try:
        import torch
        from silero_vad import load_silero_vad
        vad_model = load_silero_vad()
        # Warm up with a dummy tensor
        dummy = torch.zeros(FRAME_SIZE)
        vad_model(dummy, SAMPLE_RATE)
        return True
    except Exception as e:
        print(json.dumps({"error": f"VAD load failed: {str(e)}\n{traceback.format_exc()}"}), file=sys.stderr)
        sys.stderr.flush()
        return False


# ─── Normal (push-to-talk) mode ───────────────────────────────────────────────

def normal_audio_callback(indata, frames, time_info, status):
    if status:
        print(f"Audio status: {status}", file=sys.stderr)
    normal_audio_queue.put(indata.copy())


def record_audio():
    global recording
    emit({"status": "recording"})
    try:
        with sd.InputStream(samplerate=SAMPLE_RATE, channels=CHANNELS, callback=normal_audio_callback):
            while recording:
                sd.sleep(100)
    except Exception as e:
        print(json.dumps({"error": f"Recording error: {str(e)}"}), file=sys.stderr)
        sys.stderr.flush()


def transcribe_audio():
    global model
    if not model:
        load_model()

    emit({"status": "transcribing"})

    audio_data = []
    while not normal_audio_queue.empty():
        audio_data.append(normal_audio_queue.get())

    if not audio_data:
        emit({"error": "No audio recorded"})
        return

    audio_np = np.concatenate(audio_data, axis=0).flatten().astype(np.float32)
    segments, _ = model.transcribe(audio_np, beam_size=5, language=g_language or None)
    full_text = "".join(seg.text for seg in segments).strip()
    emit({"status": "done", "text": full_text})


# ─── Real-time (VAD) mode ──────────────────────────────────────────────────────

def realtime_loop():
    global realtime_active, model, vad_model

    try:
        if not model:
            load_model()

        if vad_model is None:
            if not load_vad_model():
                emit({"error": "VAD model unavailable"})
                realtime_active = False
                return

        import torch

        # Clear stale frames
        while not realtime_frame_queue.empty():
            try:
                realtime_frame_queue.get_nowait()
            except queue.Empty:
                break

        emit({"status": "realtime_active"})

        speech_buffer = []
        silence_counter = 0
        in_speech = False

        def vad_audio_callback(indata, frames, time_info, status):
            if status:
                print(f"VAD audio status: {status}", file=sys.stderr)
            realtime_frame_queue.put(indata.copy())

        with sd.InputStream(
            samplerate=SAMPLE_RATE,
            channels=CHANNELS,
            blocksize=FRAME_SIZE,
            callback=vad_audio_callback,
            dtype='float32'
        ):
            while realtime_active:
                try:
                    frame = realtime_frame_queue.get(timeout=0.5)
                except queue.Empty:
                    continue

                frame_1d = frame.flatten().astype(np.float32)

                # Silero VAD expects exactly FRAME_SIZE samples
                if len(frame_1d) != FRAME_SIZE:
                    continue

                try:
                    frame_tensor = torch.from_numpy(frame_1d)
                    speech_prob = vad_model(frame_tensor, SAMPLE_RATE).item()
                except Exception as vad_err:
                    print(f"VAD error: {vad_err}", file=sys.stderr)
                    sys.stderr.flush()
                    speech_prob = 0.0

                is_speech = speech_prob > 0.5

                if is_speech:
                    speech_buffer.append(frame_1d)
                    silence_counter = 0
                    in_speech = True
                elif in_speech:
                    silence_counter += 1
                    speech_buffer.append(frame_1d)

                    if silence_counter >= SILENCE_THRESHOLD_FRAMES:
                        segment_audio = np.concatenate(speech_buffer).astype(np.float32)
                        speech_buffer = []
                        silence_counter = 0
                        in_speech = False

                        # Skip very short segments (noise bursts)
                        speech_frames = len(segment_audio) / FRAME_SIZE
                        if speech_frames >= MIN_SPEECH_FRAMES:
                            threading.Thread(
                                target=_transcribe_segment,
                                args=(segment_audio,),
                                daemon=True
                            ).start()

        # Ensure we flush any remaining speech if stopped mid-sentence
        if in_speech and len(speech_buffer) > 0:
            segment_audio = np.concatenate(speech_buffer).astype(np.float32)
            speech_frames = len(segment_audio) / FRAME_SIZE
            if speech_frames >= MIN_SPEECH_FRAMES:
                threading.Thread(
                    target=_transcribe_segment,
                    args=(segment_audio,),
                    daemon=True
                ).start()

    except Exception as e:
        err = f"Realtime loop error: {str(e)}\n{traceback.format_exc()}"
        print(json.dumps({"error": err}), file=sys.stderr)
        sys.stderr.flush()
    finally:
        realtime_active = False
        emit({"status": "ready"})


def _transcribe_segment(audio_np: np.ndarray):
    global model
    if not model:
        return
    try:
        segments, _ = model.transcribe(
            audio_np,
            beam_size=5,
            language=g_language or None,   # None = auto-detect
            vad_filter=False,
            condition_on_previous_text=False,
            temperature=0.0,
        )
        text = "".join(seg.text for seg in segments).strip()
        if text:
            emit({"partial": text})
    except Exception as e:
        print(json.dumps({"error": f"Transcription error: {str(e)}"}), file=sys.stderr)
        sys.stderr.flush()


# ─── Main ──────────────────────────────────────────────────────────────────────

def main():
    global recording, realtime_active, g_model_size, g_device, g_compute_type

    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="base")
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--language", default="", help="Language code e.g. 'es', 'en'. Empty = auto-detect.")
    args = parser.parse_args()

    g_model_size = args.model
    g_device = args.device
    g_language = args.language if args.language else None

    print(f"Starting with model={g_model_size}, device={g_device}, language={g_language}")
    sys.stdout.flush()

    threading.Thread(target=load_model, daemon=True).start()

    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break

            cmd = line.strip()

            if cmd == "start_record":
                if not recording and not realtime_active:
                    recording = True
                    while not normal_audio_queue.empty():
                        try:
                            normal_audio_queue.get_nowait()
                        except queue.Empty:
                            break
                    threading.Thread(target=record_audio, daemon=True).start()

            elif cmd == "stop_record":
                if recording:
                    recording = False
                    time.sleep(0.15)
                    transcribe_audio()

            elif cmd == "start_realtime":
                if not realtime_active and not recording:
                    realtime_active = True
                    threading.Thread(target=realtime_loop, daemon=True).start()

            elif cmd == "stop_realtime":
                realtime_active = False

            elif cmd == "exit":
                break

        except Exception as e:
            emit({"error": str(e)})


if __name__ == "__main__":
    main()

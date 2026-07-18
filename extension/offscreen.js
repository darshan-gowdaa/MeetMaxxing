/**
 * MeetMaxxing Offscreen Script — Tab Audio Capture
 *
 * Chrome MV3 requires an offscreen document to run MediaRecorder on
 * a tab audio stream. This script:
 *  1. Receives the tab stream ID from background.js
 *  2. Opens the stream via getUserMedia (chromeMediaSource: 'tab')
 *  3. Records 5-second chunks with MediaRecorder
 *  4. Sends base64-encoded audio back to background.js
 *     which forwards it to the backend for Gemini transcription
 */

"use strict";

let recorder = null;
let audioStream = null;

chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg.target !== "offscreen") return;

  if (msg.type === "START_CAPTURE") {
    const { streamId, meetingId } = msg;
    await startCapture(streamId, meetingId);
  }

  if (msg.type === "STOP_CAPTURE") {
    stopCapture();
  }
});

async function startCapture(streamId, meetingId) {
  if (recorder && recorder.state !== "inactive") return;

  try {
    // Open tab audio stream using Chrome tab capture stream ID
    audioStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId,
        },
      },
      video: false,
    });

    // Choose best available codec
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    recorder = new MediaRecorder(audioStream, { mimeType });

    recorder.ondataavailable = async (event) => {
      if (!event.data || event.data.size < 100) return;

      // Convert Blob → base64
      const arrayBuffer = await event.data.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
      const base64 = btoa(binary);

      // Send to background.js
      chrome.runtime.sendMessage({
        type: "AUDIO_CHUNK",
        meetingId,
        base64,
        mimeType,
      }, () => { let _ = chrome.runtime.lastError; });
    };

    // Emit a chunk every 5 seconds
    recorder.start(5000);
    console.log("[MeetMaxxing Offscreen] Recording started — capturing all participants.");
  } catch (err) {
    console.error("[MeetMaxxing Offscreen] Failed to start capture:", err.message);
  }
}

function stopCapture() {
  if (recorder && recorder.state !== "inactive") {
    recorder.stop();
    recorder = null;
  }
  if (audioStream) {
    audioStream.getTracks().forEach((t) => t.stop());
    audioStream = null;
  }
  console.log("[MeetMaxxing Offscreen] Capture stopped.");
}

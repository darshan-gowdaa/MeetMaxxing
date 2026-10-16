# MeetMaxxing — Firefox Extension Setup & Guide

MeetMaxxing is an AI meeting copilot built for Google Meet. It tracks meeting discussions in real time, organizes key points, catches commitments and action items, and generates post-call summaries using Gemini.

## Official Firefox Add-on Store (Recommended)

You can install MeetMaxxing directly with one click from Mozilla's official store:
👉 https://addons.mozilla.org/en-US/firefox/addon/meetmaxxing/

Simply click "Add to Firefox" on the Mozilla store page and confirm the prompt. That's it!

---

## Manual Installation (From This Zip File)

If you prefer installing directly from this zip file or want to test in Firefox Developer Edition:

1. Unzip `meetmaxxing-firefox.zip` into a folder on your computer.
2. Open Firefox and type `about:debugging#/runtime/this-firefox` in the address bar, then press Enter.
3. Click the **Load Temporary Add-on...** button.
4. Browse to the unzipped folder and select the `manifest.json` file.
5. MeetMaxxing is now active in Firefox!

*Note: In regular Firefox, temporary add-ons are kept active until you restart Firefox. For a permanent install, use the official Mozilla Add-ons link above.*

## How to Use

1. Log in: Visit https://meetmaxxing.vercel.app to log into your account.
2. Join any Google Meet (https://meet.google.com).
3. The MeetMaxxing sidebar will show up automatically on the right side of the meeting screen.
4. Turn on Captions in Google Meet (press `c` on your keyboard or click the CC button at the bottom of Google Meet). MeetMaxxing reads live captions to understand the discussion.
5. Suggestions, topic notes, and risk alerts will update in real time in the sidebar.
6. When your call finishes, click End Meeting in the sidebar to review your AI summary, action items, and draft follow-up emails on the web dashboard.

## Frequently Asked Questions (FAQ)

### Is this extension safe to use?
Yes. MeetMaxxing has been reviewed and approved on the official Mozilla Firefox Add-on Marketplace. It doesn't record your microphone, webcam, or desktop audio. It only reads text from Google Meet's on-screen caption element.

### Why do I need to turn on Captions (CC)?
Google Meet processes your audio into text captions locally in your browser. MeetMaxxing uses these captions as input for its multi-agent AI pipeline. If captions are turned off, the extension has no text to analyze.

### Will other meeting participants see MeetMaxxing?
No. The sidebar is rendered entirely inside your own browser window. Nobody else in the call can see it or receive notifications about it.

### The first summary takes around 30 to 45 seconds to generate. Is that normal?
Yes, on the first request after a period of inactivity, the backend API wakes up from sleep (hosted on a cloud free-tier server). Once awake, all queries, summaries, and chat features respond quickly.

### Can I connect my own AI keys?
Yes! You can bring your own Google Gemini, Groq, OpenRouter, or Perplexity keys. Navigate to https://meetmaxxing.vercel.app/settings/api-keys to set them up.

## Troubleshooting

### The sidebar is not showing up in Google Meet
* Check your address bar to make sure you are in an active meeting (`meet.google.com/xxx-yyyy-zzz`) and not the lobby screen.
* Refresh the Google Meet tab (`Ctrl + F5` on Windows/Linux or `Cmd + Shift + R` on Mac).
* In Firefox, click the extensions puzzle icon in your toolbar, make sure MeetMaxxing is enabled, and grant permissions if prompted.

### "Authentication required" or "Login expired"
* Open a new tab and go to https://meetmaxxing.vercel.app.
* Log out and log back in to refresh your session.
* Go back to Google Meet and refresh the tab.

### Captions are on but the sidebar isn't updating
* Ensure people are currently speaking and that captions are appearing at the bottom of Google Meet.
* Check that Google Meet captions language is set to English.
* Make sure third-party cookies or strict tracking protection in Firefox isn't blocking communication with https://meetmaxxing-api.onrender.com.

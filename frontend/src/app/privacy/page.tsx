import React from 'react';

export const metadata = {
  title: 'Privacy Policy | MeetMaxxing',
  description: 'Privacy policy and data handling for MeetMaxxing.',
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#131314] text-gray-900 dark:text-gray-200">
      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-extrabold mb-8 text-black dark:text-white">Privacy Policy</h1>
        
        <div className="space-y-6 text-lg leading-relaxed">
          <p>
            Last updated: <strong>October 2026</strong>
          </p>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">1. Information We Collect</h2>
            <p>
              When you use MeetMaxxing during a Google Meet session, the extension temporarily captures meeting audio, live captions, and structural metadata to generate AI insights.
              All active processing occurs dynamically to provide real-time copilot functionality.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">2. Data Storage & Usage</h2>
            <p>
              Transcripts and audio data are transmitted securely to our backend services (or directly to the LLM if using BYOK mode) strictly for generating meeting summaries, context, and intelligent suggestions.
              Meeting metadata is stored securely to allow you to review past meeting insights. You can delete your meeting history at any time.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">3. Third-Party AI Models</h2>
            <p>
              MeetMaxxing relies on LLM providers (e.g., Google Gemini) to process transcripts. When you provide your own API key, data is sent directly to the provider under your own account boundaries. 
              We do not use your meeting data to train our own AI models.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">4. Extension Permissions</h2>
            <p>
              The MeetMaxxing browser extension requires specific permissions (such as <code>tabCapture</code> and <code>storage</code>) exclusively to function within the context of <code>meet.google.com</code>. We do not track or record your browsing activity on any other websites.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">5. Contact Us</h2>
            <p>
              If you have any questions or concerns about this Privacy Policy or our data practices, please contact the repository maintainers via GitHub.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

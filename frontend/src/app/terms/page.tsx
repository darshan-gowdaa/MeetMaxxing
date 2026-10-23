import React from "react";

export const metadata = {
  title: "Terms of Service | MeetMaxxing",
  description: "Terms of service and usage guidelines for MeetMaxxing.",
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#131314] text-gray-900 dark:text-gray-200">
      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-extrabold mb-8 text-black dark:text-white">Terms of Service</h1>

        <div className="space-y-6 text-lg leading-relaxed">
          <p>
            Last updated: <strong>October 2026</strong>
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">1. Acceptance of Terms</h2>
            <p>
              By accessing and using MeetMaxxing, our web application, and associated browser extensions, you agree to comply with and be bound by these Terms of Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">2. Description of Service</h2>
            <p>
              MeetMaxxing is an intelligent meeting copilot providing live transcription processing, action item extraction, scheduling, and cross-meeting memory intelligence.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">3. User Responsibilities & Consent</h2>
            <p>
              You agree to use MeetMaxxing in compliance with all applicable local, state, and international wiretapping and recording consent laws. You are responsible for ensuring that all participants in any recorded or summarized meeting have provided appropriate consent.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">4. Intellectual Property & AI Usage</h2>
            <p>
              You retain all ownership rights to your meeting audio, notes, and transcripts. MeetMaxxing processes this data solely to provide real-time insights and does not use private meeting transcripts to train public AI models.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">5. Disclaimer & Limitation of Liability</h2>
            <p>
              MeetMaxxing is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. AI-generated summaries and calendar follow-ups are automated recommendations and should be reviewed by the user for accuracy.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-black dark:text-white mt-8">6. Contact</h2>
            <p>
              For questions regarding these Terms of Service, contact support at <code>darshangowdaa223@gmail.com</code>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

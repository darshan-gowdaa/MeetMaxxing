import { MeetingSkeleton } from "@/components/templates/skeletons";

/**
 * Meeting detail route skeleton — reuses the template-level detail layout
 * skeleton shown while the client page hydrates/fetches.
 */
export default function MeetingLoading() {
  return <MeetingSkeleton />;
}

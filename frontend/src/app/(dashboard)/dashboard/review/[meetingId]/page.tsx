import { MeetingReview } from "@/components/workspace/MeetingReview";
import { requireMeetingDetail } from "@/lib/workspace-page";

export default async function MeetingReviewPage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const { meetingId } = await params;
  const { detail } = await requireMeetingDetail(meetingId);

  return (
    <MeetingReview
      meeting={detail.meeting}
      findings={detail.findings}
      exports={detail.exports}
      artifacts={detail.artifacts}
      aiStatus={detail.aiStatus}
      notion={detail.notion}
      transcriptAvailability={detail.transcriptAvailability}
      providerStatus={detail.providerStatus}
    />
  );
}

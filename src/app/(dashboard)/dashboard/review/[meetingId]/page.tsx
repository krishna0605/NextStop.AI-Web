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
      notion={detail.notion}
    />
  );
}

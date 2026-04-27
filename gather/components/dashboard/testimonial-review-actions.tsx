import type { ReactNode } from "react"

import { updateTestimonialReviewStatusAction } from "@/app/app/actions"
import { Button } from "@/components/ui/button"
import type { TestimonialReviewStatus } from "@/lib/domain/types"

interface TestimonialReviewActionsProps {
  projectId: string
  reviewId: string
  currentStatus: TestimonialReviewStatus
}

export function TestimonialReviewActions({
  projectId,
  reviewId,
  currentStatus,
}: TestimonialReviewActionsProps) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {currentStatus !== "approved" ? (
        <StatusForm projectId={projectId} reviewId={reviewId} status="approved">
          <Button size="sm" variant="sage">
            Approve
          </Button>
        </StatusForm>
      ) : null}
      {currentStatus !== "rejected" ? (
        <StatusForm projectId={projectId} reviewId={reviewId} status="rejected">
          <Button size="sm" variant="ghost">
            Reject
          </Button>
        </StatusForm>
      ) : null}
    </div>
  )
}

function StatusForm({
  projectId,
  reviewId,
  status,
  children,
}: {
  projectId: string
  reviewId: string
  status: TestimonialReviewStatus
  children: ReactNode
}) {
  return (
    <form action={updateTestimonialReviewStatusAction}>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="reviewId" value={reviewId} />
      <input type="hidden" name="status" value={status} />
      {children}
    </form>
  )
}

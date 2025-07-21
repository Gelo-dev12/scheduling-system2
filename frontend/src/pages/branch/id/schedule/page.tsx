import { useParams } from "react-router-dom"
import { ScheduleView } from "@/components/schedule-view"

export default function BranchSchedulePage() {
  const { id } = useParams();
  if (!id) {
    return <div>Branch ID not found</div>;
  }
  return <ScheduleView branchId={id} />
}

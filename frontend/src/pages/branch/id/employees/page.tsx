import { useParams } from "react-router-dom"
import { EmployeeManagement } from "@/components/employee-management"

export default function BranchEmployeesPage() {
  const { id } = useParams();
  if (!id) {
    return <div>Branch ID not found</div>;
  }
  return <EmployeeManagement branchId={id} />
}

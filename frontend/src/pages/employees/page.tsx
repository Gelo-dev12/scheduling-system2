import { EmployeeManagement } from "@/components/employee-management"
import { useParams } from "react-router-dom"

export default function EmployeesPage() {
  const { branchId } = useParams();
  return <EmployeeManagement branchId={branchId || ""} />;
}

import { useParams } from "react-router-dom"
import { RoleManagement } from "@/components/role-management"

export default function RolesPage() {
  const { id } = useParams()

  if (!id) {
    return <div>Branch ID not found</div>
  }

  return <RoleManagement branchId={id} branchName="Crab N Bites - Kapitan pepe 1" />
}

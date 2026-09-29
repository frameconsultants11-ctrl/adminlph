"use client"

import ResourceManager from "@/components/ui/ResourceManager"


export default function ToolsPage() {
  return (
    <ResourceManager
      title="Tools"
      description="Manage your tools and their images."
      apiEndpoint="/api/admin/tools"
      resourceName="Tool"
    />
  )
}
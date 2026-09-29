"use client"

import ResourceManager from "@/components/ui/ResourceManager"


export default function ToolsPage() {
  return (
    <ResourceManager
      title="Skills"
      description="Manage your skills and their images."
      apiEndpoint="/api/admin/skills"
      resourceName="Skills"
    />
  )
}
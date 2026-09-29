"use client"

import ResourceManager from "@/components/ui/ResourceManager"


export default function ToolsPage() {
  return (
    <ResourceManager
      title="Certifications"
      description="Manage your certifications and their images."
      apiEndpoint="/api/admin/certifications"
      resourceName="Certifications"
    />
  )
}
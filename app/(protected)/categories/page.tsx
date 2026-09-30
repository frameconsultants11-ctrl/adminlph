import ResourceManager from "@/components/ui/ResourceManager";


export default function CategoriesPage() {
  return (
    <ResourceManager
      title="Categories"
      description="Manage categories, images, and active status."
      apiEndpoint="/api/admin/categories"
      resourceName="Category"
    />
  )
}
import CourseForm from "@/components/CourseForm";


export default async function TrainerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <CourseForm mode="create" />
}
import CourseForm from "@/components/CourseForm";


export default async function CreateCoursePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {

  const { id } = await params
  return <CourseForm mode="edit" courseId={id}  />
}
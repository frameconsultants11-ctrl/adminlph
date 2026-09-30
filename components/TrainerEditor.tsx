"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  BriefcaseBusiness,
  Check,
  GraduationCap,
  ImageIcon,
  Loader2,
  Save,
  Trash2,
  UserRound
} from "lucide-react"

import { apiFetch } from "@/lib/api-fetch"
import BackButton from "@/components/ui/BackButton"
import { AddButton, Alert, CurrentCheckbox, EmptySection, Input, RemoveButton, ResourceMultiSelect, Section, Select, ToggleCard } from "./utils/Alert"

type Resource = {
  _id: string
  name: string
  image?: string
  isActive?: boolean
}

type Education = {
  level: "high_school" | "college" | "masters" | "doctorate"
  institution: string
  year: string
  isCurrent: boolean
}

type Experience = {
  designation: string
  company: string
  from: string
  to: string
  isCurrent: boolean
}

type TrainerForm = {
  name: string
  email: string
  phone: string
  password: string
  about: string
  hourlyRate: string
  isActive: boolean
  isAvailable: boolean
  certifications: string[]
  toolsTeach: string[]
  skills: string[]
  courses: string[]
  education: Education[]
  experience: Experience[]
}

type TrainerEditorProps = {
  id?: string
}

const EDUCATION_LEVELS = [
  { value: "high_school", label: "High School" },
  { value: "college", label: "College" },
  { value: "masters", label: "Masters" },
  { value: "doctorate", label: "Doctorate" },
] as const

const INITIAL_FORM: TrainerForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  about: "",
  hourlyRate: "",
  isActive: true,
  isAvailable: true,
  certifications: [],
  toolsTeach: [],
  skills: [],
  courses: [],
  education: [],
  experience: [],
}

export default function TrainerEditor({ id }: TrainerEditorProps) {
  const router = useRouter()
  const isExisting = Boolean(id)

  // No id => new trainer and immediately editable.
  // id => existing trainer opens in VIEW mode first.
  const [isEditing, setIsEditing] = useState(!isExisting)

  const [form, setForm] = useState<TrainerForm>(INITIAL_FORM)
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState("")
  const [tools, setTools] = useState<Resource[]>([])
  const [skills, setSkills] = useState<Resource[]>([])
  const [certifications, setCertifications] = useState<Resource[]>([])
  const [courses, setCourses] = useState<Resource[]>([])
  const [courseApiAvailable, setCourseApiAvailable] = useState(false)

  const [loading, setLoading] = useState(isExisting)
  const [loadingResources, setLoadingResources] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const aboutWordCount = useMemo(() => {
    if (!form.about.trim()) return 0
    return form.about.trim().split(/\s+/).filter(Boolean).length
  }, [form.about])

  useEffect(() => {
    loadResources()
    if (id) loadTrainer(id)
  }, [id])

  async function loadResources() {
    try {
      setLoadingResources(true)

      const [toolsRes, skillsRes, certificationsRes] = await Promise.all([
        apiFetch("/api/admin/tools?limit=100"),
        apiFetch("/api/admin/skills?limit=100"),
        apiFetch("/api/admin/certifications?limit=100"),
      ])

      if (!toolsRes.ok) throw new Error("Failed to load tools")
      if (!skillsRes.ok) throw new Error("Failed to load skills")
      if (!certificationsRes.ok) {
        throw new Error("Failed to load certifications")
      }

      const [toolsData, skillsData, certificationsData] = await Promise.all([
        toolsRes.json(),
        skillsRes.json(),
        certificationsRes.json(),
      ])

      setTools(Array.isArray(toolsData.data) ? toolsData.data : [])
      setSkills(Array.isArray(skillsData.data) ? skillsData.data : [])
      setCertifications(
        Array.isArray(certificationsData.data)
          ? certificationsData.data
          : [],
      )

      try {
        const coursesRes = await apiFetch("/api/admin/courses?limit=100")
        if (coursesRes.ok) {
          const coursesData = await coursesRes.json()
          setCourses(Array.isArray(coursesData.data) ? coursesData.data : [])
          setCourseApiAvailable(true)
        }
      } catch {
        setCourses([])
        setCourseApiAvailable(false)
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load trainer resources",
      )
    } finally {
      setLoadingResources(false)
    }
  }

  async function loadTrainer(trainerId: string) {
    try {
      setLoading(true)
      setError("")

      const response = await apiFetch(`/api/admin/trainers/${trainerId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.message || data?.error || "Unable to load trainer")
      }

      const item = data.data

      setForm({
        name: item.name || "",
        email: item.email || "",
        phone: item.phone || "",
        password: "",
        about: item.about || "",
        hourlyRate: String(item.hourlyRate ?? ""),
        isActive: item.isActive ?? true,
        isAvailable: item.isAvailable ?? true,
        certifications: normalizeIds(item.certifications),
        toolsTeach: normalizeIds(item.toolsTeach),
        skills: normalizeIds(item.skills),
        courses: normalizeIds(item.courses),
        education: normalizeEducation(item.education),
        experience: normalizeExperience(item.experience),
      })

      setImagePreview(item.image || "")
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load trainer",
      )
    } finally {
      setLoading(false)
    }
  }

  function normalizeIds(value: unknown): string[] {
    if (!Array.isArray(value)) return []

    return value
      .map((item) => {
        if (typeof item === "string") return item
        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>
          return String(obj._id ?? obj.id ?? obj.name ?? "")
        }
        return ""
      })
      .filter(Boolean)
  }

  function normalizeEducation(value: unknown): Education[] {
    if (!Array.isArray(value)) return []

    return value.map((item: any) => ({
      level: item?.level || "college",
      institution: item?.institution || item?.school || "",
      year: String(item?.year ?? ""),
      isCurrent: Boolean(item?.isCurrent),
    }))
  }

  function normalizeExperience(value: unknown): Experience[] {
    if (!Array.isArray(value)) return []

    return value.map((item: any) => ({
      designation: item?.designation || "",
      company: item?.company || "",
      from: String(item?.from ?? ""),
      to: String(item?.to ?? ""),
      isCurrent: Boolean(item?.isCurrent),
    }))
  }

  function updateField<K extends keyof TrainerForm>(
    field: K,
    value: TrainerForm[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function handleImageChange(file?: File) {
    if (!file || !isEditing) return

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"]

    if (!allowedTypes.includes(file.type)) {
      setError("Only JPG, PNG and WEBP images are allowed")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB")
      return
    }

    setError("")
    setImage(file)

    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview)
    }

    setImagePreview(URL.createObjectURL(file))
  }

  function addEducation() {
    if (!isEditing) return

    setForm((current) => ({
      ...current,
      education: [
        ...current.education,
        {
          level: "college",
          institution: "",
          year: "",
          isCurrent: false,
        },
      ],
    }))
  }

  function updateEducation(
    index: number,
    field: keyof Education,
    value: string | boolean,
  ) {
    if (!isEditing) return

    setForm((current) => {
      const education = [...current.education]
      education[index] = { ...education[index], [field]: value }
      return { ...current, education }
    })
  }

  function removeEducation(index: number) {
    if (!isEditing) return
    setForm((current) => ({
      ...current,
      education: current.education.filter((_, i) => i !== index),
    }))
  }

  function addExperience() {
    if (!isEditing) return

    setForm((current) => ({
      ...current,
      experience: [
        ...current.experience,
        {
          designation: "",
          company: "",
          from: "",
          to: "",
          isCurrent: false,
        },
      ],
    }))
  }

  function updateExperience(
    index: number,
    field: keyof Experience,
    value: string | boolean,
  ) {
    if (!isEditing) return

    setForm((current) => {
      const experience = [...current.experience]
      experience[index] = { ...experience[index], [field]: value }

      if (field === "isCurrent" && value === true) {
        experience[index].to = ""
      }

      return { ...current, experience }
    })
  }

  function removeExperience(index: number) {
    if (!isEditing) return
    setForm((current) => ({
      ...current,
      experience: current.experience.filter((_, i) => i !== index),
    }))
  }

  function validate() {
    if (!form.name.trim()) return "Trainer name is required"
    if (!form.email.trim()) return "Email is required"
    if (!form.phone.trim()) return "Phone number is required"

    // Password is required only while creating.
    if (!isExisting && !form.password) {
      return "Password is required"
    }

    if (form.password && form.password.length < 8) {
      return "Password must be at least 8 characters"
    }

    // Image is required only while creating.
    if (!isExisting && !image) {
      return "Trainer image is required"
    }

    if (aboutWordCount > 100) {
      return "About trainer must not exceed 100 words"
    }

    for (let i = 0; i < form.education.length; i++) {
      const item = form.education[i]
      if (!item.institution.trim()) {
        return `Education #${i + 1}: school/university is required`
      }
      if (!item.year.trim()) {
        return `Education #${i + 1}: year is required`
      }
    }

    for (let i = 0; i < form.experience.length; i++) {
      const item = form.experience[i]

      if (!item.designation.trim()) {
        return `Experience #${i + 1}: designation is required`
      }

      if (!item.company.trim()) {
        return `Experience #${i + 1}: company is required`
      }

      if (!item.from.trim()) {
        return `Experience #${i + 1}: start year is required`
      }

      if (!item.isCurrent && !item.to.trim()) {
        return `Experience #${i + 1}: end year is required`
      }
    }

    return ""
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!isEditing) return

    setError("")
    setSuccess("")

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setSubmitting(true)

      const formData = new FormData()

      formData.append("name", form.name.trim())
      formData.append("email", form.email.trim())
      formData.append("phone", form.phone.trim())
      formData.append("about", form.about.trim())
      formData.append("hourlyRate", form.hourlyRate || "0")
      formData.append("isActive", String(form.isActive))
      formData.append("isAvailable", String(form.isAvailable))

      // Do not overwrite an existing password when editing.
      if (form.password.trim()) {
        formData.append("password", form.password)
      }

      if (image) {
        formData.append("image", image)
      }

      formData.append("certifications", JSON.stringify(form.certifications))
      formData.append("toolsTeach", JSON.stringify(form.toolsTeach))
      formData.append("skills", JSON.stringify(form.skills))
      formData.append(
        "courses",
        JSON.stringify(courseApiAvailable ? form.courses : []),
      )
      formData.append("education", JSON.stringify(form.education))
      formData.append("experience", JSON.stringify(form.experience))

      const url = isExisting
        ? `/api/admin/trainers/${id}`
        : "/api/admin/trainers"

      const response = await apiFetch(url, {
        method: isExisting ? "PATCH" : "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error || data?.message || "Failed to save trainer",
        )
      }

      if (isExisting) {
        setForm((current) => ({
          ...current,
          password: "",
        }))
        setImage(null)
        setImagePreview(data?.data?.image || imagePreview)
        setSuccess("Trainer updated successfully.")
        setIsEditing(false)
      } else {
        setSuccess("Trainer created successfully.")
        setTimeout(() => router.push("/trainers"), 800)
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save trainer",
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteTrainer() {
    if (!id || !isExisting) return

    if (!window.confirm(`Delete ${form.name}? This action cannot be undone.`)) {
      return
    }

    try {
      setDeleting(true)

      const response = await apiFetch(`/api/admin/trainers/${id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error || data?.message || "Unable to delete trainer",
        )
      }

      router.push("/trainers")
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete trainer",
      )
    } finally {
      setDeleting(false)
    }
  }

  if (loading || loadingResources) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] px-4 py-10 text-[#222] dark:bg-[#111] dark:text-white">
        <div className="mx-auto max-w-7xl rounded-2xl border border-[#e8e8e8] bg-white p-12 text-center dark:border-[#2a2a2a] dark:bg-[#171717]">
          <Loader2
            size={20}
            className="mx-auto mb-4 animate-spin text-[#4fbd3d] dark:text-[#67e44e]"
          />
          <p className="text-[13px] text-[#777] dark:text-[#888]">
            Loading trainer...
          </p>
        </div>
      </div>
    )
  }

  const title = !isExisting
    ? "Create New Trainer"
    : isEditing
      ? "Edit Trainer"
      : "Trainer Details"

  const description = !isExisting
    ? "Add trainer details, education, experience, skills and professional expertise."
    : isEditing
      ? "Update trainer profile, access, expertise and availability."
      : "View trainer profile, education, experience and professional expertise."

  return (
    <div className="min-h-screen bg-[#f8f8f8] px-4 py-6 text-[#222] dark:bg-[#111] dark:text-white sm:px-6 lg:px-8">
      <div>
        <BackButton />

        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#181818] dark:text-white sm:text-3xl">
              {title}
            </h1>
            <p className="mt-1.5 max-w-xl text-[12px] leading-5 text-[#777] dark:text-[#888]">
              {description}
            </p>
          </div>

          {isExisting && (
            <div className="flex gap-2">
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setError("")
                    setSuccess("")
                    setIsEditing(true)
                  }}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#67e44e] px-4 text-[12px] font-semibold text-[#111] hover:bg-[#57d63f]"
                >
                  <Save size={15} />
                  Edit Trainer
                </button>
              )}

              <button
                type="button"
                onClick={deleteTrainer}
                disabled={deleting}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-[12px] font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400"
              >
                {deleting ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Trash2 size={15} />
                )}
                Delete
              </button>
            </div>
          )}
        </div>

        {error && (
          <Alert message={error} onClose={() => setError("")} />
        )}

        {success && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-[#67e44e]/30 bg-[#67e44e]/10 px-4 py-3 text-[12px] text-[#3b9d2e] dark:text-[#67e44e]">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#67e44e] text-[#111]">
              <Check size={14} />
            </div>
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className={`space-y-5 pb-28 ${
            isExisting && !isEditing
              ? "pointer-events-none select-none"
              : ""
          }`}
        >
          <Section
            icon={<UserRound size={17} />}
            title="Basic Information"
            description="Trainer account and profile information."
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Input
                label="Trainer Name"
                value={form.name}
                onChange={(v) => updateField("name", v)}
                placeholder="John Doe"
                disabled={!isEditing}
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(v) => updateField("email", v)}
                placeholder="john@example.com"
                disabled={!isEditing}
              />
              <Input
                label="Phone"
                value={form.phone}
                onChange={(v) => updateField("phone", v)}
                placeholder="+91 9876543210"
                disabled={!isEditing}
              />
              <Input
                label={isExisting ? "New Password" : "Password"}
                type="password"
                value={form.password}
                onChange={(v) => updateField("password", v)}
                placeholder={
                  isExisting
                    ? "Leave blank to keep current password"
                    : "Minimum 8 characters"
                }
                disabled={!isEditing}
              />
              <Input
                label="Hourly Rate"
                type="number"
                min="0"
                value={form.hourlyRate}
                onChange={(v) => updateField("hourlyRate", v)}
                placeholder="1000"
                disabled={!isEditing}
              />
            </div>
          </Section>

          <Section
            icon={<ImageIcon size={17} />}
            title="Trainer Image"
            description="Upload a professional trainer profile image."
          >
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="relative flex h-36 w-36 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#d5d5d5] bg-[#fafafa] dark:border-[#333] dark:bg-[#202020]">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt={form.name || "Trainer"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-[#999]">
                    <ImageIcon size={24} />
                    <span className="text-[10px]">No image</span>
                  </div>
                )}
              </div>

              {isEditing && (
                <div>
                  <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-[#67e44e] px-4 text-[12px] font-semibold text-[#111] hover:bg-[#57d63f]">
                    <ImageIcon size={15} />
                    {isExisting ? "Change Image" : "Choose Image"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) =>
                        handleImageChange(e.target.files?.[0])
                      }
                    />
                  </label>
                  <p className="mt-2.5 text-[11px] text-[#888]">
                    JPG, PNG or WEBP • Maximum 5MB
                  </p>
                </div>
              )}
            </div>
          </Section>

          <Section
            icon={<UserRound size={17} />}
            title="About Trainer"
            description="Write a short introduction about the trainer."
          >
            <textarea
              value={form.about}
              onChange={(e) => updateField("about", e.target.value)}
              disabled={!isEditing}
              rows={6}
              maxLength={1000}
              placeholder="Write about the trainer, their expertise, teaching style and professional background..."
              className="w-full resize-none rounded-xl border border-[#dedede] bg-white px-4 py-3 text-[13px] leading-6 text-[#222] outline-none placeholder:text-[#aaa] focus:border-[#67e44e] focus:ring-2 focus:ring-[#67e44e]/10 disabled:cursor-default disabled:bg-[#fafafa] dark:border-[#333] dark:bg-[#202020] dark:text-white dark:placeholder:text-[#666] dark:disabled:bg-[#1c1c1c]"
            />
            <div className="mt-2 flex justify-between text-[10px] text-[#888]">
              <span>Maximum 100 words</span>
              <span className={aboutWordCount > 100 ? "text-red-500" : ""}>
                {aboutWordCount}/100
              </span>
            </div>
          </Section>

          <Section
            icon={<GraduationCap size={17} />}
            title="Education"
            description="Add multiple education records."
            action={
              isEditing ? (
                <AddButton onClick={addEducation} label="Add Education" />
              ) : undefined
            }
          >
            {form.education.length === 0 ? (
              <EmptySection
                icon={<GraduationCap size={20} />}
                text="No education added yet."
                action={isEditing ? "Add Education" : undefined}
                onClick={isEditing ? addEducation : undefined}
              />
            ) : (
              <div className="space-y-4">
                {form.education.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-4 dark:border-[#2a2a2a] dark:bg-[#1c1c1c]"
                  >
                    <div className="mb-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#67e44e]/10 text-[#4fbd3d]">
                          <GraduationCap size={16} />
                        </div>
                        <div>
                          <h3 className="text-[13px] font-semibold">
                            Education #{index + 1}
                          </h3>
                          <p className="text-[10px] text-[#888]">
                            Academic background
                          </p>
                        </div>
                      </div>

                      {isEditing && (
                        <RemoveButton
                          onClick={() => removeEducation(index)}
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <Select
                        label="Education Level"
                        value={item.level}
                        onChange={(v) =>
                          updateEducation(index, "level", v)
                        }
                        options={[...EDUCATION_LEVELS]}
                        disabled={!isEditing}
                      />
                      <Input
                        label="School / University"
                        value={item.institution}
                        onChange={(v) =>
                          updateEducation(index, "institution", v)
                        }
                        disabled={!isEditing}
                      />
                      <Input
                        label="Year"
                        value={item.year}
                        onChange={(v) =>
                          updateEducation(index, "year", v)
                        }
                        disabled={!isEditing}
                      />
                    </div>

                    <CurrentCheckbox
                      checked={item.isCurrent}
                      onChange={(v) =>
                        updateEducation(index, "isCurrent", v)
                      }
                      label="Currently studying"
                      disabled={!isEditing}
                    />
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section
            icon={<BriefcaseBusiness size={17} />}
            title="Experience"
            description="Add multiple professional experience records."
            action={
              isEditing ? (
                <AddButton onClick={addExperience} label="Add Experience" />
              ) : undefined
            }
          >
            {form.experience.length === 0 ? (
              <EmptySection
                icon={<BriefcaseBusiness size={20} />}
                text="No experience added yet."
                action={isEditing ? "Add Experience" : undefined}
                onClick={isEditing ? addExperience : undefined}
              />
            ) : (
              <div className="space-y-4">
                {form.experience.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-4 dark:border-[#2a2a2a] dark:bg-[#1c1c1c]"
                  >
                    <div className="mb-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#67e44e]/10 text-[#4fbd3d]">
                          <BriefcaseBusiness size={16} />
                        </div>
                        <div>
                          <h3 className="text-[13px] font-semibold">
                            Experience #{index + 1}
                          </h3>
                          <p className="text-[10px] text-[#888]">
                            Professional background
                          </p>
                        </div>
                      </div>

                      {isEditing && (
                        <RemoveButton
                          onClick={() => removeExperience(index)}
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Input
                        label="Designation"
                        value={item.designation}
                        onChange={(v) =>
                          updateExperience(index, "designation", v)
                        }
                        disabled={!isEditing}
                      />
                      <Input
                        label="Company"
                        value={item.company}
                        onChange={(v) =>
                          updateExperience(index, "company", v)
                        }
                        disabled={!isEditing}
                      />
                      <Input
                        label="From"
                        value={item.from}
                        onChange={(v) =>
                          updateExperience(index, "from", v)
                        }
                        disabled={!isEditing}
                      />
                      {!item.isCurrent && (
                        <Input
                          label="To"
                          value={item.to}
                          onChange={(v) =>
                            updateExperience(index, "to", v)
                          }
                          disabled={!isEditing}
                        />
                      )}
                    </div>

                    <CurrentCheckbox
                      checked={item.isCurrent}
                      onChange={(v) =>
                        updateExperience(index, "isCurrent", v)
                      }
                      label="Currently working here"
                      disabled={!isEditing}
                    />
                  </div>
                ))}
              </div>
            )}
          </Section>

          <ResourceMultiSelect
            label="Certifications"
            title="Certifications"
            resources={certifications}
            selectedIds={form.certifications}
            onChange={(ids) => updateField("certifications", ids)}
            placeholder="Search certifications..."
            disabled={!isEditing}
          />

          <ResourceMultiSelect
            label="Skills"
            title="Skills"
            resources={skills}
            selectedIds={form.skills}
            onChange={(ids) => updateField("skills", ids)}
            placeholder="Search skills..."
            disabled={!isEditing}
          />

          <ResourceMultiSelect
            label="Tools"
            title="Tools"
            resources={tools}
            selectedIds={form.toolsTeach}
            onChange={(ids) => updateField("toolsTeach", ids)}
            placeholder="Search tools..."
            disabled={!isEditing}
          />

          {courseApiAvailable && (
            <ResourceMultiSelect
              label="Courses"
              title="Courses"
              resources={courses}
              selectedIds={form.courses}
              onChange={(ids) => updateField("courses", ids)}
              placeholder="Search courses..."
              disabled={!isEditing}
            />
          )}

          <Section
            icon={<Check size={17} />}
            title="Status"
            description="Control trainer availability and account status."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ToggleCard
                title="Active"
                description="Trainer can access the system."
                checked={form.isActive}
                onChange={(v) => updateField("isActive", v)}
                disabled={!isEditing}
              />
              <ToggleCard
                title="Available"
                description="Trainer is currently available for assignments."
                checked={form.isAvailable}
                onChange={(v) => updateField("isAvailable", v)}
                disabled={!isEditing}
              />
            </div>
          </Section>

          {isEditing && (
            <div className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-7xl -translate-x-1/2 flex-col-reverse gap-2 rounded-2xl border border-[#e5e5e5] bg-white/95 p-2 shadow-xl backdrop-blur-xl dark:border-[#2a2a2a] dark:bg-[#171717]/95 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  if (isExisting && id) {
                    setIsEditing(false)
                    setImage(null)
                    loadTrainer(id)
                  } else {
                    router.push("/trainers")
                  }
                }}
                disabled={submitting}
                className="h-10 rounded-xl border border-[#ddd] bg-white px-5 text-[12px] font-semibold text-[#555] dark:border-[#333] dark:bg-[#202020] dark:text-[#aaa]"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#67e44e] px-6 text-[12px] font-semibold text-[#111] hover:bg-[#57d63f] disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {isExisting ? "Saving..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    {isExisting ? "Save Changes" : "Create Trainer"}
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}



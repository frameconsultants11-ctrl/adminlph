"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Check,
  Clock,
  KeyRound,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
  UserCheck,
  UserRound,
  UserX,
  Wrench,
  X,
} from "lucide-react"

import { apiFetch } from "@/lib/api-fetch"
import BackButton from "@/components/ui/BackButton"

type Resource = {
  _id: string
  name: string
  image?: string
  isActive: boolean
}

type Trainer = {
  _id: string
  name: string
  email: string
  phone: string
  image: string
  isActive: boolean
  isAvailable: boolean
  hourlyRate: number
  certifications: any[]
  education: any[]
  experience: any[]
  toolsTeach: string[]
  skills: string[]
  courses: string[]
}

export default function TrainerDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [trainer, setTrainer] = useState<Trainer | null>(null)
  const [tools, setTools] = useState<Resource[]>([])
  const [skills, setSkills] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState("")

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [hourlyRate, setHourlyRate] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [isAvailable, setIsAvailable] = useState(true)
  const [password, setPassword] = useState("")

  const [certifications, setCertifications] = useState<string[]>([])
  const [education, setEducation] = useState<string[]>([])
  const [experience, setExperience] = useState<string[]>([])
  const [toolsTeach, setToolsTeach] = useState<string[]>([])
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])

  const [newCertification, setNewCertification] = useState("")
  const [newEducation, setNewEducation] = useState("")
  const [newExperience, setNewExperience] = useState("")

  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  async function loadTrainer() {
    try {
      setLoading(true)
      setError("")

      const response = await apiFetch(`/api/admin/trainers/${id}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Unable to load trainer")
      }

      const item = data.data as Trainer

      setTrainer(item)
      setName(item.name || "")
      setEmail(item.email || "")
      setPhone(item.phone || "")
      setHourlyRate(String(item.hourlyRate ?? ""))
      setIsActive(item.isActive)
      setIsAvailable(item.isAvailable)
      setCertifications(item.certifications || [])
      setEducation(item.education || [])
      setExperience(item.experience || [])
      setToolsTeach(item.toolsTeach || [])
      setSelectedSkills(item.skills || [])
      setImagePreview(item.image || "")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load trainer")
    } finally {
      setLoading(false)
    }
  }

  async function loadResources() {
    try {
      const [toolsResponse, skillsResponse] = await Promise.all([
        apiFetch("/api/admin/tools?limit=100"),
        apiFetch("/api/admin/skills?limit=100"),
      ])

      const [toolsData, skillsData] = await Promise.all([
        toolsResponse.json(),
        skillsResponse.json(),
      ])

      if (toolsResponse.ok) setTools(toolsData.data || [])
      if (skillsResponse.ok) setSkills(skillsData.data || [])
    } catch (err) {
      console.error("RESOURCE LOAD ERROR:", err)
    }
  }

  useEffect(() => {
    loadTrainer()
    loadResources()
  }, [id])

  function handleImage(file: File | undefined) {
    if (!file) return

    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview)
    }

    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function addItem(
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) {
    const trimmed = value.trim()
    if (!trimmed) return

    setter((current) =>
      current.includes(trimmed) ? current : [...current, trimmed]
    )
  }

  function removeItem(
    index: number,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) {
    setter((current) => current.filter((_, i) => i !== index))
  }

  function toggleResource(
    id: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) {
    setter((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    )
  }

  async function saveTrainer(e: React.FormEvent) {
    e.preventDefault()

    try {
      setSaving(true)
      setError("")
      setSuccess("")

      const formData = new FormData()

      formData.append("name", name.trim())
      formData.append("email", email.trim())
      formData.append("phone", phone.trim())
      formData.append("hourlyRate", String(Number(hourlyRate) || 0))
      formData.append("isActive", String(isActive))
      formData.append("isAvailable", String(isAvailable))

      certifications.forEach((item) =>
        formData.append("certifications", item)
      )
      education.forEach((item) => formData.append("education", item))
      experience.forEach((item) => formData.append("experience", item))
      toolsTeach.forEach((item) => formData.append("toolsTeach", item))
      selectedSkills.forEach((item) => formData.append("skills", item))

      trainer?.courses?.forEach((course) =>
        formData.append("courses", course)
      )

      if (password.trim()) {
        formData.append("password", password)
      }

      if (imageFile) {
        formData.append("image", imageFile)
      }

      const response = await apiFetch(`/api/admin/trainers/${id}`, {
        method: "PATCH",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Unable to update trainer")
      }

      setTrainer(data.data)
      setPassword("")
      setImageFile(null)
      setImagePreview(data.data.image || "")
      setSuccess("Trainer updated successfully.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update trainer")
    } finally {
      setSaving(false)
    }
  }

  async function deleteTrainer() {
    if (!window.confirm(`Delete ${name}? This action cannot be undone.`)) {
      return
    }

    try {
      setDeleting(true)

      const response = await apiFetch(`/api/admin/trainers/${id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Unable to delete trainer")
      }

      router.push("/admin/trainers")
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unable to delete trainer")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] px-4 py-10 text-[#222] dark:bg-[#111] dark:text-white">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-[#e8e8e8] bg-white p-12 text-center dark:border-[#2a2a2a] dark:bg-[#171717]">
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#67e44e]/10">
              <Loader2 size={20} className="animate-spin text-[#4fbd3d] dark:text-[#67e44e]" />
            </div>
            <p className="text-[13px] text-[#777] dark:text-[#888]">
              Loading trainer...
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!trainer) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] px-4 py-10 text-[#222] dark:bg-[#111] dark:text-white">
        <div className="">
          <div className="rounded-2xl border border-[#e8e8e8] bg-white p-10 text-center dark:border-[#2a2a2a] dark:bg-[#171717]">
            <p className="text-[13px] text-[#777] dark:text-[#888]">
              Trainer not found.
            </p>
            <Link
              href="/admin/trainers"
              className="mt-4 inline-flex rounded-xl bg-[#67e44e] px-4 py-2.5 text-[12px] font-semibold text-[#111] hover:bg-[#57d63f]"
            >
              Back to trainers
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f8f8] px-4 py-6 text-[#222] dark:bg-[#111] dark:text-white sm:px-6 lg:px-8">
      <div className="">
        <BackButton/>
        <div className="mb-7">
      

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#181818] dark:text-white sm:text-3xl">
                Edit Trainer
              </h1>
              <p className="mt-1.5 text-[12px] leading-5 text-[#777] dark:text-[#888]">
                Update trainer profile, access, expertise and availability.
              </p>
            </div>

            <button
              type="button"
              onClick={deleteTrainer}
              disabled={deleting}
              className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-red-200 bg-red-50 px-4 text-[12px] font-semibold text-red-600 transition hover:bg-red-100 disabled:pointer-events-none disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40 sm:self-auto"
            >
              {deleting ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Trash2 size={15} />
              )}
              Delete Trainer
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-600 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
            <X size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              className="ml-auto opacity-60 hover:opacity-100"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-[#67e44e]/30 bg-[#67e44e]/10 px-4 py-3 text-[12px] text-[#3b9d2e] dark:text-[#67e44e]">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#67e44e] text-[#111]">
              <Check size={14} />
            </div>
            {success}
          </div>
        )}

        <form onSubmit={saveTrainer} className="space-y-5 pb-28">
          <Section
            icon={<UserRound size={17} />}
            title="Basic Information"
            description="Trainer identity, contact details and profile image."
          >
            <div className="flex flex-col gap-6 lg:flex-row">
              <div className="shrink-0">
                <div className="relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#d5d5d5] bg-[#fafafa] dark:border-[#333] dark:bg-[#202020]">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt={name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl text-[#bbb] dark:text-[#555]">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {imagePreview && (
                    <div className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#67e44e] text-[#111] shadow-lg">
                      <Check size={14} />
                    </div>
                  )}
                </div>

                <label className="mt-3 inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#67e44e] px-4 text-[12px] font-semibold text-[#111] transition hover:bg-[#57d63f]">
                  <Upload size={15} />
                  Change Image
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => handleImage(e.target.files?.[0])}
                  />
                </label>

                <p className="mt-2 text-center text-[10px] text-[#888]">
                  JPG, PNG or WEBP
                </p>
              </div>

              <div className="grid flex-1 grid-cols-1 gap-5 md:grid-cols-2">
                <Input label="Trainer Name" value={name} onChange={setName} />
                <Input label="Email" type="email" value={email} onChange={setEmail} />
                <Input label="Phone" value={phone} onChange={setPhone} />
                <Input
                  label="Hourly Rate"
                  type="number"
                  min="0"
                  value={hourlyRate}
                  onChange={setHourlyRate}
                />
              </div>
            </div>
          </Section>

          <Section
            icon={<UserCheck size={17} />}
            title="Status & Availability"
            description="Control trainer account status and teaching availability."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ToggleCard
                title="Trainer Active"
                description="Trainer can access and use the system."
                checked={isActive}
                onChange={setIsActive}
                icon={isActive ? UserCheck : UserX}
              />
              <ToggleCard
                title="Available for Teaching"
                description="Trainer is currently available for assignments."
                checked={isAvailable}
                onChange={setIsAvailable}
                icon={Clock}
              />
            </div>
          </Section>

          <Section
            icon={<KeyRound size={17} />}
            title="Security"
            description="Change the trainer password. Leave blank to keep the current password."
          >
            <Input
              label="New Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Enter new password"
            />
            <p className="mt-2 text-[10px] text-[#888]">
              Minimum 8 characters with uppercase, lowercase and number.
            </p>
          </Section>

          <ArraySection
            title="Certifications"
            description="Add professional certifications."
            items={certifications}
            value={newCertification}
            setValue={setNewCertification}
            add={() => {
              addItem(newCertification, setCertifications)
              setNewCertification("")
            }}
            remove={(index) => removeItem(index, setCertifications)}
          />

          <ArraySection
            title="Education"
            description="Add academic background and qualifications."
            items={education}
            value={newEducation}
            setValue={setNewEducation}
            add={() => {
              addItem(newEducation, setEducation)
              setNewEducation("")
            }}
            remove={(index) => removeItem(index, setEducation)}
          />

          <ArraySection
            title="Experience"
            description="Add professional experience records."
            items={experience}
            value={newExperience}
            setValue={setNewExperience}
            add={() => {
              addItem(newExperience, setExperience)
              setNewExperience("")
            }}
            remove={(index) => removeItem(index, setExperience)}
          />

          <ResourceSelector
            title="Tools"
            description="Select tools the trainer can teach."
            resources={tools}
            selected={toolsTeach}
            onToggle={(resourceId) =>
              toggleResource(resourceId, setToolsTeach)
            }
          />

          <ResourceSelector
            title="Skills"
            description="Select skills associated with this trainer."
            resources={skills}
            selected={selectedSkills}
            onToggle={(resourceId) =>
              toggleResource(resourceId, setSelectedSkills)
            }
          />

          <Section
            icon={<Wrench size={17} />}
            title="Courses"
            description="Courses currently associated with this trainer."
          >
            <div className="rounded-xl border border-dashed border-[#d8d8d8] px-5 py-8 text-center dark:border-[#333]">
              <p className="text-[11px] text-[#888]">
                Course selector can be connected to your existing courses API.
              </p>
              {trainer.courses?.length > 0 && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {trainer.courses.map((course, index) => (
                    <span
                      key={`${course}-${index}`}
                      className="rounded-lg border border-[#ddd] bg-[#f5f5f5] px-3 py-1.5 text-[10px] text-[#555] dark:border-[#333] dark:bg-[#202020] dark:text-[#aaa]"
                    >
                      {typeof course === "object"
                        ? Object.values(course).filter(Boolean).join(", ")
                        : course}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Section>

          <div className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-7xl -translate-x-1/2 flex-col-reverse gap-2 rounded-2xl border border-[#e5e5e5] bg-white/95 p-2 shadow-[0_8px_35px_rgba(0,0,0,0.12)] backdrop-blur-xl dark:border-[#2a2a2a] dark:bg-[#171717]/95 dark:shadow-[0_8px_35px_rgba(0,0,0,0.35)] sm:flex-row sm:justify-end sm:p-2.5">
            <button
              type="button"
              onClick={() => router.push("/admin/trainers")}
              disabled={saving}
              className="h-10 rounded-xl border border-[#ddd] bg-white px-5 text-[12px] font-semibold text-[#555] transition hover:bg-[#f7f7f7] dark:border-[#333] dark:bg-[#202020] dark:text-[#aaa] dark:hover:bg-[#242424]"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#67e44e] px-6 text-[12px] font-semibold text-[#111] shadow-[0_5px_18px_rgba(103,228,78,0.18)] transition hover:bg-[#57d63f] disabled:pointer-events-none disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={14} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Section({
  title,
  description,
  icon,
  children,
}: {
  title: string
  description?: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="relative rounded-2xl border border-[#e8e8e8] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:border-[#2a2a2a] dark:bg-[#171717] dark:shadow-none">
      <div className="flex flex-col gap-4 border-b border-[#eeeeee] px-5 py-5 dark:border-[#2a2a2a] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-3">
          {icon && (
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#67e44e]/10 text-[#4fbd3d] dark:text-[#67e44e]">
              {icon}
            </div>
          )}

          <div>
            <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-[#181818] dark:text-white">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-[11px] leading-5 text-[#777] dark:text-[#888]">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">{children}</div>
    </section>
  )
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  min,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  min?: string
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-medium text-[#444] dark:text-[#bbb]">
        {label}
      </label>

      <input
        type={type}
        value={value}
        min={min}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-[#dedede] bg-white px-3.5 text-[12px] text-[#222] outline-none transition-all placeholder:text-[#aaa] hover:border-[#ccc] focus:border-[#67e44e] focus:ring-2 focus:ring-[#67e44e]/10 dark:border-[#333] dark:bg-[#202020] dark:text-white dark:placeholder:text-[#666] dark:hover:border-[#444] dark:focus:border-[#67e44e] dark:focus:bg-[#222]"
      />
    </div>
  )
}

function ToggleCard({
  title,
  description,
  checked,
  onChange,
  icon: Icon,
}: {
  title: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
  icon: React.ElementType
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${
        checked
          ? "border-[#67e44e]/40 bg-[#67e44e]/5"
          : "border-[#e5e5e5] bg-[#fafafa] dark:border-[#2a2a2a] dark:bg-[#1c1c1c]"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`rounded-xl p-2.5 ${
            checked
              ? "bg-[#67e44e]/10 text-[#4fbd3d] dark:text-[#67e44e]"
              : "bg-[#f0f0f0] text-[#888] dark:bg-[#292929] dark:text-[#666]"
          }`}
        >
          <Icon size={18} />
        </div>

        <div>
          <div className="text-[12px] font-semibold text-[#222] dark:text-white">
            {title}
          </div>
          <div className="mt-1 text-[10px] leading-4 text-[#888]">
            {description}
          </div>
        </div>
      </div>

      <div
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-[#67e44e]" : "bg-[#d4d4d4] dark:bg-[#333]"
        }`}
      >
        <div
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </div>
    </button>
  )
}

function ArraySection({
  title,
  description,
  items,
  value,
  setValue,
  add,
  remove,
}: {
  title: string
  description: string
  items: any[]
  value: string
  setValue: (value: string) => void
  add: () => void
  remove: (index: number) => void
}) {
  return (
    <Section
      icon={<Plus size={17} />}
      title={title}
      description={description}
    >
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              add()
            }
          }}
          placeholder={`Add ${title.toLowerCase()}...`}
          className="h-11 flex-1 rounded-xl border border-[#dedede] bg-white px-4 text-[12px] text-[#222] outline-none placeholder:text-[#aaa] focus:border-[#67e44e] focus:ring-2 focus:ring-[#67e44e]/10 dark:border-[#333] dark:bg-[#202020] dark:text-white dark:placeholder:text-[#666]"
        />

        <button
          type="button"
          onClick={add}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#67e44e] text-[#111] transition hover:bg-[#57d63f]"
        >
          <Plus size={17} />
        </button>
      </div>

      {items.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {items.map((item, index) => (
            <div
              key={`${index}`}
              className="flex items-center gap-2 rounded-lg border border-[#ddd] bg-[#f5f5f5] px-3 py-2 text-[11px] text-[#444] dark:border-[#333] dark:bg-[#202020] dark:text-[#ccc]"
            >
              <span>
                {typeof item === "object" && item !== null
                  ? Object.values(item).filter(Boolean).join(", ")
                  : item}
              </span>

              <button
                type="button"
                onClick={() => remove(index)}
                className="text-[#999] transition hover:text-red-500"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-[#d8d8d8] px-5 py-8 text-center dark:border-[#333]">
          <p className="text-[11px] text-[#888]">Nothing added yet.</p>
        </div>
      )}
    </Section>
  )
}

function ResourceSelector({
  title,
  description,
  resources,
  selected,
  onToggle,
}: {
  title: string
  description: string
  resources: Resource[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const filtered = resources
    .filter((resource) => resource.isActive)
    .filter((resource) =>
      resource.name.toLowerCase().includes(search.trim().toLowerCase())
    )

  return (
    <Section
      icon={<Wrench size={17} />}
      title={title}
      description={description}
    >
      <div className="relative z-[100]">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-medium text-[#444] dark:text-[#bbb]">
            Select {title}
          </span>

          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => {
                selected.forEach((id) => onToggle(id))
              }}
              className="text-[10px] font-medium text-red-500 hover:text-red-600"
            >
              Clear all
            </button>
          )}
        </div>

        {selected.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {selected.map((id) => {
              const resource = resources.find((item) => item._id === id)
              if (!resource) return null

              return (
                <div
                  key={id}
                  className="flex items-center gap-2 rounded-lg border border-[#ddd] bg-[#f5f5f5] px-2 py-1.5 text-[11px] text-[#444] dark:border-[#333] dark:bg-[#202020] dark:text-[#ccc]"
                >
                  {resource.image ? (
                    <img
                      src={resource.image}
                      alt=""
                      className="h-5 w-5 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-5 w-5 items-center justify-center rounded-md bg-[#67e44e]/10 text-[9px] font-bold text-[#4fbd3d] dark:text-[#67e44e]">
                      {resource.name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <span>{resource.name}</span>

                  <button
                    type="button"
                    onClick={() => onToggle(id)}
                    className="text-[#999] hover:text-red-500"
                  >
                    <X size={12} />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex h-11 w-full items-center justify-between rounded-xl border border-[#dedede] bg-white px-3.5 text-left transition hover:border-[#ccc] dark:border-[#333] dark:bg-[#202020] dark:hover:border-[#444]"
        >
          <span
            className={`text-[12px] ${
              selected.length
                ? "text-[#444] dark:text-[#ccc]"
                : "text-[#aaa] dark:text-[#666]"
            }`}
          >
            {selected.length ? `${selected.length} selected` : `Select ${title}`}
          </span>

          <span
            className={`text-[#888] transition-transform ${
              open ? "rotate-180" : ""
            }`}
          >
            ▾
          </span>
        </button>

        {open && (
          <div className="absolute left-0 right-0 top-full z-[9999] mt-2 overflow-hidden rounded-xl border border-[#ddd] bg-white shadow-[0_12px_35px_rgba(0,0,0,0.14)] dark:border-[#333] dark:bg-[#171717] dark:shadow-[0_12px_35px_rgba(0,0,0,0.4)]">
            <div className="border-b border-[#eeeeee] p-3 dark:border-[#2a2a2a]">
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${title.toLowerCase()}...`}
                className="h-9 w-full rounded-lg border border-[#ddd] bg-[#fafafa] px-3 text-[11px] outline-none focus:border-[#67e44e] dark:border-[#333] dark:bg-[#202020] dark:text-white"
              />
            </div>

            <div className="max-h-64 overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <div className="px-3 py-8 text-center text-[11px] text-[#888]">
                  No results found
                </div>
              ) : (
                filtered.map((resource) => {
                  const active = selected.includes(resource._id)

                  return (
                    <button
                      key={resource._id}
                      type="button"
                      onClick={() => onToggle(resource._id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                        active
                          ? "bg-[#67e44e]/10"
                          : "hover:bg-[#f7f7f7] dark:hover:bg-[#202020]"
                      }`}
                    >
                      {resource.image ? (
                        <img
                          src={resource.image}
                          alt=""
                          className="h-8 w-8 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f0f0f0] text-[10px] font-bold text-[#777] dark:bg-[#292929] dark:text-[#999]">
                          {resource.name.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <span className="flex-1 truncate text-[11px] font-medium text-[#333] dark:text-[#ccc]">
                        {resource.name}
                      </span>

                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                          active
                            ? "border-[#67e44e] bg-[#67e44e] text-[#111]"
                            : "border-[#d5d5d5] dark:border-[#444]"
                        }`}
                      >
                        {active && <Check size={12} />}
                      </span>
                    </button>
                  )
                })
              )}
            </div>

            <div className="flex items-center justify-between border-t border-[#eeeeee] px-3 py-2.5 dark:border-[#2a2a2a]">
              <span className="text-[10px] text-[#888]">
                {selected.length} selected
              </span>

              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  setSearch("")
                }}
                className="rounded-lg bg-[#67e44e] px-3 py-1.5 text-[10px] font-semibold text-[#111] hover:bg-[#57d63f]"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </Section>
  )
}

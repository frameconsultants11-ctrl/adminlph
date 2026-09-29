"use client"

import {
  useEffect,
  useMemo,
  useState,
} from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  AlertCircle,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  CirclePlus,
  GraduationCap,
  ImageIcon,
  Loader2,
  Trash2,
  UserRound,
  Wrench,
  X,
} from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import BackButton from "@/components/ui/BackButton"

/* =========================================================
   TYPES
========================================================= */

type Resource = {
  _id: string
  name: string
  image?: string
}

type Education = {
  level:
    | "high_school"
    | "college"
    | "masters"
    | "doctorate"
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

/* =========================================================
   CONSTANTS
========================================================= */

const EDUCATION_LEVELS = [
  {
    value: "high_school",
    label: "High School",
  },
  {
    value: "college",
    label: "College",
  },
  {
    value: "masters",
    label: "Masters",
  },
  {
    value: "doctorate",
    label: "Doctorate",
  },
]

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

/* =========================================================
   MAIN PAGE
========================================================= */

export default function NewTrainerPage() {
  const router = useRouter()

  const [form, setForm] =
    useState<TrainerForm>(INITIAL_FORM)

  const [image, setImage] =
    useState<File | null>(null)

  const [imagePreview, setImagePreview] =
    useState<string | null>(null)

  const [tools, setTools] =
    useState<Resource[]>([])

  const [skills, setSkills] =
    useState<Resource[]>([])

  const [certifications, setCertifications] =
    useState<Resource[]>([])

  const [courses, setCourses] =
    useState<Resource[]>([])

  const [courseApiAvailable, setCourseApiAvailable] =
    useState(false)

  const [loadingResources, setLoadingResources] =
    useState(true)

  const [submitting, setSubmitting] =
    useState(false)

  const [error, setError] =
    useState("")

  const [success, setSuccess] =
    useState("")

  /* =========================================================
     LOAD RESOURCES
  ========================================================= */

  useEffect(() => {
    loadResources()
  }, [])

  async function loadResources() {
    try {
      setLoadingResources(true)
      setError("")

      const [
        toolsResponse,
        skillsResponse,
        certificationsResponse,
      ] = await Promise.all([
        apiFetch("/api/admin/tools?limit=100"),
        apiFetch("/api/admin/skills?limit=100"),
        apiFetch(
          "/api/admin/certifications?limit=100"
        ),
      ])

      if (!toolsResponse.ok) {
        throw new Error("Failed to load tools")
      }

      if (!skillsResponse.ok) {
        throw new Error("Failed to load skills")
      }

      if (!certificationsResponse.ok) {
        throw new Error(
          "Failed to load certifications"
        )
      }

      const toolsData =
        await toolsResponse.json()

      const skillsData =
        await skillsResponse.json()

      const certificationsData =
        await certificationsResponse.json()

      setTools(
        Array.isArray(toolsData.data)
          ? toolsData.data
          : []
      )

      setSkills(
        Array.isArray(skillsData.data)
          ? skillsData.data
          : []
      )

      setCertifications(
        Array.isArray(
          certificationsData.data
        )
          ? certificationsData.data
          : []
      )

      /* ---------------------------------------------
         COURSES ARE OPTIONAL
      --------------------------------------------- */

      try {
        const coursesResponse =
          await apiFetch(
            "/api/admin/courses?limit=100"
          )

        if (coursesResponse.ok) {
          const coursesData =
            await coursesResponse.json()

          const courseList =
            Array.isArray(coursesData.data)
              ? coursesData.data
              : []

          setCourses(courseList)
          setCourseApiAvailable(true)
        } else {
          setCourses([])
          setCourseApiAvailable(false)
        }
      } catch (courseError) {
        console.log(
          "Course API not available. Continuing without courses."
        )

        setCourses([])
        setCourseApiAvailable(false)
      }
    } catch (err: any) {
      console.error(err)

      setError(
        err?.message ||
          "Failed to load trainer resources"
      )
    } finally {
      setLoadingResources(false)
    }
  }


  function handleImageChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0]

    if (!file) return

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ]

    if (!allowedTypes.includes(file.type)) {
      setError(
        "Only JPG, PNG and WEBP images are allowed"
      )

      event.target.value = ""
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        "Image size must be less than 5MB"
      )

      event.target.value = ""
      return
    }

    setError("")
    setImage(file)

    const previewUrl =
      URL.createObjectURL(file)

    setImagePreview(previewUrl)
  }

  /* =========================================================
     ABOUT WORD COUNT
  ========================================================= */

  const aboutWordCount = useMemo(() => {
    if (!form.about.trim()) return 0

    return form.about
      .trim()
      .split(/\s+/)
      .filter(Boolean).length
  }, [form.about])

  /* =========================================================
     BASIC FORM UPDATE
  ========================================================= */

  function updateField(
    field: keyof TrainerForm,
    value: any
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  /* =========================================================
     EDUCATION
  ========================================================= */

  function addEducation() {
    setForm((previous) => ({
      ...previous,
      education: [
        ...previous.education,
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
    value: any
  ) {
    setForm((previous) => {
      const education = [
        ...previous.education,
      ]

      education[index] = {
        ...education[index],
        [field]: value,
      }

      return {
        ...previous,
        education,
      }
    })
  }

  function removeEducation(index: number) {
    setForm((previous) => ({
      ...previous,
      education:
        previous.education.filter(
          (_, i) => i !== index
        ),
    }))
  }

  /* =========================================================
     EXPERIENCE
  ========================================================= */

  function addExperience() {
    setForm((previous) => ({
      ...previous,
      experience: [
        ...previous.experience,
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
    value: any
  ) {
    setForm((previous) => {
      const experience = [
        ...previous.experience,
      ]

      experience[index] = {
        ...experience[index],
        [field]: value,
      }

      if (
        field === "isCurrent" &&
        value === true
      ) {
        experience[index].to = ""
      }

      return {
        ...previous,
        experience,
      }
    })
  }

  function removeExperience(index: number) {
    setForm((previous) => ({
      ...previous,
      experience:
        previous.experience.filter(
          (_, i) => i !== index
        ),
    }))
  }

  /* =========================================================
     SUBMIT
  ========================================================= */

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault()

    setError("")
    setSuccess("")

    /* ---------------------------------------------
       BASIC VALIDATION
    --------------------------------------------- */

    if (!form.name.trim()) {
      setError("Trainer name is required")
      return
    }

    if (!form.email.trim()) {
      setError("Email is required")
      return
    }

    if (!form.phone.trim()) {
      setError("Phone number is required")
      return
    }

    if (!form.password) {
      setError("Password is required")
      return
    }

    if (form.password.length < 8) {
      setError(
        "Password must be at least 8 characters"
      )
      return
    }

    if (!image) {
      setError("Trainer image is required")
      return
    }

    /* ---------------------------------------------
       ABOUT
    --------------------------------------------- */

    if (aboutWordCount > 100) {
      setError(
        "About trainer must not exceed 100 words"
      )
      return
    }

    /* ---------------------------------------------
       EDUCATION
    --------------------------------------------- */

    for (
      let index = 0;
      index < form.education.length;
      index++
    ) {
      const education =
        form.education[index]

      if (!education.institution.trim()) {
        setError(
          `Education #${
            index + 1
          }: school/university is required`
        )
        return
      }

      if (!education.year.trim()) {
        setError(
          `Education #${
            index + 1
          }: year is required`
        )
        return
      }
    }


    for (
      let index = 0;
      index < form.experience.length;
      index++
    ) {
      const experience =
        form.experience[index]

      if (!experience.designation.trim()) {
        setError(
          `Experience #${
            index + 1
          }: designation is required`
        )
        return
      }

      if (!experience.company.trim()) {
        setError(
          `Experience #${
            index + 1
          }: company is required`
        )
        return
      }

      if (!experience.from.trim()) {
        setError(
          `Experience #${
            index + 1
          }: start year is required`
        )
        return
      }

      if (
        !experience.isCurrent &&
        !experience.to.trim()
      ) {
        setError(
          `Experience #${
            index + 1
          }: end year is required`
        )
        return
      }
    }

    try {
      setSubmitting(true)

      const formData = new FormData()

      /* ---------------------------------------------
         BASIC
      --------------------------------------------- */

      formData.append(
        "name",
        form.name.trim()
      )

      formData.append(
        "email",
        form.email.trim()
      )

      formData.append(
        "phone",
        form.phone.trim()
      )

      formData.append(
        "password",
        form.password
      )

      formData.append(
        "about",
        form.about.trim()
      )

      formData.append(
        "hourlyRate",
        form.hourlyRate || "0"
      )

      formData.append(
        "isActive",
        String(form.isActive)
      )

      formData.append(
        "isAvailable",
        String(form.isAvailable)
      )

      /* ---------------------------------------------
         IMAGE
      --------------------------------------------- */

      formData.append("image", image)

      /* ---------------------------------------------
         RELATIONS
      --------------------------------------------- */

      formData.append(
        "certifications",
        JSON.stringify(
          form.certifications
        )
      )

      formData.append(
        "toolsTeach",
        JSON.stringify(
          form.toolsTeach
        )
      )

      formData.append(
        "skills",
        JSON.stringify(
          form.skills
        )
      )

      formData.append(
        "courses",
        JSON.stringify(
          courseApiAvailable
            ? form.courses
            : []
        )
      )

      /* ---------------------------------------------
         EDUCATION
      --------------------------------------------- */

      formData.append(
        "education",
        JSON.stringify(
          form.education
        )
      )

      /* ---------------------------------------------
         EXPERIENCE
      --------------------------------------------- */

      formData.append(
        "experience",
        JSON.stringify(
          form.experience
        )
      )

      /* ---------------------------------------------
         API
      --------------------------------------------- */

      const response = await apiFetch(
        "/api/admin/trainers",
        {
          method: "POST",
          body: formData,
        }
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to create trainer"
        )
      }

      setSuccess(
        "Trainer created successfully"
      )

      setTimeout(() => {
        router.push("/trainers")
      }, 800)
    } catch (err: any) {
      console.error(err)

      setError(
        err?.message ||
          "Failed to create trainer"
      )
    } finally {
      setSubmitting(false)
    }
  }

  /* =========================================================
     LOADING
  ========================================================= */

  if (loadingResources) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] px-4 py-10 text-[#222] dark:bg-[#111] dark:text-white">
        <div className="mx-auto max-w-7xl">
          <div
            className="
              rounded-2xl
              border border-[#e8e8e8]
              bg-white
              p-12
              text-center

              dark:border-[#2a2a2a]
              dark:bg-[#171717]
            "
          >
            <div
              className="
                mx-auto mb-4
                flex h-10 w-10
                items-center justify-center
                rounded-full
                bg-[#67e44e]/10
              "
            >
              <Loader2
                size={20}
                className="animate-spin text-[#4fbd3d] dark:text-[#67e44e]"
              />
            </div>

            <p className="text-[13px] text-[#777] dark:text-[#888]">
              Loading trainer resources...
            </p>
          </div>
        </div>
      </div>
    )
  }


  return (
    <div
      className="
        min-h-screen
        bg-[#f8f8f8]
        px-4
        py-6
        text-[#222]

        dark:bg-[#111]
        dark:text-white

        sm:px-6
        lg:px-8
      "
    >
      <div className="">

        <BackButton />

        <div className="mb-7">
       

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>

              <h1
                className="
                  text-2xl
                  font-semibold
                  tracking-[-0.03em]
                  text-[#181818]

                  dark:text-white

                  sm:text-3xl
                "
              >
                Create New Trainer
              </h1>

              <p
                className="
                  mt-1.5
                  max-w-xl
                  text-[12px]
                  leading-5
                  text-[#777]

                  dark:text-[#888]
                "
              >
                Add trainer details, education,
                experience, skills and
                professional expertise.
              </p>
            </div>
          </div>
        </div>

        {/* =====================================================
            ALERTS
        ===================================================== */}

        {error && (
          <div
            className="
              mb-5
              flex items-start gap-3
              rounded-xl
              border
              border-red-200
              bg-red-50
              px-4
              py-3
              text-[12px]
              text-red-600

              dark:border-red-900/50
              dark:bg-red-950/20
              dark:text-red-400
            "
          >
            <AlertCircle
              size={17}
              className="mt-0.5 shrink-0"
            />

            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              className="ml-auto shrink-0 opacity-60 transition hover:opacity-100"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {success && (
          <div
            className="
              mb-5
              flex items-center gap-3
              rounded-xl
              border
              border-[#67e44e]/30
              bg-[#67e44e]/10
              px-4
              py-3
              text-[12px]
              text-[#3b9d2e]

              dark:text-[#67e44e]
            "
          >
            <div
              className="
                flex h-6 w-6
                items-center justify-center
                rounded-full
                bg-[#67e44e]
                text-[#111]
              "
            >
              <Check size={14} />
            </div>

            <span>{success}</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-5 pb-28"
        >

          {/* =====================================================
              BASIC INFORMATION
          ===================================================== */}

          <Section
            icon={<UserRound size={17} />}
            title="Basic Information"
            description="Basic trainer account and profile information."
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Input
                label="Trainer Name"
                value={form.name}
                onChange={(value) =>
                  updateField(
                    "name",
                    value
                  )
                }
                placeholder="John Doe"
                required
              />

              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(value) =>
                  updateField(
                    "email",
                    value
                  )
                }
                placeholder="john@example.com"
                required
              />

              <Input
                label="Phone"
                value={form.phone}
                onChange={(value) =>
                  updateField(
                    "phone",
                    value
                  )
                }
                placeholder="+91 9876543210"
                required
              />

              <Input
                label="Password"
                type="password"
                value={form.password}
                onChange={(value) =>
                  updateField(
                    "password",
                    value
                  )
                }
                placeholder="Minimum 8 characters"
                required
              />

              <Input
                label="Hourly Rate"
                type="number"
                min="0"
                value={form.hourlyRate}
                onChange={(value) =>
                  updateField(
                    "hourlyRate",
                    value
                  )
                }
                placeholder="1000"
              />
            </div>
          </Section>

          {/* =====================================================
              IMAGE
          ===================================================== */}

          <Section
            icon={<ImageIcon size={17} />}
            title="Trainer Image"
            description="Upload a professional trainer profile image."
          >
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div
                className="
                  relative
                  flex
                  h-36
                  w-36
                  shrink-0
                  items-center
                  justify-center
                  overflow-hidden
                  rounded-2xl
                  border
                  border-dashed
                  border-[#d5d5d5]
                  bg-[#fafafa]

                  dark:border-[#333]
                  dark:bg-[#202020]
                "
              >
                {imagePreview ? (
                  <>
                    <Image
                      src={imagePreview}
                      alt="Trainer preview"
                      width={144}
                      height={144}
                      className="h-full w-full object-cover"
                      unoptimized
                    />

                    <div
                      className="
                        absolute
                        bottom-2
                        right-2
                        flex h-7 w-7
                        items-center justify-center
                        rounded-full
                        bg-[#67e44e]
                        text-[#111]
                        shadow-lg
                      "
                    >
                      <Check size={14} />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-[#999]">
                    <ImageIcon size={24} />
                    <span className="text-[10px]">
                      No image
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label
                  className="
                    inline-flex
                    h-10
                    cursor-pointer
                    items-center
                    gap-2
                    rounded-xl
                    bg-[#67e44e]
                    px-4
                    text-[12px]
                    font-semibold
                    text-[#111]
                    transition-all
                    hover:bg-[#57d63f]
                    active:scale-[0.98]
                  "
                >
                  <ImageIcon size={15} />
                  Choose Image

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={
                      handleImageChange
                    }
                  />
                </label>

                <p className="mt-2.5 text-[11px] text-[#888]">
                  JPG, PNG or WEBP • Maximum 5MB
                </p>

                <p className="mt-1 text-[10px] text-[#aaa] dark:text-[#666]">
                  Use a clear professional profile photo.
                </p>
              </div>
            </div>
          </Section>

          {/* =====================================================
              ABOUT
          ===================================================== */}

          <Section
            icon={<UserRound size={17} />}
            title="About Trainer"
            description="Write a short introduction about the trainer."
          >
            <div>
              <textarea
                value={form.about}
                onChange={(event) =>
                  updateField(
                    "about",
                    event.target.value
                  )
                }
                rows={6}
                maxLength={1000}
                placeholder="Write about the trainer, their expertise, teaching style and professional background..."
                className="
                  w-full
                  resize-none
                  rounded-xl
                  border
                  border-[#dedede]
                  bg-white
                  px-4
                  py-3
                  text-[13px]
                  leading-6
                  text-[#222]
                  outline-none
                  transition-all

                  placeholder:text-[#aaa]

                  hover:border-[#ccc]

                  focus:border-[#67e44e]
                  focus:ring-2
                  focus:ring-[#67e44e]/10

                  dark:border-[#333]
                  dark:bg-[#202020]
                  dark:text-white
                  dark:placeholder:text-[#666]

                  dark:hover:border-[#444]

                  dark:focus:border-[#67e44e]
                  dark:focus:bg-[#222]
                "
              />

              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-[#888]">
                  Maximum 100 words
                </span>

                <span
                  className={`
                    text-[11px]
                    font-medium
                    ${
                      aboutWordCount > 100
                        ? "text-red-500"
                        : aboutWordCount > 80
                          ? "text-amber-500"
                          : "text-[#888]"
                    }
                  `}
                >
                  {aboutWordCount}/100
                </span>
              </div>
            </div>
          </Section>

          {/* =====================================================
              EDUCATION
          ===================================================== */}

          <Section
            icon={<GraduationCap size={17} />}
            title="Education"
            description="Add multiple education records for the trainer."
            action={
              <AddButton
                onClick={addEducation}
                label="Add Education"
              />
            }
          >
            {form.education.length === 0 ? (
              <EmptySection
                icon={<GraduationCap size={20} />}
                text="No education added yet."
                action="Add Education"
                onClick={addEducation}
              />
            ) : (
              <div className="space-y-4">
                {form.education.map(
                  (education, index) => (
                    <div
                      key={index}
                      className="
                        rounded-xl
                        border
                        border-[#e5e5e5]
                        bg-[#fafafa]
                        p-4

                        dark:border-[#2a2a2a]
                        dark:bg-[#1c1c1c]
                      "
                    >
                      <div className="mb-5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="
                              flex h-8 w-8
                              shrink-0
                              items-center justify-center
                              rounded-lg
                              bg-[#67e44e]/10
                              text-[#4fbd3d]

                              dark:text-[#67e44e]
                            "
                          >
                            <GraduationCap
                              size={16}
                            />
                          </div>

                          <div>
                            <h3 className="text-[13px] font-semibold text-[#222] dark:text-white">
                              Education #{index + 1}
                            </h3>

                            <p className="text-[10px] text-[#888]">
                              Academic background
                            </p>
                          </div>
                        </div>

                        <RemoveButton
                          onClick={() =>
                            removeEducation(
                              index
                            )
                          }
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <Select
                          label="Education Level"
                          value={
                            education.level
                          }
                          onChange={(value) =>
                            updateEducation(
                              index,
                              "level",
                              value
                            )
                          }
                          options={
                            EDUCATION_LEVELS
                          }
                        />

                        <Input
                          label="School / University"
                          value={
                            education.institution
                          }
                          onChange={(value) =>
                            updateEducation(
                              index,
                              "institution",
                              value
                            )
                          }
                          placeholder="University / College name"
                        />

                        <Input
                          label="Year"
                          value={
                            education.year
                          }
                          onChange={(value) =>
                            updateEducation(
                              index,
                              "year",
                              value
                            )
                          }
                          placeholder="2024"
                        />
                      </div>

                      <CurrentCheckbox
                        checked={
                          education.isCurrent
                        }
                        onChange={(value) =>
                          updateEducation(
                            index,
                            "isCurrent",
                            value
                          )
                        }
                        label="Currently studying"
                      />
                    </div>
                  )
                )}
              </div>
            )}
          </Section>

          {/* =====================================================
              EXPERIENCE
          ===================================================== */}

          <Section
            icon={<BriefcaseBusiness size={17} />}
            title="Experience"
            description="Add multiple professional experience records."
            action={
              <AddButton
                onClick={addExperience}
                label="Add Experience"
              />
            }
          >
            {form.experience.length === 0 ? (
              <EmptySection
                icon={<BriefcaseBusiness size={20} />}
                text="No experience added yet."
                action="Add Experience"
                onClick={addExperience}
              />
            ) : (
              <div className="space-y-4">
                {form.experience.map(
                  (experience, index) => (
                    <div
                      key={index}
                      className="
                        rounded-xl
                        border
                        border-[#e5e5e5]
                        bg-[#fafafa]
                        p-4

                        dark:border-[#2a2a2a]
                        dark:bg-[#1c1c1c]
                      "
                    >
                      <div className="mb-5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="
                              flex h-8 w-8
                              shrink-0
                              items-center justify-center
                              rounded-lg
                              bg-[#67e44e]/10
                              text-[#4fbd3d]

                              dark:text-[#67e44e]
                            "
                          >
                            <BriefcaseBusiness
                              size={15}
                            />
                          </div>

                          <div>
                            <h3 className="text-[13px] font-semibold text-[#222] dark:text-white">
                              Experience #{index + 1}
                            </h3>

                            <p className="text-[10px] text-[#888]">
                              Professional background
                            </p>
                          </div>
                        </div>

                        <RemoveButton
                          onClick={() =>
                            removeExperience(
                              index
                            )
                          }
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Input
                          label="Designation"
                          value={
                            experience.designation
                          }
                          onChange={(value) =>
                            updateExperience(
                              index,
                              "designation",
                              value
                            )
                          }
                          placeholder="Senior React Developer"
                        />

                        <Input
                          label="Company"
                          value={
                            experience.company
                          }
                          onChange={(value) =>
                            updateExperience(
                              index,
                              "company",
                              value
                            )
                          }
                          placeholder="Company name"
                        />

                        <Input
                          label="From"
                          value={
                            experience.from
                          }
                          onChange={(value) =>
                            updateExperience(
                              index,
                              "from",
                              value
                            )
                          }
                          placeholder="2021"
                        />

                        {!experience.isCurrent && (
                          <Input
                            label="To"
                            value={
                              experience.to
                            }
                            onChange={(value) =>
                              updateExperience(
                                index,
                                "to",
                                value
                              )
                            }
                            placeholder="2024"
                          />
                        )}
                      </div>

                      <CurrentCheckbox
                        checked={
                          experience.isCurrent
                        }
                        onChange={(value) =>
                          updateExperience(
                            index,
                            "isCurrent",
                            value
                          )
                        }
                        label="Currently working here"
                      />
                    </div>
                  )
                )}
              </div>
            )}
          </Section>

          {/* =====================================================
              CERTIFICATIONS
          ===================================================== */}

          <Section
            icon={<Check size={17} />}
            title="Certifications"
            description="Search and select multiple certifications."
          >
            <ResourceMultiSelect
              label="Select Certifications"
              resources={certifications}
              selectedIds={
                form.certifications
              }
              onChange={(ids) =>
                updateField(
                  "certifications",
                  ids
                )
              }
              placeholder="Search certifications..."
            />
          </Section>

          {/* =====================================================
              SKILLS
          ===================================================== */}

          <Section
            icon={<Wrench size={17} />}
            title="Skills"
            description="Search and select multiple skills."
          >
            <ResourceMultiSelect
              label="Select Skills"
              resources={skills}
              selectedIds={form.skills}
              onChange={(ids) =>
                updateField(
                  "skills",
                  ids
                )
              }
              placeholder="Search skills..."
            />
          </Section>

          {/* =====================================================
              TOOLS
          ===================================================== */}

          <Section
            icon={<Wrench size={17} />}
            title="Tools"
            description="Search and select multiple tools the trainer can teach."
          >
            <ResourceMultiSelect
              label="Select Tools"
              resources={tools}
              selectedIds={
                form.toolsTeach
              }
              onChange={(ids) =>
                updateField(
                  "toolsTeach",
                  ids
                )
              }
              placeholder="Search tools..."
            />
          </Section>

          {/* =====================================================
              COURSES
          ===================================================== */}

          {courseApiAvailable && (
            <Section
              icon={<BriefcaseBusiness size={17} />}
              title="Courses"
              description="Search and select courses assigned to this trainer."
            >
              <ResourceMultiSelect
                label="Select Courses"
                resources={courses}
                selectedIds={
                  form.courses
                }
                onChange={(ids) =>
                  updateField(
                    "courses",
                    ids
                  )
                }
                placeholder="Search courses..."
              />
            </Section>
          )}

          {/* =====================================================
              STATUS
          ===================================================== */}

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
                onChange={(value) =>
                  updateField(
                    "isActive",
                    value
                  )
                }
              />

              <ToggleCard
                title="Available"
                description="Trainer is currently available for assignments."
                checked={
                  form.isAvailable
                }
                onChange={(value) =>
                  updateField(
                    "isAvailable",
                    value
                  )
                }
              />
            </div>
          </Section>

          {/* =====================================================
              SUBMIT
          ===================================================== */}

          <div
            className="
              fixed
              bottom-4
              left-1/2
              z-30
              flex
              w-[calc(100%-2rem)]
              max-w-7xl
              mx-auto
              -translate-x-1/2
              flex-col-reverse
              gap-2
              rounded-2xl
              border
              border-[#e5e5e5]
              bg-white/95
              p-2
              shadow-[0_8px_35px_rgba(0,0,0,0.12)]
              backdrop-blur-xl

              dark:border-[#2a2a2a]
              dark:bg-[#171717]/95
              dark:shadow-[0_8px_35px_rgba(0,0,0,0.35)]

              sm:flex-row
              sm:justify-end
              sm:p-2.5
            "
          >
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/trainers"
                )
              }
              disabled={submitting}
              className="
                h-10
                rounded-xl
                border
                border-[#ddd]
                bg-white
                px-5
                text-[12px]
                font-semibold
                text-[#555]
                transition

                hover:bg-[#f7f7f7]

                dark:border-[#333]
                dark:bg-[#202020]
                dark:text-[#aaa]
                dark:hover:bg-[#242424]

                disabled:pointer-events-none
                disabled:opacity-50
              "
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="
                flex
                h-10
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-[#67e44e]
                px-6
                text-[12px]
                font-semibold
                text-[#111]
                shadow-[0_5px_18px_rgba(103,228,78,0.18)]
                transition-all

                hover:bg-[#57d63f]
                hover:shadow-[0_7px_22px_rgba(103,228,78,0.25)]

                active:scale-[0.98]

                disabled:pointer-events-none
                disabled:opacity-50
              "
            >
              {submitting ? (
                <>
                  <Loader2
                    size={14}
                    className="animate-spin"
                  />

                  Creating Trainer...
                </>
              ) : (
                <>
                  <Check size={14} />

                  Create Trainer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* =========================================================
   SECTION
========================================================= */

function Section({
  title,
  description,
  action,
  icon,
  children,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section
  className="
    relative
    rounded-2xl
    border
    border-[#e8e8e8]
    bg-white
    shadow-[0_2px_12px_rgba(0,0,0,0.03)]

    dark:border-[#2a2a2a]
    dark:bg-[#171717]
    dark:shadow-none
  "
>
      <div
        className="
          flex
          flex-col
          gap-4
          border-b
          border-[#eeeeee]
          px-5
          py-5

          dark:border-[#2a2a2a]

          sm:flex-row
          sm:items-center
          sm:justify-between
          sm:px-6
        "
      >
        <div className="flex items-start gap-3">
          {icon && (
            <div
              className="
                mt-0.5
                flex
                h-8
                w-8
                shrink-0
                items-center
                justify-center
                rounded-lg
                bg-[#67e44e]/10
                text-[#4fbd3d]

                dark:text-[#67e44e]
              "
            >
              {icon}
            </div>
          )}

          <div>
            <h2
              className="
                text-[14px]
                font-semibold
                tracking-[-0.01em]
                text-[#181818]

                dark:text-white
              "
            >
              {title}
            </h2>

            {description && (
              <p
                className="
                  mt-1
                  text-[11px]
                  leading-5
                  text-[#777]

                  dark:text-[#888]
                "
              >
                {description}
              </p>
            )}
          </div>
        </div>

        {action}
      </div>

      <div className="p-5 sm:p-6">
        {children}
      </div>
    </section>
  )
}

/* =========================================================
   INPUT
========================================================= */

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  min,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  required?: boolean
  min?: string
}) {
  return (
    <div>
      <label
        className="
          mb-2
          block
          text-[11px]
          font-medium
          text-[#444]

          dark:text-[#bbb]
        "
      >
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      <input
        type={type}
        value={value}
        min={min}
        required={required}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="
          h-11
          w-full
          rounded-xl
          border
          border-[#dedede]
          bg-white
          px-3.5
          text-[12px]
          text-[#222]
          outline-none
          transition-all

          placeholder:text-[#aaa]

          hover:border-[#ccc]

          focus:border-[#67e44e]
          focus:ring-2
          focus:ring-[#67e44e]/10

          dark:border-[#333]
          dark:bg-[#202020]
          dark:text-white
          dark:placeholder:text-[#666]

          dark:hover:border-[#444]

          dark:focus:border-[#67e44e]
          dark:focus:bg-[#222]
        "
      />
    </div>
  )
}

/* =========================================================
   SELECT
========================================================= */

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: {
    value: string
    label: string
  }[]
}) {
  return (
    <div>
      <label
        className="
          mb-2
          block
          text-[11px]
          font-medium
          text-[#444]

          dark:text-[#bbb]
        "
      >
        {label}
      </label>

      <div className="relative">
        <select
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          className="
            h-11
            w-full
            appearance-none
            rounded-xl
            border
            border-[#dedede]
            bg-white
            px-3.5
            pr-10
            text-[12px]
            text-[#222]
            outline-none
            transition-all

            hover:border-[#ccc]

            focus:border-[#67e44e]
            focus:ring-2
            focus:ring-[#67e44e]/10

            dark:border-[#333]
            dark:bg-[#202020]
            dark:text-white

            dark:hover:border-[#444]

            dark:focus:border-[#67e44e]
            dark:focus:bg-[#222]
          "
        >
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown
          size={15}
          className="
            pointer-events-none
            absolute
            right-3.5
            top-1/2
            -translate-y-1/2
            text-[#888]
          "
        />
      </div>
    </div>
  )
}

/* =========================================================
   ADD BUTTON
========================================================= */

function AddButton({
  onClick,
  label,
}: {
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        inline-flex
        h-9
        items-center
        justify-center
        gap-1.5
        rounded-lg
        bg-[#67e44e]
        px-3
        text-[11px]
        font-semibold
        text-[#111]
        transition-all

        hover:bg-[#57d63f]

        active:scale-[0.98]
      "
    >
      <CirclePlus size={14} />
      {label}
    </button>
  )
}

/* =========================================================
   REMOVE BUTTON
========================================================= */

function RemoveButton({
  onClick,
}: {
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        inline-flex
        h-8
        items-center
        gap-1.5
        rounded-lg
        px-2.5
        text-[10px]
        font-medium
        text-red-500
        transition

        hover:bg-red-50

        dark:hover:bg-red-950/30
      "
    >
      <Trash2 size={13} />
      Remove
    </button>
  )
}

/* =========================================================
   CURRENT CHECKBOX
========================================================= */

function CurrentCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={() =>
        onChange(!checked)
      }
      className="
        mt-4
        flex
        items-center
        gap-2.5
        text-left
      "
    >
      <span
        className={`
          flex
          h-5
          w-5
          items-center
          justify-center
          rounded-md
          border
          transition-all

          ${
            checked
              ? "border-[#67e44e] bg-[#67e44e] text-[#111]"
              : "border-[#ccc] bg-white dark:border-[#444] dark:bg-[#202020]"
          }
        `}
      >
        {checked && (
          <Check size={12} />
        )}
      </span>

      <span
        className="
          text-[11px]
          font-medium
          text-[#555]

          dark:text-[#aaa]
        "
      >
        {label}
      </span>
    </button>
  )
}

/* =========================================================
   EMPTY
========================================================= */

function EmptySection({
  text,
  action,
  icon,
  onClick,
}: {
  text: string
  action?: string
  icon?: React.ReactNode
  onClick?: () => void
}) {
  return (
    <div
      className="
        flex
        flex-col
        items-center
        justify-center
        rounded-xl
        border
        border-dashed
        border-[#d8d8d8]
        px-5
        py-10
        text-center

        dark:border-[#333]
      "
    >
      <div
        className="
          mb-3
          flex
          h-10
          w-10
          items-center
          justify-center
          rounded-xl
          bg-[#f3f3f3]
          text-[#999]

          dark:bg-[#202020]
          dark:text-[#666]
        "
      >
        {icon}
      </div>

      <p className="text-[11px] text-[#888]">
        {text}
      </p>

      {action && onClick && (
        <button
          type="button"
          onClick={onClick}
          className="
            mt-3
            text-[11px]
            font-semibold
            text-[#4fbd3d]
            hover:text-[#3b9d2e]

            dark:text-[#67e44e]
          "
        >
          + {action}
        </button>
      )}
    </div>
  )
}

/* =========================================================
   RESOURCE MULTI SELECT
========================================================= */

function ResourceMultiSelect({
  label,
  resources,
  selectedIds,
  onChange,
  placeholder,
}: {
  label: string
  resources: Resource[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  placeholder: string
}) {
  const [open, setOpen] =
    useState(false)

  const [search, setSearch] =
    useState("")

  const filteredResources =
    useMemo(() => {
      const query =
        search.trim().toLowerCase()

      if (!query) {
        return resources
      }

      return resources.filter(
        (resource) =>
          resource.name
            .toLowerCase()
            .includes(query)
      )
    }, [resources, search])

  function toggleResource(
    resourceId: string
  ) {
    if (
      selectedIds.includes(
        resourceId
      )
    ) {
      onChange(
        selectedIds.filter(
          (id) => id !== resourceId
        )
      )
    } else {
      onChange([
        ...selectedIds,
        resourceId,
      ])
    }
  }

  function removeResource(
    resourceId: string
  ) {
    onChange(
      selectedIds.filter(
        (id) => id !== resourceId
      )
    )
  }

  function clearAll() {
    onChange([])
  }

  const selectedResources =
    resources.filter((resource) =>
      selectedIds.includes(
        resource._id
      )
    )

  return (
    <div>
      {/* LABEL */}

      <div className="mb-2 flex items-center justify-between">
        <label
          className="
            text-[11px]
            font-medium
            text-[#444]

            dark:text-[#bbb]
          "
        >
          {label}
        </label>

        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="
              text-[10px]
              font-medium
              text-red-500
              transition

              hover:text-red-600
            "
          >
            Clear all
          </button>
        )}
      </div>

      {/* SELECTED CHIPS */}

      {selectedResources.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {selectedResources.map(
            (resource) => (
              <div
                key={resource._id}
                className="
                  flex
                  items-center
                  gap-2
                  rounded-lg
                  border
                  border-[#ddd]
                  bg-[#f5f5f5]
                  px-2
                  py-1.5
                  text-[11px]
                  text-[#444]

                  dark:border-[#333]
                  dark:bg-[#202020]
                  dark:text-[#ccc]
                "
              >
                {resource.image ? (
                  <img
                    src={resource.image}
                    alt=""
                    className="
                      h-5
                      w-5
                      rounded-md
                      object-cover
                    "
                  />
                ) : (
                  <div
                    className="
                      flex
                      h-5
                      w-5
                      items-center
                      justify-center
                      rounded-md
                      bg-[#67e44e]/10
                      text-[9px]
                      font-bold
                      text-[#4fbd3d]

                      dark:text-[#67e44e]
                    "
                  >
                    {resource.name
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}

                <span>
                  {resource.name}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    removeResource(
                      resource._id
                    )
                  }
                  className="
                    ml-0.5
                    text-[#999]
                    transition
                    hover:text-red-500
                  "
                >
                  <X size={12} />
                </button>
              </div>
            )
          )}
        </div>
      )}

      {/* DROPDOWN */}

      <div className="relative">
        <button
          type="button"
          onClick={() =>
            setOpen(
              (previous) =>
                !previous
            )
          }
          className="
            flex
            h-11
            w-full
            items-center
            justify-between
            rounded-xl
            border
            border-[#dedede]
            bg-white
            px-3.5
            text-left
            outline-none
            transition-all

            hover:border-[#ccc]

            dark:border-[#333]
            dark:bg-[#202020]

            dark:hover:border-[#444]
          "
        >
          <span
            className={`
              text-[12px]
              ${
                selectedIds.length > 0
                  ? "text-[#444] dark:text-[#ccc]"
                  : "text-[#aaa] dark:text-[#666]"
              }
            `}
          >
            {selectedIds.length > 0
              ? `${selectedIds.length} selected`
              : placeholder}
          </span>

          <ChevronDown
            size={15}
            className={`
              text-[#888]
              transition-transform
              ${
                open
                  ? "rotate-180"
                  : ""
              }
            `}
          />
        </button>

        {open && (
          <div
    className="
      absolute
      left-0
      right-0
      z-[9999]
      mt-2
      overflow-hidden
      rounded-xl
      border
      border-[#ddd]
      bg-white
      shadow-[0_12px_35px_rgba(0,0,0,0.12)]

      dark:border-[#333]
      dark:bg-[#171717]
      dark:shadow-[0_12px_35px_rgba(0,0,0,0.35)]
    "
  >
            {/* SEARCH */}

            <div
              className="
                border-b
                border-[#eeeeee]
                p-3

                dark:border-[#2a2a2a]
              "
            >
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search..."
                className="
                  h-9
                  w-full
                  rounded-lg
                  border
                  border-[#ddd]
                  bg-[#fafafa]
                  px-3
                  text-[11px]
                  text-[#222]
                  outline-none

                  placeholder:text-[#aaa]

                  focus:border-[#67e44e]
                  focus:ring-2
                  focus:ring-[#67e44e]/10

                  dark:border-[#333]
                  dark:bg-[#202020]
                  dark:text-white
                  dark:placeholder:text-[#666]

                  dark:focus:border-[#67e44e]
                "
              />
            </div>

            {/* OPTIONS */}

            <div className="max-h-64 overflow-y-auto p-2">
              {filteredResources.length ===
              0 ? (
                <div
                  className="
                    px-3
                    py-8
                    text-center
                    text-[11px]
                    text-[#888]
                  "
                >
                  No results found
                </div>
              ) : (
                filteredResources.map(
                  (resource) => {
                    const selected =
                      selectedIds.includes(
                        resource._id
                      )

                    return (
                      <button
                        type="button"
                        key={
                          resource._id
                        }
                        onClick={() =>
                          toggleResource(
                            resource._id
                          )
                        }
                        className={`
                          flex
                          w-full
                          items-center
                          gap-3
                          rounded-lg
                          px-3
                          py-2.5
                          text-left
                          transition

                          ${
                            selected
                              ? "bg-[#67e44e]/10"
                              : "hover:bg-[#f7f7f7] dark:hover:bg-[#202020]"
                          }
                        `}
                      >
                        {/* IMAGE */}

                        {resource.image ? (
                          <img
                            src={
                              resource.image
                            }
                            alt=""
                            className="
                              h-8
                              w-8
                              rounded-lg
                              object-cover
                            "
                          />
                        ) : (
                          <div
                            className="
                              flex
                              h-8
                              w-8
                              shrink-0
                              items-center
                              justify-center
                              rounded-lg
                              bg-[#f0f0f0]
                              text-[10px]
                              font-bold
                              text-[#777]

                              dark:bg-[#292929]
                              dark:text-[#999]
                            "
                          >
                            {resource.name
                              .charAt(
                                0
                              )
                              .toUpperCase()}
                          </div>
                        )}

                        {/* NAME */}

                        <span
                          className="
                            flex-1
                            text-[11px]
                            font-medium
                            text-[#333]

                            dark:text-[#ccc]
                          "
                        >
                          {resource.name}
                        </span>

                        {/* CHECK */}

                        <span
                          className={`
                            flex
                            h-5
                            w-5
                            items-center
                            justify-center
                            rounded-md
                            border
                            transition

                            ${
                              selected
                                ? "border-[#67e44e] bg-[#67e44e] text-[#111]"
                                : "border-[#d5d5d5] dark:border-[#444]"
                            }
                          `}
                        >
                          {selected && (
                            <Check
                              size={12}
                            />
                          )}
                        </span>
                      </button>
                    )
                  }
                )
              )}
            </div>

            {/* FOOTER */}

            <div
              className="
                flex
                items-center
                justify-between
                border-t
                border-[#eeeeee]
                px-3
                py-2.5

                dark:border-[#2a2a2a]
              "
            >
              <span className="text-[10px] text-[#888]">
                {selectedIds.length} selected
              </span>

              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  setSearch("")
                }}
                className="
                  rounded-lg
                  bg-[#67e44e]
                  px-3
                  py-1.5
                  text-[10px]
                  font-semibold
                  text-[#111]
                  transition
                  hover:bg-[#57d63f]
                "
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* =========================================================
   TOGGLE
========================================================= */

function ToggleCard({
  title,
  description,
  checked,
  onChange,
}: {
  title: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() =>
        onChange(!checked)
      }
      className="
        flex
        w-full
        items-center
        justify-between
        rounded-xl
        border
        border-[#e5e5e5]
        bg-[#fafafa]
        p-4
        text-left
        transition

        hover:border-[#ccc]
        hover:bg-white

        dark:border-[#2a2a2a]
        dark:bg-[#1c1c1c]
        dark:hover:border-[#3a3a3a]
        dark:hover:bg-[#202020]
      "
    >
      <div>
        <p
          className="
            text-[12px]
            font-semibold
            text-[#222]

            dark:text-white
          "
        >
          {title}
        </p>

        <p
          className="
            mt-1
            max-w-sm
            text-[10px]
            leading-4
            text-[#888]
          "
        >
          {description}
        </p>
      </div>

      <div
        className={`
          relative
          h-6
          w-11
          shrink-0
          rounded-full
          transition-colors

          ${
            checked
              ? "bg-[#67e44e]"
              : "bg-[#d4d4d4] dark:bg-[#333]"
          }
        `}
      >
        <div
          className={`
            absolute
            top-1
            h-4
            w-4
            rounded-full
            bg-white
            shadow-sm
            transition-all

            ${
              checked
                ? "left-6"
                : "left-1"
            }
          `}
        />
      </div>
    </button>
  )
}
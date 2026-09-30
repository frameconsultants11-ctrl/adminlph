"use client"

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import Link from "next/link"
import { useRouter } from "next/navigation"

import {
  BookOpen,
  CircleDollarSign,
  Clock3,
  FileText,
  ImageIcon,
  Layers3,
  Save,
  Search,
  Tag,
  Trash2,
} from "lucide-react"

import { apiFetch } from "@/lib/api-fetch"

import { uploadImage } from "@/lib/blob-upload"

import RichEditor, {
  type EditorData,
  type RichEditorHandle,
} from "@/components/RichEditor"

import BackButton from "./ui/BackButton"

import {
  Alert,
  Input,
  ResourceMultiSelect,
  Section,
  Select,
  ToggleCard,
} from "./utils/Alert"

type Category = {
  _id: string
  name: string
  image?: string
  isActive?: boolean
}

type Skill = {
  _id: string
  name: string
  image?: string
  isActive?: boolean
}

type Tool = {
  _id: string
  name: string
  image?: string
  isActive?: boolean
}

type CourseLevel =
  | "beginner"
  | "intermediate"
  | "advanced"

type DiscountType =
  | "percentage"
  | "amount"

type Course = {
  _id?: string

  name: string

  category: string

  image: string

  skills: string[]

  tools: string[]

  details: EditorData

  hours: number

  price: number

  discount: {
    type: DiscountType
    value: number
  }

  actualPrice: number

  level: CourseLevel

  seoTitle: string

  seoDescription: string

  isActive: boolean

  createdAt?: string

  updatedAt?: string
}

type CourseFormProps = {
  mode: "create" | "edit"

  courseId?: string

  course?: Course
}

/* =========================================================
   HELPERS
========================================================= */

function formatPrice(value: number) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }
  ).format(value)
}

function getErrorMessage(
  error: unknown,
  fallback: string
) {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message
  }

  return fallback
}

async function readApiResponse(
  response: Response
) {
  const data =
    await response
      .json()
      .catch(() => null)

  if (!response.ok) {
    throw new Error(
      data?.message ||
        `Request failed with status ${response.status}`
    )
  }

  return data
}

/* =========================================================
   COMPONENT
========================================================= */

export default function CourseForm({
  mode,
  courseId,
  course,
}: CourseFormProps) {
  const router = useRouter()

  console.log(courseId)

  const richEditorRef =
    useRef<RichEditorHandle | null>(
      null
    )

  const [editorReady, setEditorReady] =
    useState(false)

  /* =======================================================
     OPTIONS
  ======================================================= */

  const [categories, setCategories] =
    useState<Category[]>([])

  const [skills, setSkills] =
    useState<Skill[]>([])

  const [tools, setTools] =
    useState<Tool[]>([])

  /* =======================================================
     COURSE
  ======================================================= */

  const [loadedCourse, setLoadedCourse] =
    useState<Course | null>(
      course || null
    )

  /* =======================================================
     FORM
  ======================================================= */

  const [name, setName] =
    useState(
      course?.name || ""
    )

  const [category, setCategory] =
    useState(
      course?.category || ""
    )

  const [level, setLevel] =
    useState<CourseLevel>(
      course?.level ||
        "beginner"
    )

  /* =======================================================
     IMAGE
  ======================================================= */

  const [image, setImage] =
    useState<File | null>(null)

  const [imagePreview, setImagePreview] =
    useState(
      course?.image || ""
    )

  const [
    uploadingImage,
    setUploadingImage,
  ] = useState(false)

  /* =======================================================
     RELATIONS
  ======================================================= */

  const [
    selectedSkills,
    setSelectedSkills,
  ] = useState<string[]>(
    course?.skills || []
  )

  const [
    selectedTools,
    setSelectedTools,
  ] = useState<string[]>(
    course?.tools || []
  )

  /* =======================================================
     DURATION
  ======================================================= */

  const [hours, setHours] =
    useState(
      course?.hours?.toString() ||
        ""
    )

  /* =======================================================
     PRICE
  ======================================================= */

  const [price, setPrice] =
    useState(
      course?.price?.toString() ||
        ""
    )

  const [
    discountType,
    setDiscountType,
  ] = useState<DiscountType>(
    course?.discount?.type ||
      "percentage"
  )

  const [
    discountValue,
    setDiscountValue,
  ] = useState(
    course?.discount?.value?.toString() ||
      ""
  )

  /* =======================================================
     SEO
  ======================================================= */

  const [seoTitle, setSeoTitle] =
    useState(
      course?.seoTitle || ""
    )

  const [
    seoDescription,
    setSeoDescription,
  ] = useState(
    course?.seoDescription ||
      ""
  )

  /* =======================================================
     STATUS
  ======================================================= */

  const [
    isActive,
    setIsActive,
  ] = useState(
    course?.isActive ?? true
  )

  /* =======================================================
     UI
  ======================================================= */

  const [
    loadingOptions,
    setLoadingOptions,
  ] = useState(true)

  const [
    loadingCourse,
    setLoadingCourse,
  ] = useState(
    mode === "edit" &&
      !course
  )

  const [
    submitting,
    setSubmitting,
  ] = useState(false)

  const [error, setError] =
    useState("")

  /* =========================================================
     LOAD OPTIONS
  ========================================================= */

  useEffect(() => {
    let cancelled = false

    async function loadOptions() {
      try {
        setLoadingOptions(true)

        const [
          categoriesResponse,
          skillsResponse,
          toolsResponse,
        ] = await Promise.all([
          apiFetch(
            "/api/admin/categories?limit=100"
          ),

          apiFetch(
            "/api/admin/skills?limit=100"
          ),

          apiFetch(
            "/api/admin/tools?limit=100"
          ),
        ])

        const [
          categoriesData,
          skillsData,
          toolsData,
        ] = await Promise.all([
          readApiResponse(
            categoriesResponse
          ),

          readApiResponse(
            skillsResponse
          ),

          readApiResponse(
            toolsResponse
          ),
        ])

        if (cancelled) {
          return
        }

        setCategories(
          categoriesData?.data ||
            []
        )

        setSkills(
          skillsData?.data ||
            []
        )

        setTools(
          toolsData?.data ||
            []
        )
      } catch (error) {
        if (cancelled) {
          return
        }

        console.error(
          "LOAD COURSE OPTIONS ERROR:",
          error
        )

        setError(
          getErrorMessage(
            error,
            "Unable to load course options"
          )
        )
      } finally {
        if (!cancelled) {
          setLoadingOptions(
            false
          )
        }
      }
    }

    loadOptions()

    return () => {
      cancelled = true
    }
  }, [])

  /* =========================================================
     LOAD EDIT COURSE
  ========================================================= */

  useEffect(() => {
    if (
      mode !== "edit" ||
      course
    ) {
      return
    }

    if (!courseId) {
      setError(
        "Course ID is required"
      )

      setLoadingCourse(false)

      return
    }

    let cancelled = false

    async function loadCourse() {
      try {
        setLoadingCourse(true)

        const response =
          await apiFetch(
            `/api/admin/courses/${courseId}`
          )

        const data =
          await readApiResponse(
            response
          )

        if (cancelled) {
          return
        }

        const item =
          data.data as Course

        setLoadedCourse(item)

        setName(
          item.name || ""
        )

        setCategory(
          item.category || ""
        )

        setLevel(
          item.level ||
            "beginner"
        )

        setImagePreview(
          item.image || ""
        )

        setSelectedSkills(
          Array.isArray(
            item.skills
          )
            ? item.skills
            : []
        )

        setSelectedTools(
          Array.isArray(
            item.tools
          )
            ? item.tools
            : []
        )

        setHours(
          item.hours?.toString() ||
            ""
        )

        setPrice(
          item.price?.toString() ||
            ""
        )

        setDiscountType(
          item.discount?.type ||
            "percentage"
        )

        setDiscountValue(
          item.discount?.value?.toString() ||
            ""
        )

        setSeoTitle(
          item.seoTitle || ""
        )

        setSeoDescription(
          item.seoDescription ||
            ""
        )

        setIsActive(
          item.isActive ?? true
        )
      } catch (error) {
        if (cancelled) {
          return
        }

        console.error(
          "LOAD COURSE ERROR:",
          error
        )

        setError(
          getErrorMessage(
            error,
            "Unable to load course"
          )
        )
      } finally {
        if (!cancelled) {
          setLoadingCourse(
            false
          )
        }
      }
    }

    loadCourse()

    return () => {
      cancelled = true
    }
  }, [
    mode,
    course,
    courseId,
  ])

  /* =========================================================
     IMAGE SELECT
  ========================================================= */

  function handleImageChange(
    event:
      React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0]

    if (!file) {
      return
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ]

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      setError(
        "Only JPG, PNG and WEBP images are allowed"
      )

      event.target.value = ""

      return
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setError(
        "Image size must be less than 5MB"
      )

      event.target.value = ""

      return
    }

    setError("")

    setImage(file)

    if (
      imagePreview.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        imagePreview
      )
    }

    setImagePreview(
      URL.createObjectURL(
        file
      )
    )
  }

  /* =========================================================
     CLEANUP LOCAL PREVIEW
  ========================================================= */

  useEffect(() => {
    return () => {
      if (
        imagePreview.startsWith(
          "blob:"
        )
      ) {
        URL.revokeObjectURL(
          imagePreview
        )
      }
    }
  }, [imagePreview])

  /* =========================================================
     PRICE
  ========================================================= */

  const numericPrice =
    Number(price) || 0

  const numericDiscount =
    Number(discountValue) || 0

  const actualPrice =
    useMemo(() => {
      if (
        discountType ===
        "percentage"
      ) {
        const percentage =
          Math.min(
            Math.max(
              numericDiscount,
              0
            ),
            100
          )

        return Math.max(
          0,
          numericPrice -
            (numericPrice *
              percentage) /
              100
        )
      }

      return Math.max(
        0,
        numericPrice -
          numericDiscount
      )
    }, [
      numericPrice,
      numericDiscount,
      discountType,
    ])

  /* =========================================================
     DELETE BLOB
  ========================================================= */

  async function deleteBlob(
    url: string
  ) {
    if (
      !url ||
      !url.includes(
        ".blob.vercel-storage.com/"
      )
    ) {
      return
    }

    try {
      const response =
        await apiFetch(
          "/api/admin/upload/delete",
          {
            method: "DELETE",

            body: JSON.stringify({
              url,
            }),
          }
        )

      if (!response.ok) {
        console.error(
          "FAILED TO DELETE BLOB",
          await response
            .json()
            .catch(() => null)
        )
      }
    } catch (error) {
      console.error(
        "DELETE BLOB ERROR:",
        error
      )
    }
  }

  /* =========================================================
     SUBMIT
  ========================================================= */

  async function handleSubmit(
    event:
      React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (submitting) {
      return
    }

    setError("")

    /* -------------------------------------------------------
       NAME
    ------------------------------------------------------- */

    const cleanName =
      name.trim()

    if (!cleanName) {
      setError(
        "Course name is required"
      )

      return
    }

    /* -------------------------------------------------------
       CATEGORY
    ------------------------------------------------------- */

    if (!category) {
      setError(
        "Please select a category"
      )

      return
    }

    /* -------------------------------------------------------
       IMAGE
    ------------------------------------------------------- */

    if (
      mode === "create" &&
      !image
    ) {
      setError(
        "Course image is required"
      )

      return
    }

    /* -------------------------------------------------------
       HOURS
    ------------------------------------------------------- */

    const hoursNumber =
      Number(hours)

    if (
      !Number.isFinite(
        hoursNumber
      ) ||
      hoursNumber <= 0
    ) {
      setError(
        "Course hours must be greater than 0"
      )

      return
    }

    /* -------------------------------------------------------
       PRICE
    ------------------------------------------------------- */

    const priceNumber =
      Number(price)

    if (
      !Number.isFinite(
        priceNumber
      ) ||
      priceNumber < 0
    ) {
      setError(
        "Enter a valid course price"
      )

      return
    }

    /* -------------------------------------------------------
       DISCOUNT
    ------------------------------------------------------- */

    const discountNumber =
      Number(discountValue) ||
      0

    if (
      discountNumber < 0
    ) {
      setError(
        "Discount cannot be negative"
      )

      return
    }

    if (
      discountType ===
        "percentage" &&
      discountNumber > 100
    ) {
      setError(
        "Percentage discount cannot exceed 100%"
      )

      return
    }

    if (
      discountType ===
        "amount" &&
      discountNumber >
        priceNumber
    ) {
      setError(
        "Discount cannot exceed course price"
      )

      return
    }

    /* -------------------------------------------------------
       SEO
    ------------------------------------------------------- */

    const cleanSeoTitle =
      seoTitle.trim()

    const cleanSeoDescription =
      seoDescription.trim()

    if (!cleanSeoTitle) {
      setError(
        "SEO title is required"
      )

      return
    }

    if (
      cleanSeoTitle.length >
      60
    ) {
      setError(
        "SEO title cannot exceed 60 characters"
      )

      return
    }

    if (
      !cleanSeoDescription
    ) {
      setError(
        "SEO description is required"
      )

      return
    }

    if (
      cleanSeoDescription.length >
      160
    ) {
      setError(
        "SEO description cannot exceed 160 characters"
      )

      return
    }

    /* -------------------------------------------------------
       EDITOR
    ------------------------------------------------------- */

    if (
      !richEditorRef.current
    ) {
      setError(
        "Editor is not ready yet"
      )

      return
    }

    let newUploadedImage:
      string | null = null

    try {
      setSubmitting(true)

      /* -----------------------------------------------------
         EDITOR SAVE
      ----------------------------------------------------- */

      const details =
        await richEditorRef.current.save()

      if (
        !details ||
        !Array.isArray(
          details.blocks
        )
      ) {
        throw new Error(
          "Unable to save course content"
        )
      }

      /* -----------------------------------------------------
         IMAGE UPLOAD
      ----------------------------------------------------- */

      let imageUrl =
        loadedCourse?.image ||
        course?.image ||
        ""

      if (image) {
        setUploadingImage(true)

        const blob =
          await uploadImage(
            image,
            "courses"
          )

        imageUrl =
          blob.url

        newUploadedImage =
          blob.url

        setUploadingImage(false)
      }

      if (!imageUrl) {
        throw new Error(
          "Course image is required"
        )
      }

      /* -----------------------------------------------------
         FORM DATA
      ----------------------------------------------------- */

      const formData =
        new FormData()

      formData.append(
        "name",
        cleanName
      )

      formData.append(
        "category",
        category
      )

      formData.append(
        "skills",
        JSON.stringify(
          selectedSkills
        )
      )

      formData.append(
        "tools",
        JSON.stringify(
          selectedTools
        )
      )

      formData.append(
        "details",
        JSON.stringify(
          details
        )
      )

      formData.append(
        "hours",
        String(
          hoursNumber
        )
      )

      formData.append(
        "price",
        String(
          priceNumber
        )
      )

      formData.append(
        "discountType",
        discountType
      )

      formData.append(
        "discountValue",
        String(
          discountNumber
        )
      )

      formData.append(
        "level",
        level
      )

      formData.append(
        "seoTitle",
        cleanSeoTitle
      )

      formData.append(
        "seoDescription",
        cleanSeoDescription
      )

      formData.append(
        "isActive",
        String(
          isActive
        )
      )

      /*
       * IMPORTANT:
       * Only URL is sent to Course API.
       */

      formData.append(
        "image",
        imageUrl
      )

      /* -----------------------------------------------------
         API
      ----------------------------------------------------- */

      let endpoint =
        "/api/admin/courses"

      let method:
        | "POST"
        | "PATCH" =
        "POST"

      let oldImage =
        ""

      if (
        mode === "edit"
      ) {
        const id =
          course?._id ||
          loadedCourse?._id ||
          courseId

        if (!id) {
          throw new Error(
            "Course ID is missing"
          )
        }

        endpoint =
          `/api/admin/courses/${id}`

        method = "PATCH"

        oldImage =
          loadedCourse?.image ||
          course?.image ||
          ""
      }

      /* -----------------------------------------------------
         SAVE COURSE
      ----------------------------------------------------- */

      const response =
        await apiFetch(
          endpoint,
          {
            method,
            body: formData,
          }
        )

      const data =
        await readApiResponse(
          response
        )

      /* -----------------------------------------------------
         DELETE OLD IMAGE
         ONLY AFTER COURSE UPDATE SUCCEEDS
      ----------------------------------------------------- */

      if (
        mode === "edit" &&
        image &&
        oldImage &&
        oldImage !== imageUrl
      ) {
        await deleteBlob(
          oldImage
        )
      }

      console.log(
        "COURSE SAVED:",
        data
      )

      router.push(
        "/courses"
      )

      router.refresh()
    } catch (error) {
      console.error(
        "SAVE COURSE ERROR:",
        error
      )

      /*
       * If Blob upload succeeded but
       * Course API failed, remove the
       * newly uploaded orphan image.
       */

      if (
        newUploadedImage
      ) {
        await deleteBlob(
          newUploadedImage
        )
      }

      setError(
        getErrorMessage(
          error,
          "Unable to save course"
        )
      )
    } finally {
      setUploadingImage(
        false
      )

      setSubmitting(false)
    }
  }

  /* =========================================================
     LOADING
  ========================================================= */

  if (
    loadingOptions ||
    loadingCourse
  ) {
    return (
      <div className="flex min-h-[500px] items-center justify-center bg-[#fafafa] dark:bg-[#111]">
        <div className="text-center">

          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#ddd] border-t-[#67e44e] dark:border-[#333] dark:border-t-[#67e44e]" />

          <p className="mt-3 text-[11px] text-[#777] dark:text-[#888]">
            Loading course...
          </p>

        </div>
      </div>
    )
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="min-h-screen bg-[#fafafa] dark:bg-[#111]"
    >

      <div className="px-4 py-6 sm:px-6 lg:px-8">

        {/* HEADER */}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <BackButton />

            <h1 className="mt-3 text-xl font-bold text-[#181818] dark:text-white sm:text-2xl">
              {mode === "create"
                ? "Create Course"
                : "Edit Course"}
            </h1>

            <p className="mt-1 text-[11px] text-[#777] dark:text-[#888]">
              {mode === "create"
                ? "Create a new course."
                : "Update the course information, content and pricing."}
            </p>

          </div>

          <button
            type="submit"
            disabled={
              submitting ||
              !editorReady
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#67e44e] px-5 text-[11px] font-semibold text-[#111] transition hover:bg-[#57d63f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={14} />

            {uploadingImage
              ? "Uploading image..."
              : submitting
                ? "Saving..."
                : mode === "create"
                  ? "Create Course"
                  : "Save Changes"}
          </button>

        </div>

        {/* ERROR */}

        {error && (
          <div className="mb-5">
            <Alert
              message={error}
              onClose={() =>
                setError("")
              }
            />
          </div>
        )}

        <div className="space-y-5">

          {/* BASIC */}

          <Section
            icon={
              <BookOpen
                size={17}
              />
            }
            title="Basic Information"
            description="Basic information about the course."
          >

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

              <div className="md:col-span-2">
                <Input
                  label="Course Name"
                  value={name}
                  onChange={setName}
                  placeholder="e.g. Full Stack Development"
                />
              </div>

              <Select
                label="Category"
                value={category}
                onChange={
                  setCategory
                }
                options={[
                  {
                    value: "",
                    label:
                      "Select category",
                  },

                  ...categories.map(
                    (item) => ({
                      value:
                        item._id,
                      label:
                        item.name,
                    })
                  ),
                ]}
              />

              <Select
                label="Level"
                value={level}
                onChange={(
                  value
                ) =>
                  setLevel(
                    value as CourseLevel
                  )
                }
                options={[
                  {
                    value:
                      "beginner",
                    label:
                      "Beginner",
                  },

                  {
                    value:
                      "intermediate",
                    label:
                      "Intermediate",
                  },

                  {
                    value:
                      "advanced",
                    label:
                      "Advanced",
                  },
                ]}
              />

            </div>

          </Section>

          {/* IMAGE */}

          <Section
            icon={
              <ImageIcon
                size={17}
              />
            }
            title="Course Image"
            description="Upload the primary course image. JPG, PNG and WEBP are supported."
          >

            <div className="grid gap-5 lg:grid-cols-[300px_1fr]">

              <div className="relative aspect-video overflow-hidden rounded-xl border border-[#ddd] bg-[#f7f7f7] dark:border-[#333] dark:bg-[#181818]">

                {imagePreview ? (
                  <img
                    src={
                      imagePreview
                    }
                    alt={
                      name ||
                      "Course"
                    }
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">

                    <div className="text-center">

                      <ImageIcon
                        size={26}
                        className="mx-auto text-[#aaa] dark:text-[#555]"
                      />

                      <p className="mt-2 text-[10px] text-[#999]">
                        No image selected
                      </p>

                    </div>

                  </div>
                )}

              </div>

              <div className="flex flex-col justify-center">

                <label className="mb-2 block text-[11px] font-medium text-[#444] dark:text-[#bbb]">
                  Course Image
                </label>

                <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-[#ccc] bg-white px-5 py-8 transition hover:border-[#67e44e] hover:bg-[#67e44e]/5 dark:border-[#3a3a3a] dark:bg-[#1c1c1c] dark:hover:border-[#67e44e]">

                  <div className="text-center">

                    <ImageIcon
                      size={22}
                      className="mx-auto text-[#777] dark:text-[#888]"
                    />

                    <p className="mt-2 text-[11px] font-semibold text-[#444] dark:text-[#ddd]">
                      {image
                        ? image.name
                        : "Choose course image"}
                    </p>

                    <p className="mt-1 text-[10px] text-[#999]">
                      JPG, PNG or WEBP · Max 5MB
                    </p>

                  </div>

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={
                      handleImageChange
                    }
                    className="hidden"
                  />

                </label>

                {mode === "edit" &&
                  !image && (
                    <p className="mt-2 text-[10px] text-[#888]">
                      Existing image will
                      be kept unless you
                      choose a new one.
                    </p>
                  )}

              </div>

            </div>

          </Section>

          {/* SKILLS */}

          <ResourceMultiSelect
            title="Skills"
            label="Course Skills"
            resources={skills}
            selectedIds={
              selectedSkills
            }
            onChange={
              setSelectedSkills
            }
            placeholder="Select skills"
          />

          {/* TOOLS */}

          <ResourceMultiSelect
            title="Tools"
            label="Course Tools"
            resources={tools}
            selectedIds={
              selectedTools
            }
            onChange={
              setSelectedTools
            }
            placeholder="Select tools"
          />

          {/* EDITOR */}

          <Section
            icon={
              <FileText
                size={17}
              />
            }
            title="Course Details"
            description="Add course description, curriculum, headings, lists, images and other content."
          >

            <div className="overflow-hidden rounded-xl border border-[#ddd] bg-white dark:border-[#333] dark:bg-[#202020]">

              <RichEditor
                ref={
                  richEditorRef
                }
                initialData={
                  loadedCourse?.details
                }
                placeholder="Write detailed course content..."
                onReady={() =>
                  setEditorReady(
                    true
                  )
                }
              />

            </div>

          </Section>

          {/* DURATION */}

          <Section
            icon={
              <Clock3
                size={17}
              />
            }
            title="Course Duration"
            description="Set the total learning duration."
          >

            <div className="max-w-md">

              <Input
                label="Total Hours"
                type="number"
                value={hours}
                onChange={setHours}
                placeholder="120"
              />

            </div>

          </Section>

          {/* PRICING */}

          <Section
            icon={
              <CircleDollarSign
                size={17}
              />
            }
            title="Pricing"
            description="Set course price and discount."
          >

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">

              <Input
                label="Original Price"
                type="number"
                min="0"
                value={price}
                onChange={setPrice}
                placeholder="50000"
              />

              <Select
                label="Discount Type"
                value={
                  discountType
                }
                onChange={(
                  value
                ) =>
                  setDiscountType(
                    value as DiscountType
                  )
                }
                options={[
                  {
                    value:
                      "percentage",
                    label:
                      "Percentage",
                  },

                  {
                    value:
                      "amount",
                    label:
                      "Fixed Amount",
                  },
                ]}
              />

              <Input
                label={
                  discountType ===
                  "percentage"
                    ? "Discount (%)"
                    : "Discount Amount"
                }
                type="number"
                min="0"
                value={
                  discountValue
                }
                onChange={
                  setDiscountValue
                }
                placeholder={
                  discountType ===
                  "percentage"
                    ? "20"
                    : "10000"
                }
              />

            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">

              <PriceBox
                label="Original Price"
                value={
                  formatPrice(
                    numericPrice
                  )
                }
              />

              <PriceBox
                label="Discount"
                value={
                  discountType ===
                  "percentage"
                    ? `${numericDiscount}%`
                    : formatPrice(
                        numericDiscount
                      )
                }
              />

              <PriceBox
                label="Final Price"
                value={
                  formatPrice(
                    actualPrice
                  )
                }
                highlighted
              />

            </div>

          </Section>

          {/* SEO */}

          <Section
            icon={
              <Search
                size={17}
              />
            }
            title="SEO"
            description="Configure how the course appears in search results."
          >

            <div className="space-y-5">

              <div>

                <Input
                  label="SEO Title"
                  value={
                    seoTitle
                  }
                  onChange={
                    setSeoTitle
                  }
                  placeholder="Full Stack Development Course | Learn Per Hour"
                />

                <div className="mt-1.5 flex items-center justify-between">

                  <span className="text-[10px] text-[#888]">
                    Recommended maximum
                    60 characters.
                  </span>

                  <span
                    className={`text-[10px] ${
                      seoTitle.length >
                      60
                        ? "font-semibold text-red-500"
                        : "text-[#888]"
                    }`}
                  >
                    {
                      seoTitle.length
                    }
                    /60
                  </span>

                </div>

              </div>

              <div>

                <label className="mb-2 block text-[11px] font-medium text-[#444] dark:text-[#bbb]">
                  SEO Description
                </label>

                <textarea
                  value={
                    seoDescription
                  }
                  onChange={(
                    event
                  ) =>
                    setSeoDescription(
                      event.target
                        .value
                    )
                  }
                  rows={4}
                  placeholder="Learn full stack development through practical projects and expert-led training."
                  className="w-full resize-none rounded-xl border border-[#dedede] bg-white px-3.5 py-3 text-[12px] text-[#222] outline-none transition placeholder:text-[#aaa] focus:border-[#67e44e] focus:ring-2 focus:ring-[#67e44e]/10 dark:border-[#333] dark:bg-[#202020] dark:text-white dark:placeholder:text-[#666]"
                />

                <div className="mt-1.5 flex items-center justify-between">

                  <span className="text-[10px] text-[#888]">
                    Recommended maximum
                    160 characters.
                  </span>

                  <span
                    className={`text-[10px] ${
                      seoDescription.length >
                      160
                        ? "font-semibold text-red-500"
                        : "text-[#888]"
                    }`}
                  >
                    {
                      seoDescription.length
                    }
                    /160
                  </span>

                </div>

              </div>

              {/* SEARCH PREVIEW */}

              <div className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-4 dark:border-[#2f2f2f] dark:bg-[#181818]">

                <div className="mb-3 flex items-center gap-2">

                  <Tag
                    size={13}
                    className="text-[#777]"
                  />

                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[#888]">
                    Search Preview
                  </span>

                </div>

                <p className="truncate text-[16px] font-medium text-[#1a0dab] dark:text-[#79a7ff]">
                  {seoTitle ||
                    name ||
                    "Course Title"}
                </p>

                <p className="mt-1 text-[11px] text-[#168039] dark:text-[#68b77c]">
                  learnperhour.com
                </p>

                <p className="mt-1 max-w-3xl text-[11px] leading-5 text-[#555] dark:text-[#999]">
                  {seoDescription ||
                    "Your SEO description will appear here."}
                </p>

              </div>

            </div>

          </Section>

          {/* STATUS */}

          <Section
            icon={
              <Layers3
                size={17}
              />
            }
            title="Publishing"
            description="Control whether this course is available."
          >

            <ToggleCard
              title="Active Course"
              description={
                isActive
                  ? "The course is currently active."
                  : "The course is currently inactive."
              }
              checked={
                isActive
              }
              onChange={
                setIsActive
              }
            />

          </Section>

          {/* ACTIONS */}

          <div className="flex flex-col-reverse gap-3 border-t border-[#e5e5e5] pt-6 dark:border-[#292929] sm:flex-row sm:justify-end">

            <Link
              href="/admin/courses"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-[#ddd] bg-white px-6 text-[11px] font-semibold text-[#555] transition hover:bg-[#f7f7f7] dark:border-[#333] dark:bg-[#202020] dark:text-[#ccc] dark:hover:bg-[#292929]"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={
                submitting ||
                !editorReady
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#67e44e] px-6 text-[11px] font-semibold text-[#111] transition hover:bg-[#57d63f] disabled:cursor-not-allowed disabled:opacity-50"
            >

              <Save
                size={14}
              />

              {uploadingImage
                ? "Uploading image..."
                : submitting
                  ? "Saving..."
                  : mode ===
                      "create"
                    ? "Create Course"
                    : "Save Changes"}

            </button>

          </div>

        </div>

      </div>

    </form>
  )
}

/* =========================================================
   PRICE BOX
========================================================= */

function PriceBox({
  label,
  value,
  highlighted = false,
}: {
  label: string
  value: string
  highlighted?: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlighted
          ? "border-[#67e44e]/40 bg-[#67e44e]/5 dark:border-[#67e44e]/30 dark:bg-[#67e44e]/5"
          : "border-[#e5e5e5] bg-[#fafafa] dark:border-[#2f2f2f] dark:bg-[#181818]"
      }`}
    >

      <p className="text-[10px] text-[#888]">
        {label}
      </p>

      <p
        className={`mt-1 text-lg font-bold ${
          highlighted
            ? "text-[#48b934] dark:text-[#67e44e]"
            : "text-[#181818] dark:text-white"
        }`}
      >
        {value}
      </p>

    </div>
  )
}
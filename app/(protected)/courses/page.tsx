"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

import { apiFetch } from "@/lib/api-fetch"
import { MonitorDot, SearchIcon } from "lucide-react"
import AuthInput from "@/components/auth/AuthInput"

type Course = {
  _id: string
  name: string
  category: string
  image: string
  skills: string[]
  tools: string[]

  details: {
    time?: number
    version?: string
    blocks: {
      id?: string
      type: string
      data: Record<string, unknown>
    }[]
  }

  hours: number
  price: number

  discount: {
    type: "percentage" | "amount"
    value: number
  }

  actualPrice: number

  level: "beginner" | "intermediate" | "advanced"

  isActive: boolean

  createdAt: string
  updatedAt: string
}

type Category = {
  _id: string
  name: string
}

/*
|--------------------------------------------------------------------------
| Request deduplication
|--------------------------------------------------------------------------
|
| React StrictMode can execute effects twice during development.
| We keep identical requests in-flight so two components/effects don't
| create two identical API requests.
|
*/

type CoursesResponse = {
  data?: Course[]
  pagination?: {
    total?: number
    totalPages?: number
  }
}

type CategoriesResponse = {
  data?: Category[]
}

const coursesRequests = new Map<
  string,
  Promise<CoursesResponse>
>()

const categoriesRequests = new Map<
  string,
  Promise<CategoriesResponse>
>()

function fetchCourses(
  url: string
): Promise<CoursesResponse> {
  const existing = coursesRequests.get(url)

  if (existing) {
    return existing
  }

  const request = (async () => {
    try {
      const response = await apiFetch(url)

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to load courses"
        )
      }

      return data
    } finally {
      coursesRequests.delete(url)
    }
  })()

  coursesRequests.set(url, request)

  return request
}

function fetchCategories(
  url: string
): Promise<CategoriesResponse> {
  const existing = categoriesRequests.get(url)

  if (existing) {
    return existing
  }

  const request = (async () => {
    try {
      const response = await apiFetch(url)

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to load categories"
        )
      }

      return data
    } finally {
      categoriesRequests.delete(url)
    }
  })()

  categoriesRequests.set(url, request)

  return request
}

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)
}

function getLevelClass(level: Course["level"]) {
  switch (level) {
    case "beginner":
      return "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"

    case "intermediate":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400"

    case "advanced":
      return "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"

    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
  }
}

/*
|--------------------------------------------------------------------------
| Page
|--------------------------------------------------------------------------
*/

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")
  const [level, setLevel] = useState("")
  const [status, setStatus] = useState("")

  const [page, setPage] = useState(1)

  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const limit = 10

  /*
  |--------------------------------------------------------------------------
  | Load categories
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    let mounted = true

    async function loadCategories() {
      try {
        const data = await fetchCategories(
          "/api/admin/categories?limit=100"
        )

        if (!mounted) return

        setCategories(data.data || [])
      } catch (error) {
        console.error(
          "LOAD CATEGORIES ERROR:",
          error
        )
      }
    }

    loadCategories()

    return () => {
      mounted = false
    }
  }, [])

  /*
  |--------------------------------------------------------------------------
  | Load courses
  |--------------------------------------------------------------------------
  |
  | IMPORTANT:
  |
  | This is now the ONLY place that loads courses.
  |
  | Search, category, level, status and page all come
  | through this same effect.
  |
  */

  useEffect(() => {
    let mounted = true

    const timer = setTimeout(async () => {
      try {
        setLoading(true)

        const params = new URLSearchParams()

        params.set("page", String(page))
        params.set("limit", String(limit))

        if (search.trim()) {
          params.set("search", search.trim())
        }

        if (category) {
          params.set("category", category)
        }

        if (level) {
          params.set("level", level)
        }

        if (status) {
          params.set("isActive", status)
        }

        const url = `/api/admin/courses?${params.toString()}`

        const data = await fetchCourses(url)

        if (!mounted) return

        setCourses(data.data || [])

        setTotal(data.pagination?.total || 0)

        setTotalPages(
          data.pagination?.totalPages || 1
        )
      } catch (error) {
        if (!mounted) return

        console.error(
          "LOAD COURSES ERROR:",
          error
        )
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }, 400)

    return () => {
      mounted = false
      clearTimeout(timer)
    }
  }, [
    page,
    category,
    level,
    status,
    search,
  ])

  /*
  |--------------------------------------------------------------------------
  | Category lookup
  |--------------------------------------------------------------------------
  */

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>()

    categories.forEach((item) => {
      map.set(item._id, item.name)
    })

    return map
  }, [categories])

  /*
  |--------------------------------------------------------------------------
  | Delete
  |--------------------------------------------------------------------------
  */

  async function handleDelete(course: Course) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${course.name}"?`
    )

    if (!confirmed) return

    try {
      setDeletingId(course._id)

      const response = await apiFetch(
        `/api/admin/courses/${course._id}`,
        {
          method: "DELETE",
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to delete course"
        )
      }

      /*
       * Instead of calling loadCourses() here,
       * update the current list locally.
       *
       * This prevents an unnecessary second API request.
       */

      setCourses((current) =>
        current.filter(
          (item) => item._id !== course._id
        )
      )

      setTotal((current) =>
        Math.max(0, current - 1)
      )
    } catch (error) {
      console.error(
        "DELETE COURSE ERROR:",
        error
      )

      alert(
        error instanceof Error
          ? error.message
          : "Failed to delete course"
      )
    } finally {
      setDeletingId(null)
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Reset filters
  |--------------------------------------------------------------------------
  */

  function resetFilters() {
    setSearch("")
    setCategory("")
    setLevel("")
    setStatus("")
    setPage(1)
  }

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-screen bg-gray-50 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 sm:p-6 lg:p-8">
      <div className="">

        {/* Header */}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Courses
            </h1>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage courses, pricing, categories and
              course content.
            </p>
          </div>

          <Link
            href="/admin/courses/create"
            className="inline-flex items-center justify-center rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            + Create Course
          </Link>
        </div>

        {/* Filters */}

        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">

            {/* Search */}

            <div className="lg:col-span-2">
              <AuthInput
              leftIcon={<SearchIcon size={16}/>}
                type="text"
                placeholder="Search courses..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className=" w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-black focus:ring-1 focus:ring-black dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-white dark:focus:ring-white"
              />
            </div>

            {/* Category */}

            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value)
                setPage(1)
              }}
              className="h-9.5 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-black dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:border-white"
            >
              <option value="">
                All Categories
              </option>

              {categories.map((item) => (
                <option
                  key={item._id}
                  value={item._id}
                >
                  {item.name}
                </option>
              ))}
            </select>

            {/* Level */}

            <select
              value={level}
              onChange={(e) => {
                setLevel(e.target.value)
                setPage(1)
              }}
              className="h-9.5 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-black dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:border-white"
            >
              <option value="">
                All Levels
              </option>

              <option value="beginner">
                Beginner
              </option>

              <option value="intermediate">
                Intermediate
              </option>

              <option value="advanced">
                Advanced
              </option>
            </select>

            {/* Status */}

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
              className="h-9.5 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-black dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:border-white"
            >
              <option value="">
                All Status
              </option>

              <option value="true">
                Active
              </option>

              <option value="false">
                Inactive
              </option>
            </select>
          </div>

          {/* Reset */}

          {(search ||
            category ||
            level ||
            status) && (
            <div className="mt-3">
              <button
                type="button"
                onClick={resetFilters}
                className="text-sm font-medium text-gray-600 transition hover:text-black dark:text-gray-400 dark:hover:text-white"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Stats */}

        <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          {loading
            ? "Loading courses..."
            : `${total} course${
                total === 1 ? "" : "s"
              } found`}
        </div>

        {/* Loading */}

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-gray-300 border-t-black dark:border-gray-700 dark:border-t-white" />

            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Loading courses...
            </p>
          </div>
        ) : courses.length === 0 ? (

          /* Empty */

          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-900">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-2xl dark:bg-gray-800">
              <MonitorDot
              
              />
            </div>

            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
              No courses found
            </h3>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Create your first course or change
              your filters.
            </p>

            <Link
              href="/courses/create"
              className="mt-5 inline-flex rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
            >
              Create Course
            </Link>
          </div>

        ) : (

          /* Table */

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">

                <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Course
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Category
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Level
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Duration
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Price
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Status
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">

                  {courses.map((course) => (
                    <tr
                      key={course._id}
                      className="transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >

                      {/* Course */}

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">

                          <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                            {course.image ? (
                              <img
                                src={course.image}
                                alt={course.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs text-gray-400 dark:text-gray-500">
                                No image
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-semibold text-gray-900 dark:text-white">
                              {course.name}
                            </p>

                            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <span>
                                {course.skills?.length || 0}{" "}
                                skills
                              </span>

                              <span>•</span>

                              <span>
                                {course.tools?.length || 0}{" "}
                                tools
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}

                      <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {categoryMap.get(course.category) ||
                          "—"}
                      </td>

                      {/* Level */}

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${getLevelClass(
                            course.level
                          )}`}
                        >
                          {course.level}
                        </span>
                      </td>

                      {/* Duration */}

                      <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {course.hours}{" "}
                        {course.hours === 1
                          ? "hour"
                          : "hours"}
                      </td>

                      {/* Price */}

                      <td className="px-5 py-4">
                        <div className="flex flex-col">

                          <span className="font-semibold text-gray-900 dark:text-white">
                            {formatPrice(
                              course.actualPrice
                            )}
                          </span>

                          {course.discount?.value > 0 && (
                            <div className="flex items-center gap-2">

                              <span className="text-xs text-gray-400 line-through dark:text-gray-500">
                                {formatPrice(
                                  course.price
                                )}
                              </span>

                              <span className="text-xs font-medium text-green-600 dark:text-green-400">
                                {course.discount.type ===
                                "percentage"
                                  ? `${course.discount.value}% OFF`
                                  : `${formatPrice(
                                      course.discount.value
                                    )} OFF`}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            course.isActive
                              ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }`}
                        >
                          {course.isActive
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>

                      {/* Actions */}

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">

                          <Link
                            href={`/courses/${course._id}`}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                          >
                            Edit
                          </Link>

                          <button
                            type="button"
                            disabled={
                              deletingId ===
                              course._id
                            }
                            onClick={() =>
                              handleDelete(course)
                            }
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                          >
                            {deletingId ===
                            course._id
                              ? "Deleting..."
                              : "Delete"}
                          </button>

                        </div>
                      </td>
                    </tr>
                  ))}

                </tbody>
              </table>
            </div>

            {/* Pagination */}

            <div className="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">

              <p className="text-sm text-gray-500 dark:text-gray-400">
                Page {page} of {totalPages}
              </p>

              <div className="flex items-center gap-2">

                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() =>
                    setPage((value) =>
                      Math.max(1, value - 1)
                    )
                  }
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Previous
                </button>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() =>
                    setPage((value) =>
                      Math.min(
                        totalPages,
                        value + 1
                      )
                    )
                  }
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Next
                </button>

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
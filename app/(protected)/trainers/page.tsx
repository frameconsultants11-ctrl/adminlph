"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import Link from "next/link"

import {
  Search,
  Plus,
  Pencil,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Clock,
  Eye,
  SlidersHorizontal,
  X,
  RotateCcw,
  GraduationCap,
  Award,
  Wrench,
  BookOpen,
  BriefcaseBusiness,
  IndianRupee,
} from "lucide-react"

import { apiFetch } from "@/lib/api-fetch"
import BackButton from "@/components/ui/BackButton"

type Trainer = {
  _id: string

  name: string
  email: string
  phone: string

  image: string

  about?: string

  isActive: boolean
  isAvailable: boolean

  hourlyRate: number

  certifications: string[]
  education: any[]
  experience: any[]

  toolsTeach: string[]
  skills: string[]
  courses: string[]

  createdAt: string
  updatedAt: string
}

type Resource = {
  _id: string
  name: string
  image?: string
  isActive?: boolean
}

type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function TrainersPage() {
  const [trainers, setTrainers] =
    useState<Trainer[]>([])

  const [pagination, setPagination] =
    useState<Pagination>({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    })

  const [search, setSearch] =
    useState("")

  const [activeFilter, setActiveFilter] =
    useState("")

  const [availableFilter, setAvailableFilter] =
    useState("")

  const [courseFilter, setCourseFilter] =
    useState("")

  const [certificationFilter, setCertificationFilter] =
    useState("")

  const [skillFilter, setSkillFilter] =
    useState("")

  const [toolFilter, setToolFilter] =
    useState("")

  const [educationLevel, setEducationLevel] =
    useState("")

  const [currentEducation, setCurrentEducation] =
    useState("")

  const [currentExperience, setCurrentExperience] =
    useState("")

  const [minRate, setMinRate] =
    useState("")

  const [maxRate, setMaxRate] =
    useState("")

  const [sort, setSort] =
    useState("newest")

  const [showFilters, setShowFilters] =
    useState(false)

  const [tools, setTools] =
    useState<Resource[]>([])

  const [skills, setSkills] =
    useState<Resource[]>([])

  const [certifications, setCertifications] =
    useState<Resource[]>([])

  const [courses, setCourses] =
    useState<Resource[]>([])

  const [loading, setLoading] =
    useState(true)

  const [resourcesLoading, setResourcesLoading] =
    useState(true)

  const [error, setError] =
    useState("")

  const [actionLoading, setActionLoading] =
    useState<string | null>(null)

  /* =========================
     ACTIVE FILTER COUNT
  ========================= */

  const filterCount = useMemo(() => {
    return [
      activeFilter,
      availableFilter,
      courseFilter,
      certificationFilter,
      skillFilter,
      toolFilter,
      educationLevel,
      currentEducation,
      currentExperience,
      minRate,
      maxRate,
    ].filter(Boolean).length
  }, [
    activeFilter,
    availableFilter,
    courseFilter,
    certificationFilter,
    skillFilter,
    toolFilter,
    educationLevel,
    currentEducation,
    currentExperience,
    minRate,
    maxRate,
  ])

  /* =========================
     LOAD RESOURCES
  ========================= */

  useEffect(() => {
    async function loadResources() {
      try {
        setResourcesLoading(true)

        const [
          toolsResponse,
          skillsResponse,
          certificationResponse,
          coursesResponse,
        ] = await Promise.all([
          apiFetch(
            "/api/admin/tools?limit=100"
          ),

          apiFetch(
            "/api/admin/skills?limit=100"
          ),

          apiFetch(
            "/api/admin/certifications?limit=100"
          ),

          apiFetch(
            "/api/admin/courses?limit=100"
          ),
        ])

        const [
          toolsData,
          skillsData,
          certificationData,
          coursesData,
        ] = await Promise.all([
          toolsResponse.json(),
          skillsResponse.json(),
          certificationResponse.json(),
          coursesResponse.json(),
        ])

        if (toolsResponse.ok) {
          setTools(
            toolsData.data || []
          )
        }

        if (skillsResponse.ok) {
          setSkills(
            skillsData.data || []
          )
        }

        if (
          certificationResponse.ok
        ) {
          setCertifications(
            certificationData.data || []
          )
        }

        if (coursesResponse.ok) {
          setCourses(
            coursesData.data || []
          )
        }
      } catch (error) {
        console.error(
          "RESOURCE LOAD ERROR:",
          error
        )
      } finally {
        setResourcesLoading(false)
      }
    }

    loadResources()
  }, [])

  /* =========================
     FETCH TRAINERS
  ========================= */

  const fetchTrainers =
    useCallback(
      async (
        page = 1
      ) => {
        try {
          setLoading(true)
          setError("")

          const params =
            new URLSearchParams()

          params.set(
            "page",
            String(page)
          )

          params.set(
            "limit",
            String(pagination.limit)
          )

          if (
            search.trim()
          ) {
            params.set(
              "search",
              search.trim()
            )
          }

          if (activeFilter) {
            params.set(
              "isActive",
              activeFilter
            )
          }

          if (
            availableFilter
          ) {
            params.set(
              "isAvailable",
              availableFilter
            )
          }

          if (courseFilter) {
            params.set(
              "course",
              courseFilter
            )
          }

          if (
            certificationFilter
          ) {
            params.set(
              "certification",
              certificationFilter
            )
          }

          if (skillFilter) {
            params.set(
              "skill",
              skillFilter
            )
          }

          if (toolFilter) {
            params.set(
              "tool",
              toolFilter
            )
          }

          if (educationLevel) {
            params.set(
              "educationLevel",
              educationLevel
            )
          }

          if (
            currentEducation
          ) {
            params.set(
              "currentEducation",
              currentEducation
            )
          }

          if (
            currentExperience
          ) {
            params.set(
              "currentExperience",
              currentExperience
            )
          }

          if (minRate) {
            params.set(
              "minRate",
              minRate
            )
          }

          if (maxRate) {
            params.set(
              "maxRate",
              maxRate
            )
          }

          if (sort) {
            params.set(
              "sort",
              sort
            )
          }

          const response =
            await apiFetch(
              `/api/admin/trainers?${params.toString()}`
            )

          const data =
            await response.json()

          if (!response.ok) {
            throw new Error(
              data.message ||
                "Unable to load trainers"
            )
          }

          setTrainers(
            data.data || []
          )

          setPagination(
            data.pagination
          )
        } catch (error) {
          setError(
            error instanceof Error
              ? error.message
              : "Unable to load trainers"
          )
        } finally {
          setLoading(false)
        }
      },
      [
        pagination.limit,
        search,
        activeFilter,
        availableFilter,
        courseFilter,
        certificationFilter,
        skillFilter,
        toolFilter,
        educationLevel,
        currentEducation,
        currentExperience,
        minRate,
        maxRate,
        sort,
      ]
    )

  /* =========================
     INITIAL / FILTER LOAD
  ========================= */

  useEffect(() => {
    fetchTrainers(1)
  }, [
    activeFilter,
    availableFilter,
    courseFilter,
    certificationFilter,
    skillFilter,
    toolFilter,
    educationLevel,
    currentEducation,
    currentExperience,
    minRate,
    maxRate,
    sort,
  ])

  /* =========================
     SEARCH
  ========================= */

  function handleSearch(
    e: React.FormEvent
  ) {
    e.preventDefault()

    fetchTrainers(1)
  }

  /* =========================
     CLEAR
  ========================= */

  function clearFilters() {
    setSearch("")
    setActiveFilter("")
    setAvailableFilter("")
    setCourseFilter("")
    setCertificationFilter("")
    setSkillFilter("")
    setToolFilter("")
    setEducationLevel("")
    setCurrentEducation("")
    setCurrentExperience("")
    setMinRate("")
    setMaxRate("")
    setSort("newest")

    setShowFilters(false)

    fetchTrainers(1)
  }

  /* =========================
     TOGGLE ACTIVE
  ========================= */

  async function toggleActive(
    trainer: Trainer
  ) {
    try {
      setActionLoading(
        trainer._id
      )

      const formData =
        new FormData()

      formData.append(
        "isActive",
        String(
          !trainer.isActive
        )
      )

      const response =
        await apiFetch(
          `/api/admin/trainers/${trainer._id}`,
          {
            method: "PATCH",
            body: formData,
          }
        )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to update trainer"
        )
      }

      setTrainers(
        (current) =>
          current.map(
            (item) =>
              item._id ===
              trainer._id
                ? {
                    ...item,
                    isActive:
                      !trainer.isActive,
                  }
                : item
          )
      )
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Unable to update trainer"
      )
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 transition-colors dark:bg-zinc-950 dark:text-white">

      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">

        {/* =========================
            HEADER
        ========================= */}

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div>
            <BackButton/>
            <div className="flex items-center gap-3">

              

              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Trainers
                </h1>

                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Manage trainers, courses,
                  skills, certifications
                  and availability.
                </p>
              </div>

            </div>
          </div>

          <Link
            href="/trainers/new"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-green-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-500"
          >
            <Plus size={18} />
            Add Trainer
          </Link>

        </div>

        {/* =========================
            SEARCH
        ========================= */}

        <div className="mb-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">

          <form
            onSubmit={
              handleSearch
            }
            className="flex flex-col gap-3 lg:flex-row"
          >

            <div className="relative flex-1">

              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Search trainer by name, email or phone..."
                className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm outline-none transition placeholder:text-zinc-400 focus:border-green-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:placeholder:text-zinc-600"
              />

            </div>

            <button
              type="submit"
              className="h-11 rounded-xl bg-zinc-900 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              Search
            </button>

            <button
              type="button"
              onClick={() =>
                setShowFilters(
                  !showFilters
                )
              }
              className="relative inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 text-sm font-medium transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-800"
            >
              <SlidersHorizontal
                size={17}
              />

              Filters

              {filterCount >
                0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-green-600 px-1.5 text-[11px] font-bold text-white">
                  {filterCount}
                </span>
              )}
            </button>

          </form>
        </div>

        {/* =========================
            ADVANCED FILTERS
        ========================= */}

        {showFilters && (
          <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">

            <div className="mb-5 flex items-center justify-between">

              <div>
                <h2 className="font-semibold">
                  Advanced Filters
                </h2>

                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Narrow down trainers using
                  courses, skills, tools,
                  certifications and more.
                </p>
              </div>

              <button
                onClick={
                  clearFilters
                }
                className="inline-flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-red-500"
              >
                <RotateCcw
                  size={14}
                />
                Reset
              </button>

            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

              {/* Status */}

              <FilterSelect
                label="Status"
                value={
                  activeFilter
                }
                onChange={
                  setActiveFilter
                }
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
              </FilterSelect>

              {/* Availability */}

              <FilterSelect
                label="Availability"
                value={
                  availableFilter
                }
                onChange={
                  setAvailableFilter
                }
              >
                <option value="">
                  All Availability
                </option>
                <option value="true">
                  Available
                </option>
                <option value="false">
                  Unavailable
                </option>
              </FilterSelect>

              {/* Course */}

              <FilterSelect
                label="Course"
                value={
                  courseFilter
                }
                onChange={
                  setCourseFilter
                }
              >
                <option value="">
                  All Courses
                </option>

                {courses
                  .filter(
                    (item) =>
                      item.isActive !==
                      false
                  )
                  .map(
                    (item) => (
                      <option
                        key={
                          item._id
                        }
                        value={
                          item._id
                        }
                      >
                        {item.name}
                      </option>
                    )
                  )}
              </FilterSelect>

              {/* Certification */}

              <FilterSelect
                label="Certification"
                value={
                  certificationFilter
                }
                onChange={
                  setCertificationFilter
                }
              >
                <option value="">
                  All Certifications
                </option>

                {certifications
                  .filter(
                    (item) =>
                      item.isActive !==
                      false
                  )
                  .map(
                    (item) => (
                      <option
                        key={
                          item._id
                        }
                        value={
                          item._id
                        }
                      >
                        {item.name}
                      </option>
                    )
                  )}
              </FilterSelect>

              {/* Skill */}

              <FilterSelect
                label="Skill"
                value={
                  skillFilter
                }
                onChange={
                  setSkillFilter
                }
              >
                <option value="">
                  All Skills
                </option>

                {skills
                  .filter(
                    (item) =>
                      item.isActive !==
                      false
                  )
                  .map(
                    (item) => (
                      <option
                        key={
                          item._id
                        }
                        value={
                          item._id
                        }
                      >
                        {item.name}
                      </option>
                    )
                  )}
              </FilterSelect>

              {/* Tool */}

              <FilterSelect
                label="Tool"
                value={
                  toolFilter
                }
                onChange={
                  setToolFilter
                }
              >
                <option value="">
                  All Tools
                </option>

                {tools
                  .filter(
                    (item) =>
                      item.isActive !==
                      false
                  )
                  .map(
                    (item) => (
                      <option
                        key={
                          item._id
                        }
                        value={
                          item._id
                        }
                      >
                        {item.name}
                      </option>
                    )
                  )}
              </FilterSelect>

              {/* Education */}

              <FilterSelect
                label="Education"
                value={
                  educationLevel
                }
                onChange={
                  setEducationLevel
                }
              >
                <option value="">
                  Any Education
                </option>
                <option value="high_school">
                  High School
                </option>
                <option value="college">
                  College
                </option>
                <option value="masters">
                  Masters
                </option>
                <option value="doctorate">
                  Doctorate
                </option>
              </FilterSelect>

              {/* Current Education */}

              <FilterSelect
                label="Education Status"
                value={
                  currentEducation
                }
                onChange={
                  setCurrentEducation
                }
              >
                <option value="">
                  Any Status
                </option>
                <option value="true">
                  Currently Studying
                </option>
              </FilterSelect>

              {/* Experience */}

              <FilterSelect
                label="Experience"
                value={
                  currentExperience
                }
                onChange={
                  setCurrentExperience
                }
              >
                <option value="">
                  Any Experience
                </option>
                <option value="true">
                  Currently Working
                </option>
              </FilterSelect>

              {/* Min Rate */}

              <FilterInput
                label="Minimum Hourly Rate"
                type="number"
                value={minRate}
                onChange={
                  setMinRate
                }
                placeholder="₹ Min"
              />

              {/* Max Rate */}

              <FilterInput
                label="Maximum Hourly Rate"
                type="number"
                value={maxRate}
                onChange={
                  setMaxRate
                }
                placeholder="₹ Max"
              />

              {/* Sort */}

              <FilterSelect
                label="Sort By"
                value={sort}
                onChange={setSort}
              >
                <option value="newest">
                  Newest
                </option>
                <option value="oldest">
                  Oldest
                </option>
                <option value="name_asc">
                  Name A-Z
                </option>
                <option value="name_desc">
                  Name Z-A
                </option>
                <option value="rate_low">
                  Rate Low to High
                </option>
                <option value="rate_high">
                  Rate High to Low
                </option>
              </FilterSelect>

            </div>

            {resourcesLoading && (
              <div className="mt-4 text-xs text-zinc-500">
                Loading filter options...
              </div>
            )}

          </div>
        )}

        {/* =========================
            ERROR
        ========================= */}

        {error && (
          <div className="mb-5 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">

            <span>
              {error}
            </span>

            <button
              onClick={() =>
                setError("")
              }
            >
              <X size={16} />
            </button>

          </div>
        )}

        {/* =========================
            RESULTS HEADER
        ========================= */}

        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            {loading
              ? "Loading trainers..."
              : `${pagination.total} trainer${
                  pagination.total !==
                  1
                    ? "s"
                    : ""
                } found`}
          </div>

          {filterCount >
            0 && (
            <button
              onClick={
                clearFilters
              }
              className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 hover:text-green-500 dark:text-green-400"
            >
              <X size={13} />
              Clear {filterCount} filters
            </button>
          )}

        </div>

        {/* =========================
            TABLE
        ========================= */}

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1100px]">

              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-500">

                  <th className="px-5 py-4">
                    Trainer
                  </th>

                  <th className="px-5 py-4">
                    Contact
                  </th>

                  <th className="px-5 py-4">
                    Rate
                  </th>

                  <th className="px-5 py-4">
                    Skills
                  </th>

                  <th className="px-5 py-4">
                    Status
                  </th>

                  <th className="px-5 py-4">
                    Availability
                  </th>

                  <th className="px-5 py-4 text-right">
                    Actions
                  </th>

                </tr>
              </thead>

              <tbody>

                {loading ? (
                  Array.from({
                    length: 7,
                  }).map(
                    (_, index) => (
                      <tr
                        key={
                          index
                        }
                        className="border-b border-zinc-100 dark:border-zinc-800"
                      >
                        {Array.from(
                          {
                            length: 7,
                          }
                        ).map(
                          (
                            _,
                            cell
                          ) => (
                            <td
                              key={
                                cell
                              }
                              className="px-5 py-5"
                            >
                              <div className="h-5 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
                            </td>
                          )
                        )}
                      </tr>
                    )
                  )
                ) : trainers.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={
                        7
                      }
                      className="px-5 py-20 text-center"
                    >
                      <div className="mx-auto max-w-sm">

                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                          <GraduationCap
                            size={25}
                            className="text-zinc-400"
                          />
                        </div>

                        <h3 className="font-semibold">
                          No trainers found
                        </h3>

                        <p className="mt-1 text-sm text-zinc-500">
                          Try changing your
                          filters or search
                          criteria.
                        </p>

                        {filterCount >
                          0 && (
                          <button
                            onClick={
                              clearFilters
                            }
                            className="mt-4 text-sm font-medium text-green-600 dark:text-green-400"
                          >
                            Clear filters
                          </button>
                        )}

                      </div>
                    </td>
                  </tr>
                ) : (
                  trainers.map(
                    (
                      trainer
                    ) => (
                      <tr
                        key={
                          trainer._id
                        }
                        className="border-b border-zinc-100 transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/30"
                      >

                        {/* Trainer */}

                        <td className="px-5 py-4">

                          <div className="flex items-center gap-3">

                            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">

                              {trainer.image ? (
                                <img
                                  src={
                                    trainer.image
                                  }
                                  alt={
                                    trainer.name
                                  }
                                  className="h-full w-full object-contain"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center font-semibold text-zinc-400">
                                  {trainer.name
                                    .charAt(
                                      0
                                    )
                                    .toUpperCase()}
                                </div>
                              )}

                            </div>

                            <div className="min-w-0">

                              <div className="truncate font-semibold">
                                {
                                  trainer.name
                                }
                              </div>

                              <div className="mt-0.5 truncate text-xs text-zinc-500">
                                {
                                  trainer._id
                                }
                              </div>

                            </div>

                          </div>

                        </td>

                        {/* Contact */}

                        <td className="px-5 py-4">

                          <div className="text-sm">
                            {
                              trainer.email
                            }
                          </div>

                          <div className="mt-1 text-xs text-zinc-500">
                            {
                              trainer.phone
                            }
                          </div>

                        </td>

                        {/* Rate */}

                        <td className="px-5 py-4">

                          <div className="inline-flex items-center gap-1 text-sm font-medium">

                            <IndianRupee
                              size={
                                14
                              }
                              className="text-zinc-400"
                            />

                            {
                              trainer.hourlyRate
                            }

                            <span className="text-xs font-normal text-zinc-400">
                              /hr
                            </span>

                          </div>

                        </td>

                        {/* Skills */}

                        <td className="px-5 py-4">

                          <div className="flex max-w-[220px] flex-wrap gap-1.5">

                            {trainer.skills
                              ?.slice(
                                0,
                                3
                              )
                              .map(
                                (
                                  skill
                                ) => (
                                  <span
                                    key={
                                      skill
                                    }
                                    className="rounded-md bg-green-50 px-2 py-1 text-[11px] text-green-600 dark:bg-green-500/10 dark:text-green-400"
                                  >
                                    {
                                      skill
                                    }
                                  </span>
                                )
                              )}

                            {trainer.skills
                              ?.length >
                              3 && (
                              <span className="rounded-md bg-zinc-100 px-2 py-1 text-[11px] text-zinc-500 dark:bg-zinc-800">
                                +
                                {trainer.skills.length -
                                  3}
                              </span>
                            )}

                          </div>

                        </td>

                        {/* Status */}

                        <td className="px-5 py-4">

                          <button
                            onClick={() =>
                              toggleActive(
                                trainer
                              )
                            }
                            disabled={
                              actionLoading ===
                              trainer._id
                            }
                            className={
                              trainer.isActive
                                ? "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                                : "inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-400"
                            }
                          >
                            {trainer.isActive ? (
                              <>
                                <UserCheck
                                  size={
                                    13
                                  }
                                />
                                Active
                              </>
                            ) : (
                              <>
                                <UserX
                                  size={
                                    13
                                  }
                                />
                                Inactive
                              </>
                            )}
                          </button>

                        </td>

                        {/* Availability */}

                        <td className="px-5 py-4">

                          <span
                            className={
                              trainer.isAvailable
                                ? "inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-600 dark:bg-green-500/10 dark:text-green-400"
                                : "inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1.5 text-xs text-zinc-500 dark:bg-zinc-800"
                            }
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {trainer.isAvailable
                              ? "Available"
                              : "Unavailable"}
                          </span>

                        </td>

                        {/* Actions */}

                        <td className="px-5 py-4">

                          <div className="flex justify-end gap-2">

                            <Link
                              href={`/trainers/${trainer._id}`}
                              title="View trainer"
                              className="rounded-lg border border-zinc-200 p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-white"
                            >
                              <Eye
                                size={
                                  16
                                }
                              />
                            </Link>

                            <Link
                              href={`/trainers/${trainer._id}`}
                              title="Edit trainer"
                              className="rounded-lg border border-zinc-200 p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-white"
                            >
                              <Pencil
                                size={
                                  16
                                }
                              />
                            </Link>

                          </div>

                        </td>

                      </tr>
                    )
                  )
                )}

              </tbody>

            </table>

          </div>

          {/* =========================
              PAGINATION
          ========================= */}

          {!loading &&
            pagination.total >
              0 && (
              <div className="flex flex-col gap-4 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">

                <div className="text-sm text-zinc-500">
                  Showing{" "}
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {(
                      (pagination.page -
                        1) *
                        pagination.limit
                    ) + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {Math.min(
                      pagination.page *
                        pagination.limit,
                      pagination.total
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {
                      pagination.total
                    }
                  </span>
                </div>

                <div className="flex items-center gap-2">

                  <button
                    disabled={
                      pagination.page <=
                      1
                    }
                    onClick={() =>
                      fetchTrainers(
                        pagination.page -
                          1
                      )
                    }
                    className="rounded-lg border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-30 dark:border-zinc-800 dark:hover:bg-zinc-800"
                  >
                    <ChevronLeft
                      size={18}
                    />
                  </button>

                  <div className="rounded-lg border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-800">
                    {pagination.page}{" "}
                    /{" "}
                    {
                      pagination.totalPages
                    }
                  </div>

                  <button
                    disabled={
                      pagination.page >=
                      pagination.totalPages
                    }
                    onClick={() =>
                      fetchTrainers(
                        pagination.page +
                          1
                      )
                    }
                    className="rounded-lg border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-30 dark:border-zinc-800 dark:hover:bg-zinc-800"
                  >
                    <ChevronRight
                      size={18}
                    />
                  </button>

                </div>

              </div>
            )}

        </div>

      </div>
    </div>
  )
}

/* =====================================================
   FILTER SELECT
===================================================== */

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (
    value: string
  ) => void
  children: React.ReactNode
}) {
  return (
    <label className="block">

      <span className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </span>

      <select
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none transition focus:border-green-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
      >
        {children}
      </select>

    </label>
  )
}

/* =====================================================
   FILTER INPUT
===================================================== */

function FilterInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string
  value: string
  onChange: (
    value: string
  ) => void
  type?: string
  placeholder?: string
}) {
  return (
    <label className="block">

      <span className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        placeholder={
          placeholder
        }
        className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-green-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:placeholder:text-zinc-600"
      />

    </label>
  )
}
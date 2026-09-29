"use client"

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react"

import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Image as ImageIcon,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react"

import { apiFetch } from "@/lib/api-fetch"
import BackButton from "./BackButton"

// ==========================================
// TYPES
// ==========================================

type Resource = {
  _id: string
  name: string
  image: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
}

type ResourceManagerProps = {
  title: string
  description: string
  apiEndpoint: string
  resourceName: string
}

// ==========================================
// COMPONENT
// ==========================================

export default function ResourceManager({
  title,
  description,
  apiEndpoint,
  resourceName,
}: ResourceManagerProps) {
  // ==========================================
  // DATA
  // ==========================================

  const [items, setItems] =
    useState<Resource[]>([])

  const [pagination, setPagination] =
    useState<Pagination>({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    })

  // ==========================================
  // LOADING
  // ==========================================

  const [loading, setLoading] =
    useState(true)

  const [submitting, setSubmitting] =
    useState(false)

  const [deletingId, setDeletingId] =
    useState<string | null>(null)

  const [togglingId, setTogglingId] =
    useState<string | null>(null)

  // ==========================================
  // FILTER
  // ==========================================

  const [search, setSearch] =
    useState("")

  const [activeFilter, setActiveFilter] =
    useState("")

  // ==========================================
  // FORM MODAL
  // ==========================================

  const [modalOpen, setModalOpen] =
    useState(false)

  const [editingItem, setEditingItem] =
    useState<Resource | null>(null)

  // ==========================================
  // FORM
  // ==========================================

  const [name, setName] =
    useState("")

  const [isActive, setIsActive] =
    useState(true)

  const [imageFile, setImageFile] =
    useState<File | null>(null)

  const [imagePreview, setImagePreview] =
    useState("")

  // ==========================================
  // DELETE MODAL
  // ==========================================

  const [deleteItem, setDeleteItem] =
    useState<Resource | null>(null)

  // ==========================================
  // ERROR
  // ==========================================

  const [error, setError] =
    useState("")

  // ==========================================
  // FETCH DATA
  // ==========================================

  async function fetchItems(page = 1) {
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
        "10"
      )

      if (search.trim()) {
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

      const response =
        await apiFetch(
          `${apiEndpoint}?${params.toString()}`
        )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Unable to fetch ${resourceName.toLowerCase()}s`
        )
      }

      setItems(
        data.data || []
      )

      setPagination(
        data.pagination
      )
    } catch (error) {
      console.error(error)

      setError(
        error instanceof Error
          ? error.message
          : `Unable to fetch ${resourceName.toLowerCase()}s`
      )
    } finally {
      setLoading(false)
    }
  }

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    fetchItems(1)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ==========================================
  // SEARCH
  // ==========================================

  function handleSearch(
    e: FormEvent
  ) {
    e.preventDefault()

    fetchItems(1)
  }

  // ==========================================
  // FILTER
  // ==========================================

  function handleFilterChange(
    value: string
  ) {
    setActiveFilter(value)

    setTimeout(() => {
      fetchItems(1)
    }, 0)
  }

  // ==========================================
  // CREATE MODAL
  // ==========================================

  function openCreateModal() {
    setEditingItem(null)

    setName("")

    setIsActive(true)

    setImageFile(null)

    setImagePreview("")

    setError("")

    setModalOpen(true)
  }

  // ==========================================
  // EDIT MODAL
  // ==========================================

  function openEditModal(
    item: Resource
  ) {
    setEditingItem(item)

    setName(item.name)

    setIsActive(
      item.isActive
    )

    setImageFile(null)

    setImagePreview(
      item.image
    )

    setError("")

    setModalOpen(true)
  }

  // ==========================================
  // CLOSE MODAL
  // ==========================================

  function closeModal() {
    if (submitting) {
      return
    }

    setModalOpen(false)

    setEditingItem(null)

    setName("")

    setIsActive(true)

    setImageFile(null)

    setImagePreview("")

    setError("")
  }

  // ==========================================
  // IMAGE CHANGE
  // ==========================================

  function handleImageChange(
    e: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      e.target.files?.[0]

    if (!file) {
      return
    }

    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(file.type)
    ) {
      setError(
        "Only JPG, PNG and WEBP images are allowed"
      )

      return
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setError(
        "Image size must be less than 5MB"
      )

      return
    }

    setError("")

    setImageFile(file)

    const preview =
      URL.createObjectURL(
        file
      )

    setImagePreview(
      preview
    )
  }

  // ==========================================
  // SUBMIT
  // ==========================================

  async function handleSubmit(
    e: FormEvent
  ) {
    e.preventDefault()

    if (!name.trim()) {
      setError(
        `${resourceName} name is required`
      )

      return
    }

    if (
      !editingItem &&
      !imageFile
    ) {
      setError(
        `${resourceName} image is required`
      )

      return
    }

    try {
      setSubmitting(true)

      setError("")

      const formData =
        new FormData()

      formData.append(
        "name",
        name.trim()
      )

      formData.append(
        "isActive",
        String(isActive)
      )

      if (imageFile) {
        formData.append(
          "image",
          imageFile
        )
      }

      const url =
        editingItem
          ? `${apiEndpoint}/${editingItem._id}`
          : apiEndpoint

      const method =
        editingItem
          ? "PATCH"
          : "POST"

      const response =
        await apiFetch(
          url,
          {
            method,
            body: formData,
          }
        )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Unable to save ${resourceName.toLowerCase()}`
        )
      }

      const page =
        editingItem
          ? pagination.page
          : 1

      setModalOpen(false)

      setEditingItem(null)

      setName("")

      setIsActive(true)

      setImageFile(null)

      setImagePreview("")

      setError("")

      await fetchItems(page)
    } catch (error) {
      console.error(error)

      setError(
        error instanceof Error
          ? error.message
          : `Unable to save ${resourceName.toLowerCase()}`
      )
    } finally {
      setSubmitting(false)
    }
  }

  // ==========================================
  // TOGGLE
  // ==========================================

  async function toggleActive(
    item: Resource
  ) {
    try {
      setTogglingId(
        item._id
      )

      setError("")

      const formData =
        new FormData()

      formData.append(
        "isActive",
        String(!item.isActive)
      )

      const response =
        await apiFetch(
          `${apiEndpoint}/${item._id}`,
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
            `Unable to update ${resourceName.toLowerCase()}`
        )
      }

      setItems(
        current =>
          current.map(
            currentItem =>
              currentItem._id ===
              item._id
                ? {
                    ...currentItem,
                    isActive:
                      !currentItem.isActive,
                  }
                : currentItem
          )
      )
    } catch (error) {
      console.error(error)

      setError(
        error instanceof Error
          ? error.message
          : `Unable to update ${resourceName.toLowerCase()}`
      )
    } finally {
      setTogglingId(null)
    }
  }

  // ==========================================
  // DELETE
  // ==========================================

  async function handleDelete() {
    if (!deleteItem) {
      return
    }

    try {
      setDeletingId(
        deleteItem._id
      )

      setError("")

      const response =
        await apiFetch(
          `${apiEndpoint}/${deleteItem._id}`,
          {
            method: "DELETE",
          }
        )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Unable to delete ${resourceName.toLowerCase()}`
        )
      }

      setDeleteItem(null)

      const currentPage =
        items.length === 1 &&
        pagination.page > 1
          ? pagination.page - 1
          : pagination.page

      await fetchItems(
        currentPage
      )
    } catch (error) {
      console.error(error)

      setError(
        error instanceof Error
          ? error.message
          : `Unable to delete ${resourceName.toLowerCase()}`
      )
    } finally {
      setDeletingId(null)
    }
  }

 

  function formatDate(
    date: string
  ) {
    return new Date(
      date
    ).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    )
  }


  return (
    <div
      className="
        min-h-screen
        bg-[#f4f4f4]
        p-4
        sm:p-6
        lg:p-8

        dark:bg-[#111]
      "
    >
      {/* ====================================== */}
      {/* HEADER */}
      {/* ====================================== */}
        <BackButton />
      <div
        className="
          mb-6
          flex
          flex-col
          gap-4
          md:flex-row
          md:items-center
          md:justify-between
        "
      >
        <div>
          <h1
            className="
              text-2xl
              font-bold
              text-gray-900

              dark:text-white
            "
          >
            {title}
          </h1>

          <p
            className="
              mt-1
              text-sm
              text-gray-500

              dark:text-[#777]
            "
          >
            {description}
          </p>
        </div>

        <button
          type="button"
          onClick={
            openCreateModal
          }
          className="
            inline-flex
            h-11
            items-center
            justify-center
            gap-2
            rounded-xl
            bg-[#67e44e]
            px-5
            text-sm
            font-semibold
            text-[#111]
            transition

            hover:bg-[#57d63f]

            dark:bg-[#67e44e]
            dark:text-[#111]
            dark:hover:bg-[#57d63f]
          "
        >
          <Plus size={18} />

          Add {resourceName}
        </button>
      </div>

      {/* ====================================== */}
      {/* ERROR */}
      {/* ====================================== */}

      {error && (
        <div
          className="
            mb-5
            flex
            items-start
            gap-3
            rounded-xl
            border
            border-red-200
            bg-red-50
            px-4
            py-3
            text-sm
            text-red-700

            dark:border-red-900/50
            dark:bg-red-950/20
            dark:text-red-400
          "
        >
          <AlertCircle
            size={18}
            className="
              mt-0.5
              shrink-0
            "
          />

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
            className="
              ml-auto
              rounded-md
              p-1

              hover:bg-red-100

              dark:hover:bg-red-900/30
            "
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ====================================== */}
      {/* FILTER */}
      {/* ====================================== */}

      <div
        className="
          mb-5
          rounded-2xl
          border
          border-gray-200
          bg-white
          p-4

          dark:border-[#2a2a2a]
          dark:bg-[#171717]
        "
      >
        <form
          onSubmit={
            handleSearch
          }
          className="
            flex
            flex-col
            gap-3
            md:flex-row
          "
        >
          {/* SEARCH */}

          <div
            className="
              relative
              flex-1
            "
          >
            <Search
              size={18}
              className="
                absolute
                left-3
                top-1/2
                -translate-y-1/2
                text-gray-400

                dark:text-[#777]
              "
            />

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder={`Search ${resourceName.toLowerCase()}s...`}
              className="
                h-11
                w-full
                rounded-xl
                border
                border-gray-200
                bg-gray-50
                pl-10
                pr-4
                text-sm
                text-gray-900
                outline-none
                transition

                placeholder:text-gray-400

                focus:border-[#67e44e]
                focus:bg-white

                dark:border-[#333]
                dark:bg-[#202020]
                dark:text-white
                dark:placeholder:text-[#666]
                dark:focus:border-[#67e44e]
                dark:focus:bg-[#222]
              "
            />
          </div>

          {/* STATUS */}

          <select
            value={
              activeFilter
            }
            onChange={(e) =>
              handleFilterChange(
                e.target.value
              )
            }
            className="
              h-11
              rounded-xl
              border
              border-gray-200
              bg-gray-50
              px-4
              text-sm
              text-gray-700
              outline-none

              focus:border-[#67e44e]

              dark:border-[#333]
              dark:bg-[#202020]
              dark:text-[#ddd]
              dark:focus:border-[#67e44e]
            "
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

          {/* SEARCH BUTTON */}

          <button
            type="submit"
            className="
              h-11
              rounded-xl
              bg-[#67e44e]
              px-5
              text-sm
              font-semibold
              text-[#111]
              transition

              hover:bg-[#57d63f]

              dark:bg-[#67e44e]
              dark:text-[#111]
              dark:hover:bg-[#57d63f]
            "
          >
            Search
          </button>
        </form>
      </div>

      {/* ====================================== */}
      {/* TABLE */}
      {/* ====================================== */}

      <div
        className="
          overflow-hidden
          rounded-2xl
          border
          border-gray-200
          bg-white

          dark:border-[#2a2a2a]
          dark:bg-[#171717]
        "
      >
        <div className="overflow-x-auto">
          <table
            className="
              w-full
              min-w-[800px]
            "
          >
            {/* HEADER */}

            <thead>
              <tr
                className="
                  border-b
                  border-gray-200
                  bg-gray-50

                  dark:border-[#2a2a2a]
                  dark:bg-[#1c1c1c]
                "
              >
                <th
                  className="
                    px-5
                    py-4
                    text-left
                    text-xs
                    font-semibold
                    uppercase
                    tracking-wide
                    text-gray-500

                    dark:text-[#888]
                  "
                >
                  {resourceName}
                </th>

                <th
                  className="
                    px-5
                    py-4
                    text-left
                    text-xs
                    font-semibold
                    uppercase
                    tracking-wide
                    text-gray-500

                    dark:text-[#888]
                  "
                >
                  Status
                </th>

                <th
                  className="
                    px-5
                    py-4
                    text-left
                    text-xs
                    font-semibold
                    uppercase
                    tracking-wide
                    text-gray-500

                    dark:text-[#888]
                  "
                >
                  Created
                </th>

                <th
                  className="
                    px-5
                    py-4
                    text-right
                    text-xs
                    font-semibold
                    uppercase
                    tracking-wide
                    text-gray-500

                    dark:text-[#888]
                  "
                >
                  Actions
                </th>
              </tr>
            </thead>

            {/* BODY */}

            <tbody
              className="
                divide-y
                divide-gray-100

                dark:divide-[#2a2a2a]
              "
            >
              {/* LOADING */}

              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="
                      py-20
                      text-center
                    "
                  >
                    <Loader2
                      size={26}
                      className="
                        mx-auto
                        animate-spin
                        text-[#67e44e]
                      "
                    />

                    <p
                      className="
                        mt-3
                        text-sm
                        text-gray-500

                        dark:text-[#777]
                      "
                    >
                      Loading{" "}
                      {resourceName.toLowerCase()}
                      s...
                    </p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                /* EMPTY */

                <tr>
                  <td
                    colSpan={4}
                    className="
                      py-20
                      text-center
                    "
                  >
                    <div
                      className="
                        mx-auto
                        flex
                        h-14
                        w-14
                        items-center
                        justify-center
                        rounded-2xl
                        bg-gray-100

                        dark:bg-[#242424]
                      "
                    >
                      <ImageIcon
                        size={24}
                        className="
                          text-gray-400

                          dark:text-[#777]
                        "
                      />
                    </div>

                    <p
                      className="
                        mt-4
                        font-medium
                        text-gray-900

                        dark:text-white
                      "
                    >
                      No{" "}
                      {resourceName.toLowerCase()}
                      s found
                    </p>

                    <p
                      className="
                        mt-1
                        text-sm
                        text-gray-500

                        dark:text-[#777]
                      "
                    >
                      Create your first{" "}
                      {resourceName.toLowerCase()}
                      {" "}to get started.
                    </p>
                  </td>
                </tr>
              ) : (
                items.map(
                  item => (
                    <tr
                      key={
                        item._id
                      }
                      className="
                        transition
                        hover:bg-gray-50

                        dark:hover:bg-[#1d1d1d]
                      "
                    >
                      {/* RESOURCE */}

                      <td
                        className="
                          px-5
                          py-4
                        "
                      >
                        <div
                          className="
                            flex
                            items-center
                            gap-4
                          "
                        >
                          <div
                            className="
                              flex
                              h-12
                              w-12
                              shrink-0
                              items-center
                              justify-center
                              overflow-hidden
                              rounded-xl
                              border
                              border-gray-200
                              bg-gray-50

                              dark:border-[#333]
                              dark:bg-[#202020]
                            "
                          >
                            {item.image ? (
                              <img
                                src={
                                  item.image
                                }
                                alt={
                                  item.name
                                }
                                className="
                                  h-full
                                  w-full
                                  object-contain
                                  p-1
                                "
                              />
                            ) : (
                              <ImageIcon
                                size={20}
                                className="
                                  text-gray-400

                                  dark:text-[#777]
                                "
                              />
                            )}
                          </div>

                          <div>
                            <p
                              className="
                                font-semibold
                                text-gray-900

                                dark:text-white
                              "
                            >
                              {item.name}
                            </p>

                            <p
                              className="
                                mt-0.5
                                text-xs
                                text-gray-400

                                dark:text-[#666]
                              "
                            >
                              {item._id}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* STATUS */}

                      <td
                        className="
                          px-5
                          py-4
                        "
                      >
                        <button
                          type="button"
                          disabled={
                            togglingId ===
                            item._id
                          }
                          onClick={() =>
                            toggleActive(
                              item
                            )
                          }
                          className="
                            inline-flex
                            items-center
                            gap-2
                          "
                        >
                          <span
                            className={`
                              relative
                              h-6
                              w-11
                              rounded-full
                              transition

                              ${
                                item.isActive
                                  ? "bg-[#67e44e]"
                                  : "bg-gray-300 dark:bg-[#444]"
                              }
                            `}
                          >
                            <span
                              className={`
                                absolute
                                top-1
                                h-4
                                w-4
                                rounded-full
                                bg-white
                                shadow-sm
                                transition

                                ${
                                  item.isActive
                                    ? "left-6"
                                    : "left-1"
                                }
                              `}
                            />
                          </span>

                          <span
                            className={`
                              text-sm
                              font-medium

                              ${
                                item.isActive
                                  ? "text-[#4fbd3d] dark:text-[#67e44e]"
                                  : "text-gray-500 dark:text-[#777]"
                              }
                            `}
                          >
                            {togglingId ===
                            item._id
                              ? "..."
                              : item.isActive
                                ? "Active"
                                : "Inactive"}
                          </span>
                        </button>
                      </td>

                      {/* DATE */}

                      <td
                        className="
                          px-5
                          py-4
                          text-sm
                          text-gray-500

                          dark:text-[#888]
                        "
                      >
                        {formatDate(
                          item.createdAt
                        )}
                      </td>

                      {/* ACTIONS */}

                      <td
                        className="
                          px-5
                          py-4
                        "
                      >
                        <div
                          className="
                            flex
                            justify-end
                            gap-2
                          "
                        >
                          {/* EDIT */}

                          <button
                            type="button"
                            onClick={() =>
                              openEditModal(
                                item
                              )
                            }
                            className="
                              flex
                              h-9
                              w-9
                              items-center
                              justify-center
                              rounded-lg
                              border
                              border-gray-200
                              text-gray-500
                              transition

                              hover:border-[#67e44e]
                              hover:text-[#4fbd3d]

                              dark:border-[#333]
                              dark:text-[#888]
                              dark:hover:border-[#67e44e]
                              dark:hover:text-[#67e44e]
                            "
                            title="Edit"
                          >
                            <Edit3
                              size={16}
                            />
                          </button>

                          {/* DELETE */}

                          <button
                            type="button"
                            onClick={() =>
                              setDeleteItem(
                                item
                              )
                            }
                            className="
                              flex
                              h-9
                              w-9
                              items-center
                              justify-center
                              rounded-lg
                              border
                              border-gray-200
                              text-red-500
                              transition

                              hover:border-red-200
                              hover:bg-red-50

                              dark:border-[#333]
                              dark:text-red-400
                              dark:hover:border-red-900/50
                              dark:hover:bg-red-950/20
                            "
                            title="Delete"
                          >
                            <Trash2
                              size={16}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>

        {/* ================================== */}
        {/* PAGINATION */}
        {/* ================================== */}

        {!loading &&
          items.length > 0 && (
            <div
              className="
                flex
                flex-col
                gap-4
                border-t
                border-gray-200
                px-5
                py-4

                sm:flex-row
                sm:items-center
                sm:justify-between

                dark:border-[#2a2a2a]
              "
            >
              <p
                className="
                  text-sm
                  text-gray-500

                  dark:text-[#777]
                "
              >
                Showing{" "}

                <span
                  className="
                    font-medium
                    text-gray-900

                    dark:text-white
                  "
                >
                  {(
                    (
                      pagination.page -
                      1
                    ) *
                      pagination.limit
                  ) + 1}
                </span>

                {" "}to{" "}

                <span
                  className="
                    font-medium
                    text-gray-900

                    dark:text-white
                  "
                >
                  {Math.min(
                    pagination.page *
                      pagination.limit,
                    pagination.total
                  )}
                </span>

                {" "}of{" "}

                <span
                  className="
                    font-medium
                    text-gray-900

                    dark:text-white
                  "
                >
                  {pagination.total}
                </span>
              </p>

              <div
                className="
                  flex
                  items-center
                  gap-2
                "
              >
                <button
                  type="button"
                  disabled={
                    pagination.page <=
                    1
                  }
                  onClick={() =>
                    fetchItems(
                      pagination.page -
                        1
                    )
                  }
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-lg
                    border
                    border-gray-200
                    text-gray-600
                    transition

                    hover:bg-gray-50

                    disabled:cursor-not-allowed
                    disabled:opacity-40

                    dark:border-[#333]
                    dark:text-[#aaa]
                    dark:hover:bg-[#242424]
                  "
                >
                  <ChevronLeft
                    size={17}
                  />
                </button>

                <span
                  className="
                    min-w-[80px]
                    text-center
                    text-sm
                    text-gray-600

                    dark:text-[#888]
                  "
                >
                  Page{" "}
                  {pagination.page}
                  {" "}of{" "}
                  {
                    pagination.totalPages
                  }
                </span>

                <button
                  type="button"
                  disabled={
                    pagination.page >=
                    pagination.totalPages
                  }
                  onClick={() =>
                    fetchItems(
                      pagination.page +
                        1
                    )
                  }
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-lg
                    border
                    border-gray-200
                    text-gray-600
                    transition

                    hover:bg-gray-50

                    disabled:cursor-not-allowed
                    disabled:opacity-40

                    dark:border-[#333]
                    dark:text-[#aaa]
                    dark:hover:bg-[#242424]
                  "
                >
                  <ChevronRight
                    size={17}
                  />
                </button>
              </div>
            </div>
          )}
      </div>

      {/* ====================================== */}
      {/* CREATE / EDIT MODAL */}
      {/* ====================================== */}

      {modalOpen && (
        <div
          className="
            fixed
            inset-0
            z-50
            flex
            items-center
            justify-center
            bg-black/50
            p-4

            dark:bg-black/70
          "
        >
          <div
            className="
              max-h-[90vh]
              w-full
              max-w-lg
              overflow-y-auto
              rounded-2xl
              bg-white
              shadow-2xl

              dark:border
              dark:border-[#2a2a2a]
              dark:bg-[#171717]
            "
          >
            {/* MODAL HEADER */}

            <div
              className="
                flex
                items-center
                justify-between
                border-b
                border-gray-200
                px-6
                py-5

                dark:border-[#2a2a2a]
              "
            >
              <div>
                <h2
                  className="
                    text-lg
                    font-bold
                    text-gray-900

                    dark:text-white
                  "
                >
                  {editingItem
                    ? `Edit ${resourceName}`
                    : `Create ${resourceName}`}
                </h2>

                <p
                  className="
                    mt-1
                    text-sm
                    text-gray-500

                    dark:text-[#777]
                  "
                >
                  {editingItem
                    ? `Update ${resourceName.toLowerCase()} details.`
                    : `Add a new ${resourceName.toLowerCase()}.`}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeModal
                }
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-lg
                  text-gray-500

                  hover:bg-gray-100

                  dark:text-[#888]
                  dark:hover:bg-[#242424]
                  dark:hover:text-white
                "
              >
                <X size={18} />
              </button>
            </div>

            {/* FORM */}

            <form
              onSubmit={
                handleSubmit
              }
              className="
                space-y-6
                p-6
              "
            >
              {/* NAME */}

              <div>
                <label
                  className="
                    mb-2
                    block
                    text-sm
                    font-semibold
                    text-gray-700

                    dark:text-[#ddd]
                  "
                >
                  {resourceName} name
                </label>

                <input
                  value={name}
                  onChange={(e) =>
                    setName(
                      e.target.value
                    )
                  }
                  placeholder={`e.g. ${resourceName}`}
                  className="
                    h-11
                    w-full
                    rounded-xl
                    border
                    border-gray-200
                    bg-white
                    px-4
                    text-sm
                    text-gray-900
                    outline-none
                    transition

                    placeholder:text-gray-400

                    focus:border-[#67e44e]

                    dark:border-[#333]
                    dark:bg-[#202020]
                    dark:text-white
                    dark:placeholder:text-[#666]
                    dark:focus:border-[#67e44e]
                    dark:focus:bg-[#222]
                  "
                />
              </div>

              {/* IMAGE */}

              <div>
                <label
                  className="
                    mb-2
                    block
                    text-sm
                    font-semibold
                    text-gray-700

                    dark:text-[#ddd]
                  "
                >
                  {resourceName} image
                </label>

                <label
                  className="
                    group
                    relative
                    flex
                    min-h-[220px]
                    cursor-pointer
                    flex-col
                    items-center
                    justify-center
                    overflow-hidden
                    rounded-2xl
                    border-2
                    border-dashed
                    border-gray-200
                    bg-gray-50
                    transition

                    hover:border-[#67e44e]

                    dark:border-[#333]
                    dark:bg-[#202020]
                    dark:hover:border-[#67e44e]
                  "
                >
                  {imagePreview ? (
                    <>
                      <img
                        src={
                          imagePreview
                        }
                        alt="Preview"
                        className="
                          max-h-[200px]
                          max-w-full
                          object-contain
                          p-5
                        "
                      />

                      <div
                        className="
                          absolute
                          inset-x-0
                          bottom-0
                          bg-black/60
                          px-4
                          py-2
                          text-center
                          text-xs
                          font-medium
                          text-white
                          opacity-0
                          transition

                          group-hover:opacity-100
                        "
                      >
                        Click to change
                        image
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        className="
                          flex
                          h-12
                          w-12
                          items-center
                          justify-center
                          rounded-xl
                          bg-white
                          shadow-sm

                          dark:bg-[#2a2a2a]
                        "
                      >
                        <Upload
                          size={21}
                          className="
                            text-[#4fbd3d]

                            dark:text-[#67e44e]
                          "
                        />
                      </div>

                      <p
                        className="
                          mt-3
                          text-sm
                          font-semibold
                          text-gray-700

                          dark:text-[#ddd]
                        "
                      >
                        Upload{" "}
                        {resourceName.toLowerCase()}
                        {" "}image
                      </p>

                      <p
                        className="
                          mt-1
                          text-xs
                          text-gray-400

                          dark:text-[#666]
                        "
                      >
                        JPG, PNG or WEBP ·
                        Max 5MB
                      </p>
                    </>
                  )}

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={
                      handleImageChange
                    }
                    className="hidden"
                  />
                </label>

                <p
                  className="
                    mt-2
                    text-xs
                    text-gray-400

                    dark:text-[#666]
                  "
                >
                  Background will be
                  removed automatically
                  when uploaded.
                </p>
              </div>

              {/* ACTIVE */}

              <div
                className="
                  flex
                  items-center
                  justify-between
                  rounded-xl
                  border
                  border-gray-200
                  px-4
                  py-3

                  dark:border-[#333]
                  dark:bg-[#1c1c1c]
                "
              >
                <div>
                  <p
                    className="
                      text-sm
                      font-semibold
                      text-gray-800

                      dark:text-white
                    "
                  >
                    Active
                  </p>

                  <p
                    className="
                      text-xs
                      text-gray-500

                      dark:text-[#777]
                    "
                  >
                    Allow this{" "}
                    {resourceName.toLowerCase()}
                    {" "}to be used.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setIsActive(
                      !isActive
                    )
                  }
                  className={`
                    relative
                    h-6
                    w-11
                    rounded-full
                    transition

                    ${
                      isActive
                        ? "bg-[#67e44e]"
                        : "bg-gray-300 dark:bg-[#444]"
                    }
                  `}
                >
                  <span
                    className={`
                      absolute
                      top-1
                      h-4
                      w-4
                      rounded-full
                      bg-white
                      shadow-sm
                      transition

                      ${
                        isActive
                          ? "left-6"
                          : "left-1"
                      }
                    `}
                  />
                </button>
              </div>

              {/* FORM ERROR */}

              {error && (
                <div
                  className="
                    rounded-xl
                    border
                    border-red-200
                    bg-red-50
                    px-4
                    py-3
                    text-sm
                    text-red-700

                    dark:border-red-900/50
                    dark:bg-red-950/20
                    dark:text-red-400
                  "
                >
                  {error}
                </div>
              )}

              {/* BUTTONS */}

              <div
                className="
                  flex
                  justify-end
                  gap-3
                  border-t
                  border-gray-100
                  pt-5

                  dark:border-[#2a2a2a]
                "
              >
                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  disabled={
                    submitting
                  }
                  className="
                    h-11
                    rounded-xl
                    border
                    border-gray-200
                    px-5
                    text-sm
                    font-semibold
                    text-gray-700
                    transition

                    hover:bg-gray-50

                    disabled:opacity-50

                    dark:border-[#333]
                    dark:text-[#ccc]
                    dark:hover:bg-[#242424]
                  "
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    submitting
                  }
                  className="
                    flex
                    h-11
                    min-w-[130px]
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-[#67e44e]
                    px-5
                    text-sm
                    font-semibold
                    text-[#111]
                    transition

                    hover:bg-[#57d63f]

                    disabled:cursor-not-allowed
                    disabled:opacity-60

                    dark:bg-[#67e44e]
                    dark:text-[#111]
                    dark:hover:bg-[#57d63f]
                  "
                >
                  {submitting ? (
                    <>
                      <Loader2
                        size={17}
                        className="
                          animate-spin
                        "
                      />

                      {editingItem
                        ? "Updating..."
                        : "Creating..."}
                    </>
                  ) : (
                    <>
                      {editingItem ? (
                        <Check
                          size={17}
                        />
                      ) : (
                        <Plus
                          size={17}
                        />
                      )}

                      {editingItem
                        ? `Update ${resourceName}`
                        : `Create ${resourceName}`}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================== */}
      {/* DELETE MODAL */}
      {/* ====================================== */}

      {deleteItem && (
        <div
          className="
            fixed
            inset-0
            z-[60]
            flex
            items-center
            justify-center
            bg-black/50
            p-4

            dark:bg-black/70
          "
        >
          <div
            className="
              w-full
              max-w-md
              rounded-2xl
              bg-white
              p-6
              shadow-2xl

              dark:border
              dark:border-[#2a2a2a]
              dark:bg-[#171717]
            "
          >
            {/* ICON */}

            <div
              className="
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-xl
                bg-red-50
                text-red-500

                dark:bg-red-950/30
                dark:text-red-400
              "
            >
              <Trash2
                size={21}
              />
            </div>

            {/* TITLE */}

            <h2
              className="
                mt-5
                text-lg
                font-bold
                text-gray-900

                dark:text-white
              "
            >
              Delete{" "}
              {resourceName.toLowerCase()}
              ?
            </h2>

            {/* DESCRIPTION */}

            <p
              className="
                mt-2
                text-sm
                leading-6
                text-gray-500

                dark:text-[#777]
              "
            >
              Are you sure you want
              to delete{" "}

              <span
                className="
                  font-semibold
                  text-gray-900

                  dark:text-white
                "
              >
                {deleteItem.name}
              </span>

              ? The{" "}
              {resourceName.toLowerCase()}
              {" "}image will also be
              permanently deleted.
            </p>

            {/* BUTTONS */}

            <div
              className="
                mt-6
                flex
                justify-end
                gap-3
              "
            >
              <button
                type="button"
                disabled={
                  deletingId !== null
                }
                onClick={() =>
                  setDeleteItem(
                    null
                  )
                }
                className="
                  h-11
                  rounded-xl
                  border
                  border-gray-200
                  px-5
                  text-sm
                  font-semibold
                  text-gray-700
                  transition

                  hover:bg-gray-50

                  disabled:opacity-50

                  dark:border-[#333]
                  dark:text-[#ccc]
                  dark:hover:bg-[#242424]
                "
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  deletingId !== null
                }
                onClick={
                  handleDelete
                }
                className="
                  flex
                  h-11
                  min-w-[110px]
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-red-600
                  px-5
                  text-sm
                  font-semibold
                  text-white
                  transition

                  hover:bg-red-700

                  disabled:opacity-60
                "
              >
                {deletingId ? (
                  <>
                    <Loader2
                      size={16}
                      className="
                        animate-spin
                      "
                    />

                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2
                      size={16}
                    />

                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
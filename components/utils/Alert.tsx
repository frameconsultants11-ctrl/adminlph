import { AlertCircle, Check, ChevronDown, Plus, Trash2, Wrench, X } from "lucide-react"
import { useMemo, useState } from "react"
type Resource = {
  _id: string
  name: string
  image?: string
  isActive?: boolean
}
export function Alert({
  message,
  onClose,
}: {
  message: string
  onClose: () => void
}) {
  return (
    <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-600 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
      <AlertCircle size={17} className="mt-0.5 shrink-0" />
      <span>{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="ml-auto opacity-60 hover:opacity-100"
      >
        <X size={15} />
      </button>
    </div>
  )
}

export function Section({
  title,
  description,
  icon,
  action,
  children,
}: {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="relative rounded-2xl border border-[#e8e8e8] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:border-[#2a2a2a] dark:bg-[#171717]">
      <div className="flex flex-col gap-4 border-b border-[#eeeeee] px-5 py-5 dark:border-[#2a2a2a] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-3">
          {icon && (
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#67e44e]/10 text-[#4fbd3d] dark:text-[#67e44e]">
              {icon}
            </div>
          )}
          <div>
            <h2 className="text-[14px] font-semibold text-[#181818] dark:text-white">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-[11px] leading-5 text-[#777] dark:text-[#888]">
                {description}
              </p>
            )}
          </div>
        </div>
        {action}
      </div>

      <div className="p-5 sm:p-6">{children}</div>
    </section>
  )
}

export function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  min,
  disabled = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  min?: string
  disabled?: boolean
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
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-[#dedede] bg-white px-3.5 text-[12px] text-[#222] outline-none placeholder:text-[#aaa] focus:border-[#67e44e] focus:ring-2 focus:ring-[#67e44e]/10 disabled:cursor-default disabled:bg-[#fafafa] dark:border-[#333] dark:bg-[#202020] dark:text-white dark:placeholder:text-[#666] dark:disabled:bg-[#1c1c1c]"
      />
    </div>
  )
}

export function Select({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  disabled?: boolean
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-medium text-[#444] dark:text-[#bbb]">
        {label}
      </label>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-[#dedede] bg-white px-3.5 text-[12px] outline-none focus:border-[#67e44e] focus:ring-2 focus:ring-[#67e44e]/10 disabled:cursor-default disabled:bg-[#fafafa] dark:border-[#333] dark:bg-[#202020] dark:text-white dark:disabled:bg-[#1c1c1c]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function AddButton({
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
      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#67e44e] px-2.5 text-[10px] font-semibold text-[#111] hover:bg-[#57d63f]"
    >
      <Plus size={13} />
      {label}
    </button>
  )
}

export function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[10px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
    >
      <Trash2 size={13} />
      Remove
    </button>
  )
}

export function CurrentCheckbox({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="mt-4 flex items-center gap-2.5 text-left disabled:cursor-default"
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-md border ${
          checked
            ? "border-[#67e44e] bg-[#67e44e] text-[#111]"
            : "border-[#ccc] bg-white dark:border-[#444] dark:bg-[#202020]"
        }`}
      >
        {checked && <Check size={12} />}
      </span>
      <span className="text-[11px] font-medium text-[#555] dark:text-[#aaa]">
        {label}
      </span>
    </button>
  )
}

export function EmptySection({
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
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#d8d8d8] px-5 py-10 text-center dark:border-[#333]">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3f3f3] text-[#999] dark:bg-[#202020] dark:text-[#666]">
        {icon}
      </div>
      <p className="text-[11px] text-[#888]">{text}</p>
      {action && onClick && (
        <button
          type="button"
          onClick={onClick}
          className="mt-3 text-[11px] font-semibold text-[#4fbd3d] dark:text-[#67e44e]"
        >
          + {action}
        </button>
      )}
    </div>
  )
}

export function ResourceMultiSelect({
  title,
  label,
  resources,
  selectedIds,
  onChange,
  placeholder,
  disabled = false,
}: {
  title: string
  label: string
  resources: Resource[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  placeholder: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    const active = resources.filter((r) => r.isActive !== false)

    if (!query) return active
    return active.filter((r) =>
      r.name.toLowerCase().includes(query),
    )
  }, [resources, search])

  const selectedResources = resources.filter((r) =>
    selectedIds.includes(r._id),
  )

  function toggle(id: string) {
    if (disabled) return

    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((item) => item !== id)
        : [...selectedIds, id],
    )
  }

  return (
    <Section icon={<Wrench size={17} />} title={title} description={`Select ${title.toLowerCase()} associated with this trainer.`}>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-[11px] font-medium text-[#444] dark:text-[#bbb]">
            {label}
          </label>

          {!disabled && selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[10px] font-medium text-red-500"
            >
              Clear all
            </button>
          )}
        </div>

        {selectedResources.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {selectedResources.map((resource) => (
              <div
                key={resource._id}
                className="flex items-center gap-2 rounded-lg border border-[#ddd] bg-[#f5f5f5] px-2 py-1.5 text-[11px] text-[#444] dark:border-[#333] dark:bg-[#202020] dark:text-[#ccc]"
              >
                <span>{resource.name}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange(
                        selectedIds.filter((id) => id !== resource._id),
                      )
                    }
                    className="text-[#999] hover:text-red-500"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="relative">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOpen((v) => !v)}
            className="flex h-11 w-full items-center justify-between rounded-xl border border-[#dedede] bg-white px-3.5 text-left text-[12px] disabled:cursor-default disabled:bg-[#fafafa] dark:border-[#333] dark:bg-[#202020] dark:text-white dark:disabled:bg-[#1c1c1c]"
          >
            <span className={selectedIds.length ? "text-[#444] dark:text-[#ccc]" : "text-[#aaa]"}>
              {selectedIds.length
                ? `${selectedIds.length} selected`
                : placeholder}
            </span>
            <ChevronDown
              size={15}
              className={`text-[#888] transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>

          {open && !disabled && (
            <div className="absolute left-0 right-0 z-[9999] mt-2 overflow-hidden rounded-xl border border-[#ddd] bg-white shadow-xl dark:border-[#333] dark:bg-[#171717]">
              <div className="border-b border-[#eee] p-3 dark:border-[#2a2a2a]">
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
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
                    const selected = selectedIds.includes(resource._id)

                    return (
                      <button
                        type="button"
                        key={resource._id}
                        onClick={() => toggle(resource._id)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${
                          selected
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
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f0f0f0] text-[10px] font-bold text-[#777] dark:bg-[#292929] dark:text-[#999]">
                            {resource.name.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <span className="flex-1 text-[11px] font-medium text-[#333] dark:text-[#ccc]">
                          {resource.name}
                        </span>

                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                            selected
                              ? "border-[#67e44e] bg-[#67e44e] text-[#111]"
                              : "border-[#d5d5d5] dark:border-[#444]"
                          }`}
                        >
                          {selected && <Check size={12} />}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>

              <div className="flex justify-end border-t border-[#eee] px-3 py-2.5 dark:border-[#2a2a2a]">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    setSearch("")
                  }}
                  className="rounded-lg bg-[#67e44e] px-3 py-1.5 text-[10px] font-semibold text-[#111]"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Section>
  )
}

export function ToggleCard({
  title,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  title: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${
        checked
          ? "border-[#67e44e]/40 bg-[#67e44e]/5"
          : "border-[#e5e5e5] bg-[#fafafa] dark:border-[#2a2a2a] dark:bg-[#1c1c1c]"
      } disabled:cursor-default`}
    >
      <div>
        <div className="text-[12px] font-semibold text-[#222] dark:text-white">
          {title}
        </div>
        <div className="mt-1 text-[10px] leading-4 text-[#888]">
          {description}
        </div>
      </div>

      <div
        className={`relative h-6 w-11 shrink-0 rounded-full ${
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
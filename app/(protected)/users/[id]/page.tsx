"use client";

import {
  useEffect,
  useState,
} from "react";
import Modal from "@/components/ui/Modal"
import {
  ArrowLeft,
  Check,
  KeyRound,
  Pencil,
  ShieldCheck,
  UserRound,
  UserX,
  X,
} from "lucide-react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import Badge from "@/components/ui/Badge";
import AuthButton from "@/components/auth/AuthButton";
import AuthInput from "@/components/auth/AuthInput";

import { apiFetch } from "@/lib/api-fetch";
import { getDeviceLabel } from "@/lib/device-info";
import BackButton from "@/components/ui/BackButton";

/* =========================================================
   TYPES
========================================================= */

type UserRole =
  | "admin"
  | "manager"
  | "staff";

type UserDetails = {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  failedLoginAttempts?: number;
  lockedUntil?: string | null;
};

type Session = {
  sessionId: string;
  deviceId: string;
  deviceName?: string | null;
  createdAt: string;
  lastUsedAt?: string | null;
  expiresAt: string;
};

type UserResponse = {
  success: boolean;
  user: UserDetails;
  sessions?: Session[];
  message?: string;
};

/* =========================================================
   PAGE
========================================================= */

export default function UserDetailsPage() {
  const params = useParams<{
    id: string;
  }>();

  const router = useRouter();

  /*
   * Normalize route parameter.
   */
  const id =
    typeof params?.id === "string"
      ? params.id
      : "";

  /* =======================================================
     STATE
  ======================================================= */

  const [user, setUser] =
    useState<UserDetails | null>(null);

  const [sessions, setSessions] =
    useState<Session[]>([]);

  const [loading, setLoading] =
    useState(true);
const [
  deactivateOpen,
  setDeactivateOpen,
] = useState(false)

const [
  deactivating,
  setDeactivating,
] = useState(false)
  const [error, setError] =
    useState("");

  const [editing, setEditing] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [editError, setEditError] =
    useState("");

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [role, setRole] =
    useState<UserRole>("staff");

  const [isActive, setIsActive] =
    useState(true);

  const [
    terminatingSession,
    setTerminatingSession,
  ] = useState<string | null>(null);

  const [
    confirmSession,
    setConfirmSession,
  ] = useState<Session | null>(null);

  /* =======================================================
     LOAD USER
  ======================================================= */

  async function loadUser() {
    if (!id) {
      setError("User ID is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response =
        await apiFetch(
          `/api/admin/users/${encodeURIComponent(
            id
          )}`,
          {
            method: "GET",
          }
        );

      const data =
        (await response
          .json()
          .catch(() => null)) as
          | UserResponse
          | null;

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Unable to load user."
        );
      }

      if (!data?.user) {
        throw new Error(
          "User not found."
        );
      }

      setUser(data.user);

      setSessions(
        data.sessions || []
      );

      /*
       * Populate edit form.
       */
      setName(data.user.name);
      setEmail(data.user.email);
      setRole(data.user.role);
      setIsActive(data.user.isActive);
    } catch (error) {
      console.error(
        "LOAD USER ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load user."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUser();
  }, [id]);

  /* =======================================================
     EDIT USER
  ======================================================= */

  async function handleSaveUser() {
    if (!id || !user) return;

    setEditError("");

    if (!name.trim()) {
      setEditError(
        "Name is required."
      );
      return;
    }

    if (!email.trim()) {
      setEditError(
        "Email is required."
      );
      return;
    }

    try {
      setSaving(true);

      const response =
        await apiFetch(
          `/api/admin/users/${encodeURIComponent(
            id
          )}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              name: name.trim(),
              email: email
                .trim()
                .toLowerCase(),
              role,
              isActive,
            }),
          }
        );

      const data =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        setEditError(
          data?.message ||
            "Unable to update user."
        );
        return;
      }

      /*
       * Update local user immediately.
       */
      setUser((current) =>
        current
          ? {
              ...current,
              name: name.trim(),
              email: email
                .trim()
                .toLowerCase(),
              role,
              isActive,
            }
          : current
      );

      /*
       * Backend should revoke all sessions
       * when an account is deactivated.
       */
      if (!isActive) {
        setSessions([]);
      }

      setEditing(false);
    } catch (error) {
      console.error(
        "UPDATE USER ERROR:",
        error
      );

      setEditError(
        "Unable to update user. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     TERMINATE SESSION
  ======================================================= */

  async function terminateSession(
    session: Session
  ) {
    if (!id) return;

    try {
      setTerminatingSession(
        session.sessionId
      );

      const response =
        await apiFetch(
          `/api/admin/users/${encodeURIComponent(
            id
          )}/sessions/${encodeURIComponent(
            session.sessionId
          )}`,
          {
            method: "DELETE",
          }
        );

      const data =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Unable to terminate session."
        );
      }

      /*
       * Remove session from UI.
       */
      setSessions((current) =>
        current.filter(
          (item) =>
            item.sessionId !==
            session.sessionId
        )
      );

      setConfirmSession(null);
    } catch (error) {
      console.error(
        "TERMINATE SESSION ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to terminate session."
      );
    } finally {
      setTerminatingSession(null);
    }
  }
async function handleDeactivate() {
  if (!id) return

  try {
    setDeactivating(true)
    setError("")

    const response =
      await apiFetch(
        `/api/admin/users/${encodeURIComponent(
          id
        )}`,
        {
          method: "DELETE",
        }
      )

    const data =
      await response
        .json()
        .catch(() => null)

    if (!response.ok) {
      throw new Error(
        data?.message ||
          "Unable to deactivate user."
      )
    }

    setDeactivateOpen(false)

    setUser((current) =>
      current
        ? {
            ...current,
            isActive: false,
          }
        : current
    )

    setSessions([])
  } catch (error) {
    console.error(
      "DEACTIVATE USER ERROR:",
      error
    )

    setError(
      error instanceof Error
        ? error.message
        : "Unable to deactivate user."
    )
  } finally {
    setDeactivating(false)
  }
}
  /* =======================================================
     FORMAT DATE
  ======================================================= */

  function formatDate(
    value?: string
  ) {
    if (!value) return "—";

    return new Date(
      value
    ).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div
        className="
          px-6
          py-16
          text-center
          text-[12px]
          text-[#999]
          dark:text-[#777]
        "
      >
        Loading user...
      </div>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (error || !user) {
    return (
      <div
        className="
          mx-auto
          w-full
          max-w-[1100px]
          px-6
          py-10
        "
      >
        <BackButton />

        <div
          className="
            mt-6
            rounded-xl
            border
            border-red-200
            bg-red-50
            px-5
            py-4
            text-[12px]
            text-red-600

            dark:border-red-900/50
            dark:bg-red-950/30
            dark:text-red-400
          "
        >
          {error || "User not found."}
        </div>
      </div>
    );
  }

  /* =======================================================
     LOCK STATUS
  ======================================================= */

  const isLocked =
    user.lockedUntil &&
    new Date(user.lockedUntil) >
      new Date();

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div
      className="
        mx-auto
        w-full
        px-6
        py-10
        text-[#111]

        sm:px-8
        lg:px-12
        xl:px-16

        dark:text-white
      "
    >
      {/* ===================================================
          BACK
      =================================================== */}

      <BackButton />

      {/* ===================================================
          HEADER
      =================================================== */}

      <div
        className="
          mb-6
          mt-6
          flex
          flex-col
          gap-4

          sm:flex-row
          sm:items-start
          sm:justify-between
        "
      >
        <div className="flex items-center gap-3">

          {/* AVATAR */}

          <div
            className="
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-full
              bg-[#111]
              text-sm
              font-semibold
              text-white

              dark:bg-white
              dark:text-black
            "
          >
            {user.name
              .charAt(0)
              .toUpperCase()}
          </div>

          <div>

            <div className="flex flex-wrap items-center gap-2">

              <h1
                className="
                  text-[20px]
                  font-semibold
                  tracking-[-0.02em]
                  text-[#111]

                  dark:text-white
                "
              >
                {user.name}
              </h1>

              <Badge
                variant={
                  user.isActive
                    ? "success"
                    : "danger"
                }
              >
                {user.isActive
                  ? "Active"
                  : "Inactive"}
              </Badge>

              <Badge variant="default">
                {user.role}
              </Badge>

            </div>

            <p className="mt-1 text-[11px] text-[#888]">
              {user.email}
            </p>

          </div>
        </div>

        {/* HEADER ACTIONS */}

        <div className="flex flex-wrap gap-2">

          <AuthButton
            type="button"
            variant="outline"
            size="sm"
            fullWidth={false}
            onClick={() =>
              setEditing(
                (value) => !value
              )
            }
          >
            {editing ? (
              <X size={13} />
            ) : (
              <Pencil size={13} />
            )}

            {editing
              ? "Cancel"
              : "Edit"}
          </AuthButton>

          <AuthButton
            type="button"
            variant="outline"
            size="sm"
            fullWidth={false}
            onClick={() =>
              router.push(
                `/users/${id}/password`
              )
            }
          >
            <KeyRound size={13} />
            Reset Password
          </AuthButton>
{user.isActive && (
  <AuthButton
    type="button"
    variant="outline"
    size="sm"
    fullWidth={false}
    onClick={() =>
      setDeactivateOpen(true)
    }
    className="
      text-red-600
      hover:border-red-200
      hover:bg-red-50
    "
  >
    Deactivate
  </AuthButton>
)}
        </div>
      </div>

      {/* ===================================================
          GENERAL ERROR
      =================================================== */}

      {error && (
        <div
          className="
            mb-5
            rounded-lg
            border
            border-red-200
            bg-red-50
            px-4
            py-3
            text-[11px]
            text-red-600

            dark:border-red-900/50
            dark:bg-red-950/30
            dark:text-red-400
          "
        >
          {error}
        </div>
      )}

      {/* ===================================================
          EDIT PANEL
      =================================================== */}

      {editing && (
        <section
          className="
            mb-5
            overflow-hidden
            rounded-xl
            border
            border-[#e8e8e8]
            bg-white

            dark:border-[#2a2a2a]
            dark:bg-[#171717]
          "
        >
          {/* HEADER */}

          <div
            className="
              border-b
              border-[#eeeeee]
              px-5
              py-4

              dark:border-[#2a2a2a]
            "
          >
            <h2
              className="
                text-[12px]
                font-semibold
                text-[#222]

                dark:text-white
              "
            >
              Edit User
            </h2>

            <p className="mt-1 text-[11px] text-[#999]">
              Update account information
              and access settings.
            </p>
          </div>

          {/* FORM */}

          <div
            className="
              grid
              gap-5
              px-5
              py-5
              md:grid-cols-2
            "
          >
            {/* NAME */}

            <AuthInput
              id="edit-name"
              label="Name"
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value
                )
              }
            />

            {/* EMAIL */}

            <AuthInput
              id="edit-email"
              type="email"
              label="Email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
            />

            {/* ROLE */}

            <div>
              <label
                htmlFor="edit-role"
                className="
                  mb-2
                  block
                  text-[12px]
                  font-medium
                  text-[#262626]

                  dark:text-[#ddd]
                "
              >
                Role
              </label>

              <select
                id="edit-role"
                value={role}
                onChange={(event) =>
                  setRole(
                    event.target
                      .value as UserRole
                  )
                }
                className="
                  h-[42px]
                  w-full
                  rounded-xl
                  border
                  border-[#e5e5e5]
                  bg-white
                  px-4
                  text-[12px]
                  text-[#333]
                  outline-none
                  transition

                  focus:border-[#111]
                  focus:ring-2
                  focus:ring-[#111]/5

                  dark:border-[#333]
                  dark:bg-[#202020]
                  dark:text-white
                  dark:focus:border-white
                  dark:focus:ring-white/10
                "
              >
                <option value="staff">
                  Staff
                </option>

                <option value="manager">
                  Manager
                </option>

                <option value="admin">
                  Admin
                </option>
              </select>
            </div>

            {/* STATUS */}

            <div>
              <label
                htmlFor="edit-status"
                className="
                  mb-2
                  block
                  text-[12px]
                  font-medium
                  text-[#262626]

                  dark:text-[#ddd]
                "
              >
                Account Status
              </label>

              <select
                id="edit-status"
                value={
                  isActive
                    ? "active"
                    : "inactive"
                }
                onChange={(event) =>
                  setIsActive(
                    event.target.value ===
                      "active"
                  )
                }
                className="
                  h-[42px]
                  w-full
                  rounded-xl
                  border
                  border-[#e5e5e5]
                  bg-white
                  px-4
                  text-[12px]
                  text-[#333]
                  outline-none
                  transition

                  focus:border-[#111]
                  focus:ring-2
                  focus:ring-[#111]/5

                  dark:border-[#333]
                  dark:bg-[#202020]
                  dark:text-white
                  dark:focus:border-white
                  dark:focus:ring-white/10
                "
              >
                <option value="active">
                  Active
                </option>

                <option value="inactive">
                  Inactive
                </option>
              </select>
            </div>
          </div>

          {/* EDIT ERROR */}

          {editError && (
            <div className="px-5 pb-4">
              <div
                className="
                  rounded-lg
                  border
                  border-red-200
                  bg-red-50
                  px-3
                  py-2.5
                  text-[11px]
                  text-red-600

                  dark:border-red-900/50
                  dark:bg-red-950/30
                  dark:text-red-400
                "
              >
                {editError}
              </div>
            </div>
          )}

          {/* FOOTER */}

          <div
            className="
              flex
              justify-end
              gap-2
              border-t
              border-[#eeeeee]
              bg-[#fafafa]
              px-5
              py-4

              dark:border-[#2a2a2a]
              dark:bg-[#1c1c1c]
            "
          >
            <AuthButton
              type="button"
              variant="outline"
              size="sm"
              fullWidth={false}
              disabled={saving}
              onClick={() =>
                setEditing(false)
              }
            >
              Cancel
            </AuthButton>

            <AuthButton
              type="button"
              variant="secondary"
              size="sm"
              fullWidth={false}
              loading={saving}
              loadingText="Saving..."
              onClick={
                handleSaveUser
              }
            >
              <Check size={13} />
              Save Changes
            </AuthButton>
          </div>
        </section>
      )}

      {/* ===================================================
          ACCOUNT + SECURITY
      =================================================== */}

      <div
        className="
          grid
          gap-5
          lg:grid-cols-2
        "
      >
        {/* =================================================
            ACCOUNT
        ================================================= */}

        <section
          className="
            overflow-hidden
            rounded-xl
            border
            border-[#e8e8e8]
            bg-white

            dark:border-[#2a2a2a]
            dark:bg-[#171717]
          "
        >
          {/* HEADER */}

          <div
            className="
              flex
              items-center
              gap-2
              border-b
              border-[#eeeeee]
              px-5
              py-4

              dark:border-[#2a2a2a]
            "
          >
            <UserRound
              size={15}
              className="
                text-[#777]
                dark:text-[#aaa]
              "
            />

            <h2
              className="
                text-[12px]
                font-semibold
                text-[#222]

                dark:text-white
              "
            >
              Account Information
            </h2>
          </div>

          {/* ROWS */}

          <div
            className="
              divide-y
              divide-[#eeeeee]
              dark:divide-[#2a2a2a]
            "
          >
            <InfoRow
              label="Name"
              value={user.name}
            />

            <InfoRow
              label="Email"
              value={user.email}
            />

            <InfoRow
              label="Role"
              value={
                <span className="capitalize">
                  {user.role}
                </span>
              }
            />

            <InfoRow
              label="Status"
              value={
                <Badge
                  variant={
                    user.isActive
                      ? "success"
                      : "danger"
                  }
                >
                  {user.isActive
                    ? "Active"
                    : "Inactive"}
                </Badge>
              }
            />

            <InfoRow
              label="Created"
              value={formatDate(
                user.createdAt
              )}
            />
          </div>
        </section>

        {/* =================================================
            SECURITY
        ================================================= */}

        <section
          className="
            overflow-hidden
            rounded-xl
            border
            border-[#e8e8e8]
            bg-white

            dark:border-[#2a2a2a]
            dark:bg-[#171717]
          "
        >
          {/* HEADER */}

          <div
            className="
              flex
              items-center
              gap-2
              border-b
              border-[#eeeeee]
              px-5
              py-4

              dark:border-[#2a2a2a]
            "
          >
            <ShieldCheck
              size={15}
              className="
                text-[#777]
                dark:text-[#aaa]
              "
            />

            <h2
              className="
                text-[12px]
                font-semibold
                text-[#222]

                dark:text-white
              "
            >
              Security
            </h2>
          </div>

          {/* ROWS */}

          <div
            className="
              divide-y
              divide-[#eeeeee]
              dark:divide-[#2a2a2a]
            "
          >
            <InfoRow
              label="Active Sessions"
              value={sessions.length}
            />

            <InfoRow
              label="Failed Login Attempts"
              value={
                user.failedLoginAttempts ||
                0
              }
            />

            <InfoRow
              label="Account Lock"
              value={
                isLocked ? (
                  <Badge variant="danger">
                    Locked
                  </Badge>
                ) : (
                  <Badge variant="success">
                    Not locked
                  </Badge>
                )
              }
            />
          </div>
        </section>
      </div>

      {/* ===================================================
          SESSIONS
      =================================================== */}

      <section
        className="
          mt-5
          overflow-hidden
          rounded-xl
          border
          border-[#e8e8e8]
          bg-white

          dark:border-[#2a2a2a]
          dark:bg-[#171717]
        "
      >
        {/* HEADER */}

        <div
          className="
            flex
            items-center
            justify-between
            border-b
            border-[#eeeeee]
            px-5
            py-4

            dark:border-[#2a2a2a]
          "
        >
          <div className="flex items-center gap-2">

            <UserX
              size={15}
              className="
                text-[#777]
                dark:text-[#aaa]
              "
            />

            <div>
              <h2
                className="
                  text-[12px]
                  font-semibold
                  text-[#222]

                  dark:text-white
                "
              >
                Active Sessions
              </h2>

              <p className="mt-0.5 text-[10px] text-[#999]">
                Devices currently logged
                into this account.
              </p>
            </div>

          </div>

          <span className="text-[10px] text-[#999]">
            {sessions.length} active
          </span>
        </div>

        {/* EMPTY */}

        {sessions.length === 0 ? (
          <div className="px-5 py-10 text-center">

            <UserX
              size={20}
              className="
                mx-auto
                mb-2
                text-[#bbb]
                dark:text-[#666]
              "
            />

            <p className="text-[11px] text-[#999]">
              No active sessions.
            </p>

          </div>
        ) : (
          /* =================================================
             SESSION LIST
          ================================================= */

          <div
            className="
              divide-y
              divide-[#eeeeee]
              dark:divide-[#2a2a2a]
            "
          >
            {sessions.map(
              (session) => (
                <div
                  key={
                    session.sessionId
                  }
                  className="
                    px-5
                    py-4
                    transition
                    hover:bg-[#fafafa]

                    dark:hover:bg-[#1d1d1d]
                  "
                >
                  <div
                    className="
                      flex
                      flex-col
                      gap-4

                      lg:flex-row
                      lg:items-center
                      lg:justify-between
                    "
                  >
                    {/* DEVICE */}

                    <div className="min-w-0">

                      <div className="flex items-center gap-2">

                        <div
                          className="
                            flex
                            h-8
                            w-8
                            shrink-0
                            items-center
                            justify-center
                            rounded-lg
                            bg-[#f5f5f5]

                            dark:bg-[#252525]
                          "
                        >
                          <UserRound
                            size={14}
                            className="
                              text-[#777]
                              dark:text-[#aaa]
                            "
                          />
                        </div>

                        <div>

                          <p
                            className="
                              text-[12px]
                              font-medium
                              text-[#222]

                              dark:text-white
                            "
                          >
                            {getDeviceLabel(
  session.deviceName ?? ""
) || "Unknown device"}
                          </p>

                          <p className="mt-0.5 text-[10px] text-[#999]">
                            Device ID:{" "}
                            {session.deviceId}
                          </p>

                        </div>

                      </div>

                    </div>

                    {/* SESSION DETAILS */}

                    <div
                      className="
                        grid
                        grid-cols-1
                        gap-3
                        text-[10px]

                        sm:grid-cols-3

                        lg:min-w-[480px]
                      "
                    >
                      <SessionDetail
                        label="Created"
                        value={formatDate(
                          session.createdAt
                        )}
                      />

                      <SessionDetail
  label="Last used"
  value={formatDate(
    session.lastUsedAt ?? undefined
  )}
/>

                      <SessionDetail
                        label="Expires"
                        value={formatDate(
                          session.expiresAt
                        )}
                      />
                    </div>

                    {/* TERMINATE */}

                    <AuthButton
                      type="button"
                      variant="outline"
                      size="sm"
                      fullWidth={false}
                      disabled={
                        terminatingSession ===
                        session.sessionId
                      }
                      loading={
                        terminatingSession ===
                        session.sessionId
                      }
                      loadingText="Terminating..."
                      onClick={() =>
                        setConfirmSession(
                          session
                        )
                      }
                      className="
                        shrink-0
                        text-red-600
                        hover:border-red-200
                        hover:bg-red-50

                        dark:text-red-400
                        dark:hover:border-red-900
                        dark:hover:bg-red-950/30
                      "
                    >
                      Terminate
                    </AuthButton>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>

    <Modal
  open={deactivateOpen}
  onClose={() =>
    !deactivating &&
    setDeactivateOpen(false)
  }
  title="Deactivate user?"
  description="This will disable the account and terminate all active sessions."
>
  <div className="rounded-lg bg-[#fafafa] dark:bg-black/30 px-4 py-3">
    <p className="text-[11px] font-medium text-[#333] dark:text-white">
      {user.name}
    </p>

    <p className="mt-1 text-[10px] text-[#999]">
      {user.email}
    </p>
  </div>

  <div className="mt-5 flex justify-end gap-2">
    <AuthButton
      type="button"
      variant="outline"
      size="sm"
      fullWidth={false}
      disabled={deactivating}
      onClick={() =>
        setDeactivateOpen(false)
      }
    >
      Cancel
    </AuthButton>

    <AuthButton
      type="button"
      variant="danger"
      size="sm"
      fullWidth={false}
      loading={deactivating}
      loadingText="Deactivating..."
      onClick={handleDeactivate}
    >
      Deactivate User
    </AuthButton>
  </div>
</Modal>
      {confirmSession && (
        <div
          className="
            fixed
            inset-0
            z-50
            flex
            items-center
            justify-center
            bg-black/30
            px-4
            backdrop-blur-[2px]

            dark:bg-black/60
          "
        >
          <div
            className="
              w-full
              max-w-[400px]
              rounded-xl
              border
              border-[#e8e8e8]
              bg-white
              p-5
              shadow-xl

              dark:border-[#333]
              dark:bg-[#181818]
              dark:shadow-black/40
            "
          >
            {/* TITLE */}

            <h3
              className="
                text-[14px]
                font-semibold
                text-[#111]

                dark:text-white
              "
            >
              Terminate session?
            </h3>

            {/* DESCRIPTION */}

            <p
              className="
                mt-2
                text-[11px]
                leading-5
                text-[#777]

                dark:text-[#999]
              "
            >
              This will immediately log
              out the device from this
              account.
            </p>

            {/* DEVICE */}

            <div
              className="
                mt-4
                rounded-lg
                bg-[#fafafa]
                px-3
                py-3

                dark:bg-[#222]
              "
            >
              <p
                className="
                  text-[11px]
                  font-medium
                  text-[#333]

                  dark:text-[#ddd]
                "
              >
               {getDeviceLabel(
  confirmSession.deviceName ?? ""
) || "Unknown device"}
              </p>

              <p
                className="
                  mt-1
                  break-all
                  text-[10px]
                  text-[#999]
                "
              >
                {confirmSession.deviceId}
              </p>
            </div>

            {/* ACTIONS */}

            <div className="mt-5 flex justify-end gap-2">

              <AuthButton
                type="button"
                variant="outline"
                size="sm"
                fullWidth={false}
                disabled={
                  !!terminatingSession
                }
                onClick={() =>
                  setConfirmSession(null)
                }
              >
                Cancel
              </AuthButton>

              <AuthButton
                type="button"
                variant="danger"
                size="sm"
                fullWidth={false}
                loading={
                  !!terminatingSession
                }
                loadingText="Terminating..."
                onClick={() =>
                  terminateSession(
                    confirmSession
                  )
                }
              >
                Terminate Session
              </AuthButton>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   INFO ROW
========================================================= */

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div
      className="
        flex
        items-center
        justify-between
        gap-5
        px-5
        py-3.5
      "
    >
      <span
        className="
          text-[11px]
          text-[#888]
        "
      >
        {label}
      </span>

      <span
        className="
          max-w-[65%]
          text-right
          text-[11px]
          font-medium
          text-[#333]

          dark:text-[#ddd]
        "
      >
        {value}
      </span>
    </div>
  );
}

/* =========================================================
   SESSION DETAIL
========================================================= */

function SessionDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p
        className="
          text-[9px]
          uppercase
          tracking-[0.06em]
          text-[#aaa]
        "
      >
        {label}
      </p>

      <p
        className="
          mt-1
          text-[10px]
          text-[#555]

          dark:text-[#ccc]
        "
      >
        {value}
      </p>
    </div>
  );
}
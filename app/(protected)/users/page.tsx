"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  Plus,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import PageHeader from "@/components/ui/PageHeader";
import Pagination from "@/components/ui/Pagination";
import UserFilters from "@/components/users/UserFilters";
import UsersTable, {
  AdminUser,
} from "@/components/ui/UsersTable";

import AuthButton from "@/components/auth/AuthButton";

import {
  apiFetch,
} from "@/lib/api-fetch";

import BackButton from "@/components/ui/BackButton";

/* =========================================================
   TYPES
========================================================= */

type UsersResponse = {
  success: boolean;

  users: AdminUser[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  message?: string;
};

/* =========================================================
   PAGE
========================================================= */

export default function UsersPage() {
  const router = useRouter();

  /* =======================================================
     STATE
  ======================================================= */

  const [users, setUsers] =
    useState<AdminUser[]>([]);

  const [search, setSearch] =
    useState("");

  const [role, setRole] =
    useState("");

  const [status, setStatus] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [totalPages, setTotalPages] =
    useState(1);

  const [total, setTotal] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /* =======================================================
     LOAD USERS
  ======================================================= */

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");

      const params =
        new URLSearchParams();

      params.set(
        "page",
        String(page)
      );

      params.set(
        "limit",
        "20"
      );

      if (search.trim()) {
        params.set(
          "search",
          search.trim()
        );
      }

      if (role) {
        params.set(
          "role",
          role
        );
      }

      if (status) {
        params.set(
          "isActive",
          status === "active"
            ? "true"
            : "false"
        );
      }

      const response =
        await apiFetch(
          `/api/admin/users?${params.toString()}`,
          {
            method: "GET",
            credentials: "include",
          }
        );

      const data: UsersResponse =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Unable to load users"
        );
      }

      setUsers(
        data.users || []
      );

      setTotal(
        data.pagination?.total ||
          0
      );

      setTotalPages(
        data.pagination
          ?.totalPages || 1
      );
    } catch (error) {
      console.error(
        "LOAD USERS ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load users"
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     FILTER / PAGINATION LOAD
  ======================================================= */

  useEffect(() => {
    loadUsers();
  }, [
    page,
    role,
    status,
  ]);

  /* =======================================================
     SEARCH
  ======================================================= */

  useEffect(() => {
    const timeout =
      setTimeout(() => {
        if (page !== 1) {
          setPage(1);
          return;
        }

        loadUsers();
      }, 400);

    return () =>
      clearTimeout(timeout);
  }, [search]);

  /* =======================================================
     CLEAR FILTERS
  ======================================================= */

  function clearFilters() {
    setSearch("");
    setRole("");
    setStatus("");
    setPage(1);
  }

  /* =======================================================
     VIEW USER
  ======================================================= */

  function handleView(
    user: AdminUser
  ) {
    router.push(
      `/users/${user.id}`
    );
  }

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

        sm:px-8
        lg:px-12
        xl:px-16

        text-[#111]
        dark:text-white
      "
    >

      {/* =================================================
          BACK BUTTON
      ================================================= */}

      <BackButton />

      {/* =================================================
          HEADER
      ================================================= */}

      <PageHeader
        title="Users"
        description={`${total} users in your organization`}
        action={
          <AuthButton
            type="button"
            onClick={() =>
              router.push(
                "/users/create"
              )
            }
          >
            <Plus
              size={14}
              strokeWidth={2}
            />

            Add User
          </AuthButton>
        }
      />

      {/* =================================================
          FILTERS
      ================================================= */}

      <div className="mt-6">
        <UserFilters
          search={search}
          role={role}
          status={status}
          onSearchChange={
            setSearch
          }
          onRoleChange={(value) => {
            setRole(value);
            setPage(1);
          }}
          onStatusChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          onClear={
            clearFilters
          }
        />
      </div>

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div
          className="
            mb-4
            mt-5
            rounded-lg
            border
            border-red-200
            bg-red-50
            px-4
            py-3
            text-[12px]
            text-red-600

            dark:border-red-900/50
            dark:bg-red-950/30
            dark:text-red-400
          "
        >
          {error}
        </div>
      )}

      {/* =================================================
          CONTENT
      ================================================= */}

      {loading ? (
        <div
          className="
            mt-5
            rounded-xl
            border
            border-[#e8e8e8]
            bg-white
            px-6
            py-12
            text-center
            text-[12px]
            text-[#888]

            dark:border-[#2a2a2a]
            dark:bg-[#171717]
            dark:text-[#777]
          "
        >
          Loading users...
        </div>
      ) : (
        <>
          {/* =================================================
              TABLE
          ================================================= */}

          <div className="mt-5">
            <UsersTable
              users={users}
              onView={handleView}
            />
          </div>

          {/* =================================================
              PAGINATION
          ================================================= */}

          <div className="mt-5">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={
                setPage
              }
            />
          </div>
        </>
      )}
    </div>
  );
}
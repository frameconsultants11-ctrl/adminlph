
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import { useTheme } from "next-themes";

import {
  Brain,
  Compass,
  ChevronDown,
  ChevronRight,
  Box,
  Heart,
  Cuboid,
  Folder,
  FolderPlus,
  PanelLeftClose,
  PanelLeftOpen,
  Layers,
  Palette,
  PlaySquare,
  Sun,
  Moon,
  Monitor,
  Check,
  Menu,
  X,
  User2,
  UserCheckIcon,
  LockIcon,
  HistoryIcon,
  ToolCase,
  Toolbox,
  Lightbulb,
  Ribbon,
  UserCircle2,
  MonitorDotIcon,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

import { useSession } from "@/lib/session-context";
import LogoutButton from "./auth/LogoutButton";

/* =========================================================
   TYPES
========================================================= */

export interface SidebarItem {
  label: string;
  icon: LucideIcon;

  /*
   * Optional route.
   *
   * If href exists and children don't exist,
   * this becomes a normal clickable link.
   */
  href?: string;

  /*
   * Optional badge.
   */
  badge?: number | string;

  /*
   * Optional children.
   *
   * This allows unlimited nesting.
   */
  children?: SidebarItem[];
}

export interface FolderItem {
  label: string;

  /*
   * Folder icon is optional.
   */
  icon?: LucideIcon;

  /*
   * Optional Tailwind color.
   */
  color?: string;

  /*
   * Folder can have its own route.
   */
  href?: string;

  /*
   * Folder can also contain nested items.
   */
  children?: SidebarItem[];
}

interface SidebarProps {
  children: ReactNode;
}

/* =========================================================
   MENU DATA
========================================================= */

const menuItems: SidebarItem[] = [
  {
    label: "Explore",
    icon: Compass,

    children: [
      {
        label: "Designs",
        icon: Palette,
        href: "/explore/designs",
      },

      {
        label: "Animations",
        icon: PlaySquare,
        href: "/explore/animations",
      },
    ],
  },

  {
    label: "Assets",
    icon: Box,
    badge: 112,

    children: [
      {
        label: "3D Objects",
        icon: Cuboid,
        href: "/assets/3d-objects",
      },

      {
        label: "Materials",
        icon: Layers,
        href: "/assets/materials",
      },
    ],
  },

  {
    label: "Content",
    icon: Box,
    badge: 112,

    children: [
      {
        label: "3D Objects",
        icon: Cuboid,
        href: "/content/3d-objects",
      },

      {
        label: "Materials",
        icon: Layers,
        href: "/content/materials",
      },

      /*
       * Example nested submenu
       */

      {
        label: "Advanced",
        icon: Layers,

        children: [
          {
            label: "Templates",
            icon: Palette,

            children: [
              {
                label: "Marketing",
                icon: Palette,
                href: "/content/templates/marketing",
              },

              {
                label: "Education",
                icon: Palette,
                href: "/content/templates/education",
              },
            ],
          },

          {
            label: "Presets",
            icon: Cuboid,
            href: "/content/advanced/presets",
          },
        ],
      },
    ],
  },

  /*
   * Example item without submenu
   */

  {
    label: "Dashboard",
    icon: Brain,
    href: "/dashboard",
  },
];

/* =========================================================
   FOLDERS
========================================================= */

const folders: FolderItem[] = [
 {
    label: "Skills & Tools",
    icon: ToolCase,
    color: "text-black-500",

    children: [
      {
        label: "Tools Teach",
        icon: Toolbox,
        href: "/tools",
      },

      {
        label: "Skills Known",
        icon: Lightbulb,
        href: "/skills",
      },
       {
        label: "Certifications",
        icon: Ribbon,
        href: "/certifications",
      },
    ],
  },

  {
    label: "Users Info",
    icon: UserCheckIcon,
    color: "text-green-500",

    children: [
      {
        label: "Users",
        icon: User2,
        href: "/users",
      },

      {
        label: "Security",
        icon: LockIcon,
        href: "/security",
      },

      /*
       * Nested folder submenu
       */

      {
        label: "Audit Logs",
        icon: HistoryIcon,
        href: "/audit-logs",
      },
    ],
  },
];
const sidebarEase = [
  0.22,
  1,
  0.36,
  1,
] as const;

const sidebarTransition = {
  duration: 0.28,
  ease: sidebarEase,
};

const submenuVariants = {
  hidden: {
    height: 0,
    opacity: 0,
  },

  visible: {
    height: "auto",
    opacity: 1,

    transition: {
      height: {
        duration: 0.25,
        ease: sidebarEase,
      },

      opacity: {
        duration: 0.18,
      },
    },
  },

  exit: {
    height: 0,
    opacity: 0,

    transition: {
      height: {
        duration: 0.22,
        ease: sidebarEase,
      },

      opacity: {
        duration: 0.12,
      },
    },
  },
};

/* =========================================================
   SIDEBAR
========================================================= */

export default function Sidebar({
  children,
}: SidebarProps) {
  /*
   * IMPORTANT:
   *
   * pathname comes ONLY from usePathname().
   *
   * We never use window.location.pathname.
   */

  const pathname = usePathname();

  const { session } = useSession();

  /* =======================================================
     STATE
  ======================================================= */

  const [collapsed, setCollapsed] =
    useState(false);

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [themeOpen, setThemeOpen] =
    useState(false);

  const [openMenus, setOpenMenus] =
    useState<Record<string, boolean>>({});

  /* =======================================================
     AUTO OPEN ACTIVE MENU PATHS
  ======================================================= */

  const activeParentKeys = useMemo(() => {
    const keys: string[] = [];

    const walk = (
      items: SidebarItem[],
      parents: string[] = [],
    ) => {
      items.forEach((item) => {
        const currentPath = [
          ...parents,
          item.label,
        ];

        if (
          item.children &&
          item.children.length > 0
        ) {
          if (
            hasActiveChild(
              item,
              pathname,
            )
          ) {
            keys.push(
              currentPath.join("/"),
            );
          }

          walk(
            item.children,
            currentPath,
          );
        }
      });
    };

    walk(menuItems);

    return keys;
  }, [pathname]);

  /* =======================================================
     OPEN ACTIVE MENUS
  ======================================================= */

  useEffect(() => {
    if (
      activeParentKeys.length === 0
    ) {
      return;
    }

    setOpenMenus((previous) => {
      const next = {
        ...previous,
      };

      activeParentKeys.forEach(
        (key) => {
          next[key] = true;
        },
      );

      return next;
    });
  }, [activeParentKeys]);

  /* =======================================================
     BODY SCROLL LOCK ON MOBILE
  ======================================================= */

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [mobileOpen]);

  /* =======================================================
     CLOSE MOBILE AFTER ROUTE CHANGE
  ======================================================= */

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  /* =======================================================
     ACTIVE ROUTE
  ======================================================= */

  const isActive = (
    href?: string,
  ) => {
    if (!href) {
      return false;
    }

    return (
      pathname === href ||
      pathname.startsWith(
        `${href}/`,
      )
    );
  };

  /* =======================================================
     MENU TOGGLE
  ======================================================= */

  const toggleMenu = (
    key: string,
  ) => {
    setOpenMenus((previous) => ({
      ...previous,

      [key]: !previous[key],
    }));
  };

  /* =======================================================
     COLLAPSE
  ======================================================= */

  const handleCollapse = () => {
    setThemeOpen(false);

    setCollapsed(
      (previous) => !previous,
    );
  };

  /* =======================================================
     MOBILE CLOSE
  ======================================================= */

  const closeMobile = () => {
    setMobileOpen(false);
  };

  /* =======================================================
     SIDEBAR CONTENT
  ======================================================= */

  const sidebarContent = (
    <>
      {/* =================================================
          LOGO
      ================================================= */}

      <div
        className={`
          flex
          h-[82px]
          shrink-0
          items-center
          border-b
          border-[#eeeeee]
          dark:border-[#242424]

          ${
            collapsed
              ? "justify-center"
              : "px-6"
          }
        `}
      >
        <motion.div
          layout
          className="
            flex
            items-center
          "
        >
          {/* LOGO ICON */}

          <motion.div
            layout
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-[#111]
              dark:bg-white
            "
          >
            <Brain
              size={25}
              strokeWidth={2.3}
              className="
                text-white
                dark:text-[#111]
              "
            />
          </motion.div>

          {/* LOGO TEXT */}

          <AnimatePresence
            initial={false}
          >
            {!collapsed && (
              <motion.span
                initial={{
                  opacity: 0,
                  width: 0,
                  x: -8,
                }}
                animate={{
                  opacity: 1,
                  width: "auto",
                  x: 0,
                }}
                exit={{
                  opacity: 0,
                  width: 0,
                  x: -8,
                }}
                transition={{
                  duration: 0.2,
                }}
                className="
                  ml-2
                  overflow-hidden
                  whitespace-nowrap
                  text-[20px]
                  font-bold
                  tracking-[-0.03em]
                  text-[#111]
                  dark:text-white
                "
              >
                LearnPerHour
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* =================================================
          NAVIGATION
      ================================================= */}

      <div
        className="
          min-h-0
          flex-1
          overflow-y-auto
          overflow-x-visible
          px-3
          py-4
        "
      >
        {/* MAIN MENU */}

        <div className="space-y-1">
          {menuItems.map(
            (item) => (
              <NavItem
                key={item.label}
                item={item}
                level={0}
                collapsed={collapsed}
                pathname={pathname}
                openMenus={openMenus}
                toggleMenu={toggleMenu}
                isActive={isActive}
              />
            ),
          )}
        </div>

        {/* =================================================
            DIVIDER
        ================================================= */}

        <div
          className="
            my-5
            h-px
            bg-[#ededed]
            dark:bg-[#292929]
          "
        />

        {/* =================================================
            LIKES
        ================================================= */}

        <SidebarLink
          href="/likes"
          label="Likes"
          icon={Heart}
          collapsed={collapsed}
          active={isActive(
            "/likes",
          )}
        />

        <div className="mt-7">
          {!collapsed && (
            <p
              className="
                mb-2
                px-3
                text-[11px]
                font-medium
                uppercase
                tracking-[0.08em]
                text-[#a0a0a0]
              "
            >
              Trainers
            </p>
          )}

          <SidebarLink
            href="/trainers"
            label="Trainers"
            icon={UserCircle2}
            collapsed={collapsed}
            active={isActive(
              "/trainers",
            )}
          />
        </div>

        {/* =================================================
            FOLDERS
        ================================================= */}

        <div className="mt-5">
          <SidebarLink
            href="/course"
            label="Course"
            icon={MonitorDotIcon}
            collapsed={collapsed}
            active={isActive(
              "/course",
            )}
          />

          <div className="mt-1 space-y-1">
            {folders.map(
              (folder) => (
                <FolderNavItem
                  key={folder.label}
                  folder={folder}
                  level={0}
                  collapsed={collapsed}
                  pathname={pathname}
                  openMenus={openMenus}
                  toggleMenu={toggleMenu}
                  isActive={isActive}
                />
              ),
            )}
          </div>
        </div>
      </div>

      {/* =================================================
          BOTTOM AREA
      ================================================= */}

      <div
        className="
          relative
          shrink-0
          border-t
          border-[#eeeeee]
          bg-white
          p-3
          dark:border-[#242424]
          dark:bg-[#151515]
        "
      >
        {/* =================================================
            PROFILE
        ================================================= */}

        <Link
          href="/profile"
          className={`
            group
            relative
            flex
            h-12
            w-full
            items-center
            rounded-xl
            transition-colors
            hover:bg-[#f5f5f5]
            dark:hover:bg-[#202020]

            ${
              collapsed
                ? "justify-center"
                : "px-2"
            }
          `}
        >
          {/* AVATAR */}

          <div
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-full
              bg-[#111]
              text-xs
              font-semibold
              text-white
              dark:bg-white
              dark:text-black
            "
          >
            PS
          </div>

          {/* USER */}

          <AnimatePresence
            initial={false}
          >
            {!collapsed && (
              <motion.div
                initial={{
                  opacity: 0,
                  width: 0,
                }}
                animate={{
                  opacity: 1,
                  width: "auto",
                }}
                exit={{
                  opacity: 0,
                  width: 0,
                }}
                className="
                  ml-3
                  min-w-0
                  flex-1
                  overflow-hidden
                  text-left
                "
              >
                <p
                  className="
                    truncate
                    text-[13px]
                    font-semibold
                    text-[#222]
                    dark:text-white
                  "
                >
                  {session?.user?.name ||
                    "User"}
                </p>

                <p
                  className="
                    truncate
                    text-[11px]
                    text-[#888]
                  "
                >
                  View profile
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {!collapsed && (
            <ChevronRight
              size={15}
              className="text-[#999]"
            />
          )}

          {collapsed && (
            <Tooltip text="Profile" />
          )}
        </Link>

        {/* =================================================
            THEME
        ================================================= */}

        <div className="mt-1">
          <ThemeSwitcher
            collapsed={collapsed}
            open={themeOpen}
            setOpen={setThemeOpen}
          />
        </div>

        {/* =================================================
            LOGOUT
        ================================================= */}

        <div className="mt-1">
          <LogoutButton
            collapsed={collapsed}
          />
        </div>

        {/* =================================================
            COLLAPSE
        ================================================= */}

        <button
          type="button"
          onClick={handleCollapse}
          className={`
            group
            relative
            mt-1
            flex
            h-11
            w-full
            items-center
            rounded-xl
            text-[#666]
            transition-colors
            hover:bg-[#f5f5f5]
            hover:text-[#111]
            dark:text-[#999]
            dark:hover:bg-[#202020]
            dark:hover:text-white

            ${
              collapsed
                ? "justify-center"
                : "px-3"
            }
          `}
        >
          <motion.div
            animate={{
              rotate: collapsed
                ? 180
                : 0,
            }}
            transition={
              sidebarTransition
            }
          >
            {collapsed ? (
              <PanelLeftOpen
                size={19}
                strokeWidth={1.8}
              />
            ) : (
              <PanelLeftClose
                size={19}
                strokeWidth={1.8}
              />
            )}
          </motion.div>

          <AnimatePresence
            initial={false}
          >
            {!collapsed && (
              <motion.span
                initial={{
                  opacity: 0,
                  width: 0,
                }}
                animate={{
                  opacity: 1,
                  width: "auto",
                }}
                exit={{
                  opacity: 0,
                  width: 0,
                }}
                className="
                  ml-3
                  overflow-hidden
                  whitespace-nowrap
                  text-[13px]
                "
              >
                Collapse
              </motion.span>
            )}
          </AnimatePresence>

          {collapsed && (
            <Tooltip text="Expand sidebar" />
          )}
        </button>
      </div>
    </>
  );

  /* =======================================================
     RETURN
  ======================================================= */

  return (
    <div
      className="
        min-h-screen
        bg-[#f7f7f7]
        font-sans
        dark:bg-[#111111]
      "
    >
      {/* =================================================
          MOBILE HEADER
      ================================================= */}

      <div
        className="
          fixed
          left-0
          right-0
          top-0
          z-40
          flex
          h-16
          items-center
          justify-between
          border-b
          border-[#e9e9e9]
          bg-white/95
          px-4
          backdrop-blur
          dark:border-[#242424]
          dark:bg-[#151515]/95
          lg:hidden
        "
      >
        <div className="flex items-center gap-2">
          <div
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-lg
              bg-[#111]
              dark:bg-white
            "
          >
            <Brain
              size={21}
              className="
                text-white
                dark:text-[#111]
              "
            />
          </div>

          <span
            className="
              text-[17px]
              font-bold
              text-[#111]
              dark:text-white
            "
          >
            LearnPerHour
          </span>
        </div>

        <button
          type="button"
          onClick={() =>
            setMobileOpen(true)
          }
          aria-label="Open navigation"
          className="
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-xl
            text-[#444]
            hover:bg-[#f3f3f3]
            dark:text-[#ddd]
            dark:hover:bg-[#242424]
          "
        >
          <Menu size={21} />
        </button>
      </div>

      {/* =================================================
          MOBILE OVERLAY
      ================================================= */}

      <AnimatePresence>
        {mobileOpen && (
          <motion.button
            type="button"
            aria-label="Close navigation"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            onClick={closeMobile}
            className="
              fixed
              inset-0
              z-40
              bg-black/40
              backdrop-blur-[2px]
              lg:hidden
            "
          />
        )}
      </AnimatePresence>

      {/* =================================================
          DESKTOP SIDEBAR
      ================================================= */}

      <motion.aside
        initial={false}
        animate={{
          width: collapsed
            ? 76
            : 280,
        }}
        transition={
          sidebarTransition
        }
        className="
          fixed
          left-0
          top-0
          z-50
          hidden
          h-screen
          flex-col
          overflow-visible
          border-r
          border-[#e9e9e9]
          bg-white
          dark:border-[#242424]
          dark:bg-[#151515]
          lg:flex
        "
      >
        {sidebarContent}
      </motion.aside>

      {/* =================================================
          MOBILE SIDEBAR
      ================================================= */}

      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{
              x: "-100%",
            }}
            animate={{
              x: 0,
            }}
            exit={{
              x: "-100%",
            }}
            transition={{
              duration: 0.28,
              ease: sidebarEase,
            }}
            className="
              fixed
              left-0
              top-0
              z-50
              flex
              h-screen
              w-[290px]
              flex-col
              overflow-visible
              border-r
              border-[#e9e9e9]
              bg-white
              shadow-2xl
              dark:border-[#242424]
              dark:bg-[#151515]
              lg:hidden
            "
          >
            {/* CLOSE BUTTON */}

            <button
              type="button"
              onClick={closeMobile}
              aria-label="Close navigation"
              className="
                absolute
                right-3
                top-5
                z-10
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-lg
                text-[#666]
                hover:bg-[#f3f3f3]
                dark:text-[#aaa]
                dark:hover:bg-[#242424]
              "
            >
              <X size={19} />
            </button>

            {/*
             * Mobile sidebar should always be expanded.
             *
             * Therefore temporarily render with the
             * expanded state.
             */}

            <MobileSidebarContent
              sessionName={
                session?.user?.name
              }
              pathname={pathname}
              openMenus={openMenus}
              toggleMenu={toggleMenu}
              isActive={isActive}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <main
        className="
          min-h-screen
          bg-[#f7f7f7]
          pt-16
          dark:bg-[#111111]
          lg:pt-0
          lg:transition-[margin]
          lg:duration-300
        "
        style={
          {
            "--sidebar-width":
              collapsed
                ? "76px"
                : "280px",
          } as React.CSSProperties
        }
      >
        <div
          className="
            ml-0
            lg:ml-[var(--sidebar-width)]
          "
        >
          {children}
        </div>
      </main>
    </div>
  );
}

/* =========================================================
   MOBILE SIDEBAR CONTENT

   Mobile always stays expanded.
========================================================= */

interface MobileSidebarContentProps {
  sessionName?: string | null;
  pathname: string;
  openMenus: Record<string, boolean>;
  toggleMenu: (key: string) => void;
  isActive: (href?: string) => boolean;
}

function MobileSidebarContent({
  sessionName,
  pathname,
  openMenus,
  toggleMenu,
  isActive,
}: MobileSidebarContentProps) {
  return (
    <>
      {/* =================================================
          LOGO
      ================================================= */}

      <div
        className="
          flex
          h-[82px]
          shrink-0
          items-center
          border-b
          border-[#eeeeee]
          px-6
          dark:border-[#242424]
        "
      >
        <div className="flex items-center">
          <div
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-[#111]
              dark:bg-white
            "
          >
            <Brain
              size={25}
              strokeWidth={2.3}
              className="
                text-white
                dark:text-[#111]
              "
            />
          </div>

          <span
            className="
              ml-2
              whitespace-nowrap
              text-[20px]
              font-bold
              tracking-[-0.03em]
              text-[#111]
              dark:text-white
            "
          >
            LearnPerHour
          </span>
        </div>
      </div>

      {/* =================================================
          NAVIGATION
      ================================================= */}

      <div
        className="
          min-h-0
          flex-1
          overflow-y-auto
          px-3
          py-4
        "
      >
        <div className="space-y-1">
          {menuItems.map(
            (item) => (
              <NavItem
                key={item.label}
                item={item}
                level={0}
                collapsed={false}
                pathname={pathname}
                openMenus={openMenus}
                toggleMenu={toggleMenu}
                isActive={isActive}
              />
            ),
          )}
        </div>

        <div
          className="
            my-5
            h-px
            bg-[#ededed]
            dark:bg-[#292929]
          "
        />

        <SidebarLink
          href="/likes"
          label="Likes"
          icon={Heart}
          collapsed={false}
          active={isActive(
            "/likes",
          )}
        />

        <div className="mt-7">
          <p
            className="
              mb-2
              px-3
              text-[11px]
              font-medium
              uppercase
              tracking-[0.08em]
              text-[#a0a0a0]
            "
          >
            My scenes
          </p>

          <SidebarLink
            href="/scenes"
            label="My Scenes"
            icon={Box}
            collapsed={false}
            active={isActive(
              "/scenes",
            )}
          />
        </div>

        <div className="mt-5">
          <SidebarLink
            href="/folders/new"
            label="Course"
            icon={FolderPlus}
            collapsed={false}
            active={isActive(
              "/folders/new",
            )}
          />

          <div className="mt-1 space-y-1">
            {folders.map(
              (folder) => (
                <FolderNavItem
                  key={folder.label}
                  folder={folder}
                  level={0}
                  collapsed={false}
                  pathname={pathname}
                  openMenus={openMenus}
                  toggleMenu={toggleMenu}
                  isActive={isActive}
                />
              ),
            )}
          </div>
        </div>
      </div>

      {/* =================================================
          MOBILE BOTTOM
      ================================================= */}

      <div
        className="
          shrink-0
          border-t
          border-[#eeeeee]
          bg-white
          p-3
          dark:border-[#242424]
          dark:bg-[#151515]
        "
      >
        <Link
          href="/profile"
          className="
            flex
            h-12
            w-full
            items-center
            rounded-xl
            px-2
            hover:bg-[#f5f5f5]
            dark:hover:bg-[#202020]
          "
        >
          <div
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-full
              bg-[#111]
              text-xs
              font-semibold
              text-white
              dark:bg-white
              dark:text-black
            "
          >
            PS
          </div>

          <div className="ml-3 min-w-0">
            <p
              className="
                truncate
                text-[13px]
                font-semibold
                text-[#222]
                dark:text-white
              "
            >
              {sessionName || "User"}
            </p>

            <p
              className="
                truncate
                text-[11px]
                text-[#888]
              "
            >
              View profile
            </p>
          </div>

          <ChevronRight
            size={15}
            className="ml-auto text-[#999]"
          />
        </Link>

        <div className="mt-1">
          <ThemeSwitcher
            collapsed={false}
            open={false}
            setOpen={() => {}}
          />
        </div>

        <div className="mt-1">
          <LogoutButton
            collapsed={false}
          />
        </div>
      </div>
    </>
  );
}

/* =========================================================
   NAV ITEM
========================================================= */

interface NavItemProps {
  item: SidebarItem;
  level: number;
  collapsed: boolean;

  /*
   * IMPORTANT:
   * pathname is explicitly passed here.
   */
  pathname: string;

  openMenus: Record<
    string,
    boolean
  >;

  toggleMenu: (
    key: string,
  ) => void;

  isActive: (
    href?: string,
  ) => boolean;
}

function NavItem({
  item,
  level,
  collapsed,
  pathname,
  openMenus,
  toggleMenu,
  isActive,
}: NavItemProps) {
  const Icon = item.icon;

  const hasChildren =
    !!item.children?.length;

  const key = getItemKey(
    item,
    level,
  );

  const open =
    !!openMenus[key];

  const active = item.href
    ? isActive(item.href)
    : false;

  const childActive =
    hasChildren
      ? item.children!.some(
          (child) =>
            hasActiveChild(
              child,
              pathname,
            ),
        )
      : false;

  const parentActive =
    active || childActive;

  /* =======================================================
     NO CHILDREN
  ======================================================= */

  if (!hasChildren) {
    if (!item.href) {
      return null;
    }

    return (
      <SidebarLink
        href={item.href}
        label={item.label}
        icon={Icon}
        collapsed={collapsed}
        active={active}
        level={level}
        badge={item.badge}
      />
    );
  }

  /* =======================================================
     HAS CHILDREN
  ======================================================= */

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() =>
          toggleMenu(key)
        }
        className={`
          group
          relative
          flex
          h-11
          w-full
          items-center
          rounded-xl
          transition-colors

          ${
            parentActive
              ? "bg-[#f1f1f1] text-[#111] dark:bg-[#242424] dark:text-white"
              : "text-[#202020] hover:bg-[#f5f5f5] dark:text-[#d4d4d4] dark:hover:bg-[#202020]"
          }

          ${
            collapsed
              ? "justify-center"
              : "px-3"
          }
        `}
      >
        {/* ICON */}

        <Icon
          size={
            level > 0
              ? 17
              : 20
          }
          strokeWidth={1.8}
          className={`
            shrink-0

            ${
              parentActive
                ? "text-[#111] dark:text-white"
                : "text-[#555] dark:text-[#999]"
            }
          `}
        />

        {/* LABEL */}

        <AnimatePresence
          initial={false}
        >
          {!collapsed && (
            <motion.div
              initial={{
                opacity: 0,
                width: 0,
              }}
              animate={{
                opacity: 1,
                width: "auto",
              }}
              exit={{
                opacity: 0,
                width: 0,
              }}
              className="
                ml-3
                flex
                min-w-0
                flex-1
                items-center
                overflow-hidden
              "
            >
              <span
                className="
                  flex-1
                  truncate
                  whitespace-nowrap
                  text-left
                  text-[14px]
                  font-medium
                "
              >
                {item.label}
              </span>

              {item.badge !==
                undefined && (
                <span
                  className="
                    ml-2
                    shrink-0
                    rounded-md
                    border
                    border-[#dedede]
                    bg-white
                    px-2
                    py-0.5
                    text-[11px]
                    text-[#777]
                    dark:border-[#333]
                    dark:bg-[#1d1d1d]
                    dark:text-[#999]
                  "
                >
                  {item.badge}
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* CHEVRON */}

        {!collapsed && (
          <motion.div
            animate={{
              rotate: open
                ? 0
                : -90,
            }}
            transition={{
              duration: 0.18,
            }}
          >
            <ChevronDown
              size={15}
              className="text-[#777]"
            />
          </motion.div>
        )}

        {/* TOOLTIP */}

        {collapsed && (
          <Tooltip
            text={item.label}
          />
        )}
      </button>

      {/* =================================================
          CHILDREN
      ================================================= */}

      <AnimatePresence
        initial={false}
      >
        {!collapsed &&
          open && (
            <motion.div
              variants={
                submenuVariants
              }
              initial="hidden"
              animate="visible"
              exit="exit"
              className="overflow-hidden"
            >
              <div
                className={`
                  relative
                  mt-1
                  space-y-1
                  border-l
                  border-[#e5e5e5]
                  dark:border-[#333]

                  ${
                    level === 0
                      ? "ml-7 pl-4"
                      : "ml-5 pl-3"
                  }
                `}
              >
                {item.children!.map(
                  (child) => (
                    <NavItem
                      key={`${level}-${child.label}`}
                      item={child}
                      level={
                        level + 1
                      }
                      collapsed={
                        collapsed
                      }

                      /*
                       * IMPORTANT:
                       * Pass pathname recursively.
                       */

                      pathname={
                        pathname
                      }

                      openMenus={
                        openMenus
                      }

                      toggleMenu={
                        toggleMenu
                      }

                      isActive={
                        isActive
                      }
                    />
                  ),
                )}
              </div>
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
}

/* =========================================================
   FOLDER ITEM
========================================================= */

interface FolderNavItemProps {
  folder: FolderItem;
  level: number;
  collapsed: boolean;
  pathname: string;

  openMenus: Record<
    string,
    boolean
  >;

  toggleMenu: (
    key: string,
  ) => void;

  isActive: (
    href?: string,
  ) => boolean;
}

function FolderNavItem({
  folder,
  level,
  collapsed,
  pathname,
  openMenus,
  toggleMenu,
  isActive,
}: FolderNavItemProps) {
  const Icon =
    folder.icon || Folder;

  const hasChildren =
    !!folder.children?.length;

  const key =
    `folder-${level}-${folder.label}`;

  const open =
    !!openMenus[key];

  const active =
    isActive(folder.href) ||
    (!!folder.children &&
      folder.children.some(
        (child) =>
          hasActiveChild(
            child,
            pathname,
          ),
      ));

  /* =======================================================
     FOLDER WITHOUT CHILDREN
  ======================================================= */

  if (!hasChildren) {
    if (!folder.href) {
      return (
        <div
          className={`
            flex
            h-11
            w-full
            items-center
            rounded-xl
            px-3
            ${
              collapsed
                ? "justify-center"
                : ""
            }
          `}
        >
          <Icon
            size={20}
            strokeWidth={1.8}
            className={
              folder.color ||
              "text-[#555]"
            }
          />

          {!collapsed && (
            <span
              className="
                ml-3
                truncate
                text-[14px]
                font-medium
                text-[#333]
                dark:text-[#ccc]
              "
            >
              {folder.label}
            </span>
          )}
        </div>
      );
    }

    return (
      <Link
        href={folder.href}
        className={`
          group
          relative
          flex
          h-11
          w-full
          items-center
          rounded-xl
          px-3
          transition-colors

          ${
            active
              ? "bg-[#f1f1f1] dark:bg-[#242424]"
              : "hover:bg-[#f5f5f5] dark:hover:bg-[#202020]"
          }

          ${
            collapsed
              ? "justify-center"
              : ""
          }
        `}
      >
        <Icon
          size={20}
          strokeWidth={1.8}
          className={
            folder.color ||
            "text-[#555]"
          }
        />

        {!collapsed && (
          <span
            className="
              ml-3
              truncate
              whitespace-nowrap
              text-[14px]
              font-medium
              text-[#333]
              dark:text-[#ccc]
            "
          >
            {folder.label}
          </span>
        )}

        {collapsed && (
          <Tooltip
            text={folder.label}
          />
        )}
      </Link>
    );
  }

  /* =======================================================
     FOLDER WITH CHILDREN
  ======================================================= */

  return (
    <div>
      <button
        type="button"
        onClick={() =>
          toggleMenu(key)
        }
        className={`
          group
          relative
          flex
          h-11
          w-full
          items-center
          rounded-xl
          px-3
          transition-colors

          ${
            active
              ? "bg-[#f1f1f1] dark:bg-[#242424]"
              : "hover:bg-[#f5f5f5] dark:hover:bg-[#202020]"
          }

          ${
            collapsed
              ? "justify-center"
              : ""
          }
        `}
      >
        <Icon
          size={20}
          strokeWidth={1.8}
          className={
            folder.color ||
            "text-[#555]"
          }
        />

        {!collapsed && (
          <>
            <span
              className="
                ml-3
                flex-1
                truncate
                text-left
                text-[14px]
                font-medium
                text-[#333]
                dark:text-[#ccc]
              "
            >
              {folder.label}
            </span>

            <motion.div
              animate={{
                rotate: open
                  ? 90
                  : 0,
              }}
              transition={{
                duration: 0.18,
              }}
            >
              <ChevronRight
                size={15}
                className="text-[#888]"
              />
            </motion.div>
          </>
        )}

        {collapsed && (
          <Tooltip
            text={folder.label}
          />
        )}
      </button>

      {/* =================================================
          FOLDER CHILDREN
      ================================================= */}

      <AnimatePresence
        initial={false}
      >
        {!collapsed &&
          open &&
          folder.children && (
            <motion.div
              variants={
                submenuVariants
              }
              initial="hidden"
              animate="visible"
              exit="exit"
              className="overflow-hidden"
            >
              <div
                className="
                  ml-7
                  mt-1
                  space-y-1
                  border-l
                  border-[#e5e5e5]
                  pl-4
                  dark:border-[#333]
                "
              >
                {folder.children.map(
                  (child) => (
                    <NavItem
                      key={`${level}-${child.label}`}
                      item={child}
                      level={
                        level + 1
                      }
                      collapsed={
                        collapsed
                      }

                      /*
                       * IMPORTANT:
                       * Pass pathname here too.
                       */

                      pathname={
                        pathname
                      }

                      openMenus={
                        openMenus
                      }

                      toggleMenu={
                        toggleMenu
                      }

                      isActive={
                        isActive
                      }
                    />
                  ),
                )}
              </div>
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
}

/* =========================================================
   SIDEBAR LINK
========================================================= */

interface SidebarLinkProps {
  href: string;
  label: string;
  icon: LucideIcon;
  collapsed: boolean;
  active?: boolean;
  level?: number;
  badge?: number | string;
}

function SidebarLink({
  href,
  label,
  icon: Icon,
  collapsed,
  active = false,
  level = 0,
  badge,
}: SidebarLinkProps) {
  return (
    <Link
      href={href}
      className={`
        group
        relative
        flex
        h-11
        w-full
        items-center
        rounded-xl
        transition-all
        duration-150

        ${
          active
            ? "bg-[#f1f1f1] text-[#111] dark:bg-[#242424] dark:text-white"
            : "text-[#202020] hover:bg-[#f5f5f5] dark:text-[#d4d4d4] dark:hover:bg-[#202020]"
        }

        ${
          collapsed
            ? "justify-center"
            : "px-3"
        }
      `}
    >
      <Icon
        size={
          level > 0
            ? 16
            : 20
        }
        strokeWidth={1.8}
        className="shrink-0"
      />

      <AnimatePresence
        initial={false}
      >
        {!collapsed && (
          <motion.div
            initial={{
              opacity: 0,
              width: 0,
            }}
            animate={{
              opacity: 1,
              width: "auto",
            }}
            exit={{
              opacity: 0,
              width: 0,
            }}
            className="
              ml-3
              flex
              min-w-0
              flex-1
              items-center
              overflow-hidden
            "
          >
            <span
              className="
                truncate
                whitespace-nowrap
                text-[14px]
                font-medium
              "
            >
              {label}
            </span>

            {badge !==
              undefined && (
              <span
                className="
                  ml-2
                  shrink-0
                  rounded-md
                  border
                  border-[#dedede]
                  bg-white
                  px-2
                  py-0.5
                  text-[11px]
                  text-[#777]
                  dark:border-[#333]
                  dark:bg-[#1d1d1d]
                  dark:text-[#999]
                "
              >
                {badge}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {collapsed && (
        <Tooltip
          text={label}
        />
      )}
    </Link>
  );
}

/* =========================================================
   TOOLTIP
========================================================= */

function Tooltip({
  text,
}: {
  text: string;
}) {
  return (
    <div
      className="
        pointer-events-none
        absolute
        left-[68px]
        top-1/2
        z-[9999]
        -translate-y-1/2
        translate-x-[-4px]
        rounded-lg
        bg-[#171717]
        px-3
        py-2
        whitespace-nowrap
        text-xs
        font-medium
        text-white
        opacity-0
        shadow-xl
        transition-all
        duration-150
        group-hover:translate-x-0
        group-hover:opacity-100
        dark:bg-[#f5f5f5]
        dark:text-[#111]
      "
    >
      {text}
    </div>
  );
}

/* =========================================================
   THEME SWITCHER
========================================================= */

interface ThemeSwitcherProps {
  collapsed: boolean;
  open: boolean;

  setOpen: Dispatch<
    SetStateAction<boolean>
  >;
}

function ThemeSwitcher({
  collapsed,
  open,
  setOpen,
}: ThemeSwitcherProps) {
  const {
    theme,
    resolvedTheme,
    setTheme,
  } = useTheme();

  const themes = [
    {
      value: "light",
      label: "Light",
      icon: Sun,
    },

    {
      value: "dark",
      label: "Dark",
      icon: Moon,
    },

    {
      value: "system",
      label: "System",
      icon: Monitor,
    },
  ];

  const currentTheme =
    theme === "system"
      ? resolvedTheme
      : theme;

  const CurrentIcon =
    currentTheme === "dark"
      ? Moon
      : Sun;

  return (
    <div className="relative">
      {/* =================================================
          BUTTON
      ================================================= */}

      <button
        type="button"
        onClick={() =>
          setOpen(
            (value) => !value,
          )
        }
        className={`
          group
          relative
          flex
          h-11
          w-full
          items-center
          rounded-xl
          text-[#666]
          transition-colors
          hover:bg-[#f5f5f5]
          hover:text-[#111]
          dark:text-[#999]
          dark:hover:bg-[#202020]
          dark:hover:text-white

          ${
            collapsed
              ? "justify-center"
              : "px-3"
          }
        `}
      >
        <CurrentIcon
          size={19}
          strokeWidth={1.8}
        />

        {!collapsed && (
          <>
            <span className="ml-3 text-[13px]">
              Appearance
            </span>

            <motion.div
              animate={{
                rotate: open
                  ? 180
                  : 0,
              }}
              transition={{
                duration: 0.18,
              }}
              className="ml-auto"
            >
              <ChevronDown
                size={14}
              />
            </motion.div>
          </>
        )}

        {collapsed && (
          <Tooltip
            text="Appearance"
          />
        )}
      </button>

      {/* =================================================
          POPOVER
      ================================================= */}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{
              opacity: 0,
              y: 6,
              scale: 0.96,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: 6,
              scale: 0.96,
            }}
            transition={{
              duration: 0.16,
            }}
            className={`
              absolute
              bottom-full
              z-[9999]
              mb-2
              w-[190px]
              rounded-xl
              border
              border-[#e5e5e5]
              bg-white
              p-1.5
              shadow-2xl
              dark:border-[#333]
              dark:bg-[#1c1c1c]

              ${
                collapsed
                  ? "left-[68px]"
                  : "left-0"
              }
            `}
          >
            <p
              className="
                px-2.5
                py-2
                text-[11px]
                font-medium
                uppercase
                tracking-wider
                text-[#999]
              "
            >
              Appearance
            </p>

            {themes.map(
              (item) => {
                const Icon =
                  item.icon;

                const active =
                  theme ===
                  item.value;

                return (
                  <button
                    type="button"
                    key={
                      item.value
                    }
                    onClick={() => {
                      setTheme(
                        item.value,
                      );

                      setOpen(
                        false,
                      );
                    }}
                    className={`
                      flex
                      h-10
                      w-full
                      items-center
                      rounded-lg
                      px-2.5
                      text-left
                      text-[13px]
                      transition-colors

                      ${
                        active
                          ? "bg-[#f3f3f3] text-[#111] dark:bg-[#292929] dark:text-white"
                          : "text-[#666] hover:bg-[#f7f7f7] dark:text-[#aaa] dark:hover:bg-[#252525]"
                      }
                    `}
                  >
                    <Icon
                      size={16}
                      strokeWidth={
                        1.8
                      }
                    />

                    <span className="ml-3 flex-1">
                      {
                        item.label
                      }
                    </span>

                    {active && (
                      <Check
                        size={15}
                      />
                    )}
                  </button>
                );
              },
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* =========================================================
   HELPERS
========================================================= */

/*
 * Generate a unique-ish key for every nested item.
 */

function getItemKey(
  item: SidebarItem,
  level: number,
) {
  return `${level}-${item.label}`;
}

/*
 * Recursively check whether an item
 * or any of its children is active.
 */

function hasActiveChild(
  item: SidebarItem,
  pathname: string,
): boolean {
  /*
   * Check current item's href.
   */

  if (item.href) {
    if (
      pathname === item.href ||
      pathname.startsWith(
        `${item.href}/`,
      )
    ) {
      return true;
    }
  }

  /*
   * No children.
   */

  if (!item.children?.length) {
    return false;
  }

  /*
   * Recursively check children.
   */

  return item.children.some(
    (child) =>
      hasActiveChild(
        child,
        pathname,
      ),
  );
}

import { ReactNode } from "react";

export type DataTableColumn<T> = {
  key: string;
  label: string;
  className?: string;
  render?: (
    item: T,
    index: number
  ) => ReactNode;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (item: T) => string;
  empty?: ReactNode;
};

export default function DataTable<T>({
  columns,
  data,
  rowKey,
  empty,
}: DataTableProps<T>) {
  /* ========================================================
     EMPTY STATE
  ======================================================== */

  if (!data.length) {
    return (
      <div
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
        {empty || (
          <div
            className="
              px-6
              py-12
              text-center
              text-[12px]
              text-[#888]

              dark:text-[#777]
            "
          >
            No records found.
          </div>
        )}
      </div>
    );
  }

  /* ========================================================
     TABLE
  ======================================================== */

  return (
    <div
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
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          
          {/* ==================================================
              HEADER
          ================================================== */}

          <thead>
            <tr
              className="
                border-b
                border-[#e8e8e8]
                bg-[#fafafa]

                dark:border-[#2a2a2a]
                dark:bg-[#1c1c1c]
              "
            >
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`
                    whitespace-nowrap
                    px-4
                    py-3
                    text-left
                    text-[10px]
                    font-medium
                    uppercase
                    tracking-[0.06em]
                    text-[#888]

                    dark:text-[#888]

                    ${column.className || ""}
                  `}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          {/* ==================================================
              BODY
          ================================================== */}

          <tbody>
            {data.map(
              (item, index) => (
                <tr
                  key={rowKey(item)}
                  className="
                    border-b
                    border-[#eeeeee]
                    last:border-b-0
                    transition-colors

                    hover:bg-[#fafafa]

                    dark:border-[#2a2a2a]
                    dark:hover:bg-[#1d1d1d]
                  "
                >
                  {columns.map(
                    (column) => (
                      <td
                        key={column.key}
                        className={`
                          px-4
                          py-3.5
                          text-[12px]
                          text-[#333]

                          dark:text-[#ddd]

                          ${column.className || ""}
                        `}
                      >
                        {column.render
                          ? column.render(
                              item,
                              index
                            )
                          : ((item as Record<
                              string,
                              unknown
                            >)[
                              column.key
                            ] as ReactNode)}
                      </td>
                    )
                  )}
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
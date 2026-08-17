import { ReactNode } from "react";

export type TusanTableColumn = {
    key: string;
    title: ReactNode;
    width?: string;
    align?: "right" | "center" | "left";
};

export type TusanTableRow = Record<string, ReactNode>;

type TusanTableProps = {
    columns: TusanTableColumn[];
    rows: TusanTableRow[];
    emptyTitle?: string;
    emptyDescription?: string;
    className?: string;
};

export default function TusanTable({
    columns,
    rows,
    emptyTitle = "داده‌ای وجود ندارد",
    emptyDescription = "هنوز موردی برای نمایش ثبت نشده است.",
    className = "",
}: TusanTableProps) {
    return (
        <div
            className={`
                tusan-surface
                overflow-hidden
                ${className}
            `}
        >
            <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">

                    <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)]">
                        <tr>
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    style={{
                                        width:
                                            column.width,
                                    }}
                                    className={`
                                        px-5 py-4
                                        text-sm font-black
                                        text-[var(--text)]
                                        whitespace-nowrap
                                        ${column.align ===
                                            "center"
                                            ? "text-center"
                                            : column.align ===
                                                "left"
                                                ? "text-left"
                                                : "text-right"}
                                    `}
                                >
                                    {column.title}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={
                                        columns.length
                                    }
                                    className="p-10"
                                >
                                    <div className="text-center">
                                        <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--surface-muted)] flex items-center justify-center text-3xl">
                                            📄
                                        </div>

                                        <div className="mt-4 text-lg font-black text-[var(--text)]">
                                            {emptyTitle}
                                        </div>

                                        <p className="mt-2 text-sm text-[var(--text-muted)] leading-7">
                                            {emptyDescription}
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            rows.map((row, index) => (
                                <tr
                                    key={index}
                                    className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface-muted)] transition-colors"
                                >
                                    {columns.map(
                                        (
                                            column
                                        ) => (
                                            <td
                                                key={
                                                    column.key
                                                }
                                                className={`
                                                    px-5 py-4
                                                    text-sm
                                                    text-[var(--text)]
                                                    align-middle
                                                    ${column.align ===
                                                        "center"
                                                        ? "text-center"
                                                        : column.align ===
                                                            "left"
                                                            ? "text-left"
                                                            : "text-right"}
                                                `}
                                            >
                                                {
                                                    row[
                                                    column
                                                        .key
                                                    ]
                                                }
                                            </td>
                                        )
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>

                </table>
            </div>
        </div>
    );
}
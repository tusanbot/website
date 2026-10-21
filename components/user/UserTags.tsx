"use client";

import { useEffect, useState } from "react";

type UserTag = {
  id: string;
  name: string;
  slug: string | null;
  color: string | null;
};

export default function UserTags({ className = "" }: { className?: string }) {
  const [tags, setTags] = useState<UserTag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    fetch("/api/profile/tags", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return { tags: [] };
        return response.json();
      })
      .then((result) => {
        if (mounted) setTags(Array.isArray(result?.tags) ? result.tags : []);
      })
      .catch(() => {
        if (mounted) setTags([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading || tags.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`} aria-label="تگ‌های کاربر">
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold"
          style={{
            borderColor: tag.color ? `${tag.color}55` : "var(--border)",
            backgroundColor: tag.color ? `${tag.color}14` : "var(--surface-secondary)",
            color: tag.color || "var(--text)",
          }}
          title={tag.slug ? `تگ: ${tag.slug}` : "تگ حساب کاربری"}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {tag.name}
        </span>
      ))}
    </div>
  );
}

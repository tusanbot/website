"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

const VISITOR_KEY = "tusan_blog_visitor_id";

function getVisitorId() {
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    window.localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    return null;
  }
}

export default function BlogViewTracker({ postId }: { postId: string }) {
  useEffect(() => {
    const visitorId = getVisitorId();
    if (!visitorId) return;
    void supabase.rpc("blog_post_record_view", {
      p_post_id: postId,
      p_visitor_id: visitorId,
    });
  }, [postId]);

  return null;
}

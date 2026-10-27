import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Flag,
  Send,
  Trash2,
  Play,
  MapPin,
} from "lucide-react";
import { api, date, mediaUrl, send, useApi } from "../api";
import { useAuth, useToast } from "../context";
import { Avatar, Drawer, Empty, ErrorState, Loading } from "./ui";
import type { Comment, Post } from "../types";
import { appPath } from "../paths";
export async function sharePost(post: Post, toast: (s: string) => void) {
  const url = location.origin + appPath("/community?post=" + post.id);
  try {
    if (navigator.share) await navigator.share({ title: post.title, url });
    else {
      await navigator.clipboard.writeText(url);
      toast("Post link copied.");
    }
  } catch (e) {
    if ((e as Error).name !== "AbortError")
      toast("Could not share this post. Copy the address from your browser.");
  }
}
export function PostActions({
  post,
  onChange,
  onComments,
  vertical = false,
}: {
  post: Post;
  onChange: (post: Post) => void;
  onComments: () => void;
  vertical?: boolean;
}) {
  const auth = useAuth(),
    toast = useToast(),
    [busy, setBusy] = useState("");
  async function like() {
    if (!auth.requireUser() || busy) return;
    setBusy("like");
    try {
      const r = await send<{ liked: boolean; likeCount: number }>(
        "/posts/" + post.id + "/like",
        {},
      );
      onChange({ ...post, ...r });
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function save() {
    if (!auth.requireUser() || busy) return;
    setBusy("save");
    try {
      const r = await send<{ saved: boolean }>("/saves", {
        type: "post",
        id: post.id,
      });
      onChange({ ...post, saved: r.saved });
      toast(
        r.saved ? "Added to your saved bites." : "Removed from saved bites.",
      );
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  return (
    <div className={`post-actions ${vertical ? "vertical" : ""}`}>
      <button
        className={post.liked ? "liked" : ""}
        aria-label={post.liked ? "Unlike post" : "Like post"}
        aria-pressed={post.liked}
        disabled={busy === "like"}
        onClick={like}
      >
        <Heart fill={post.liked ? "currentColor" : "none"} />
        <span>{post.likeCount}</span>
      </button>
      <button aria-label="Read comments" onClick={onComments}>
        <MessageCircle />
        <span>{post.commentCount}</span>
      </button>
      <button
        aria-label={post.saved ? "Unsave post" : "Save post"}
        aria-pressed={post.saved}
        disabled={busy === "save"}
        onClick={save}
      >
        <Bookmark fill={post.saved ? "currentColor" : "none"} />
        {vertical && <span>Save</span>}
      </button>
      <button aria-label="Share post" onClick={() => sharePost(post, toast)}>
        <Share2 />
        {vertical && <span>Share</span>}
      </button>
    </div>
  );
}
export function CommentsDrawer({
  post,
  onClose,
  onAdded,
}: {
  post: Post;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { data, error, loading, reload } = useApi<{ comments: Comment[] }>(
      "/posts/" + post.id + "/comments",
    ),
    auth = useAuth(),
    toast = useToast(),
    [body, setBody] = useState(""),
    [busy, setBusy] = useState(false),
    [formError, setError] = useState("");
  async function comment(e: React.FormEvent) {
    e.preventDefault();
    if (!auth.requireUser()) return;
    setBusy(true);
    setError("");
    try {
      await send("/posts/" + post.id + "/comments", { body });
      setBody("");
      reload();
      onAdded();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    try {
      await api("/comments/" + id, { method: "DELETE" });
      reload();
      onAdded();
    } catch (e) {
      toast((e as Error).message);
    }
  }
  return (
    <Drawer title="The table talk" onClose={onClose}>
      <p className="muted">{post.title}</p>
      <div className="comments-list">
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} retry={reload} />
        ) : !data?.comments.length ? (
          <Empty title="Pull up a chair.">
            Be the first to add a thought or ask a question.
          </Empty>
        ) : (
          data.comments.map((c) => (
            <article className="comment" key={c.id}>
              <Avatar name={c.author?.name} />
              <div>
                <strong>{c.author?.name || "Makanlah member"}</strong>
                <small>{date(c.createdAt)}</small>
                <p>{c.body}</p>
              </div>
              {auth.user?.id === c.authorId && (
                <button
                  className="round"
                  aria-label="Delete comment"
                  onClick={() => remove(c.id)}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </article>
          ))
        )}
      </div>
      <form onSubmit={comment} className="comment-form">
        <label className="sr-only" htmlFor="new-comment">
          Your comment
        </label>
        <textarea
          id="new-comment"
          placeholder="Add something to the conversation…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          maxLength={1000}
        />
        <button className="btn" disabled={busy || !body.trim()}>
          {busy ? "Posting…" : "Post comment"}
          <Send size={16} />
        </button>
        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}
      </form>
    </Drawer>
  );
}
export function ReportDrawer({
  type,
  targetId,
  onClose,
}: {
  type: "post" | "place" | "review";
  targetId: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const toast = useToast(),
    auth = useAuth();
  return (
    <Drawer title="Help keep the table welcoming" onClose={onClose}>
      <p>
        Tell our moderators what needs a closer look. Reports are visible to the
        Makanlah admin team.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!auth.requireUser()) return;
          setBusy(true);
          try {
            await send("/reports", { type, targetId, reason });
            toast("Report sent to the moderation team.");
            onClose();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          <span>Reason for reporting</span>
          <textarea
            required
            maxLength={1000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What happened?"
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn" disabled={busy}>
          {busy ? "Sending…" : "Send report"}
        </button>
      </form>
    </Drawer>
  );
}
export function PostCard({
  post: initial,
  onDelete,
}: {
  post: Post;
  onDelete?: () => void;
}) {
  const [post, setPost] = useState(initial),
    [comments, setComments] = useState(false),
    [report, setReport] = useState(false),
    [slide, setSlide] = useState(0);
  const auth = useAuth(),
    toast = useToast();
  const medium = post.media[slide];
  return (
    <article className="post-card">
      <header>
        <div className="author">
          <Avatar name={post.author?.name} />
          <div>
            <strong>{post.author?.name || "Makanlah member"}</strong>
            <small>
              {date(post.createdAt)}
              {post.sample ? " · Sample post" : ""}
              {post.status === "draft" ? " · Private draft" : ""}
            </small>
          </div>
        </div>
        {post.status === "published" && (
          <button
            className="round"
            aria-label="Report post"
            onClick={() => {
              if (auth.requireUser()) setReport(true);
            }}
          >
            <Flag size={16} />
          </button>
        )}
      </header>
      <div className="post-media">
        {medium?.type === "video" ? (
          <video
            src={mediaUrl(medium.url)}
            poster={
              post.sample && post.place ? mediaUrl(post.place.image) : undefined
            }
            controls
            playsInline
            preload="metadata"
          />
        ) : (
          <img
            src={mediaUrl(medium?.url || "/assets/nasi.jpg")}
            alt={post.title}
            loading="lazy"
          />
        )}
        {post.media.length > 1 && (
          <div className="media-pagination">
            {post.media.map((_, i) => (
              <button
                aria-label={"View media " + (i + 1)}
                aria-pressed={i === slide}
                key={i}
                className={i === slide ? "active" : ""}
                onClick={() => setSlide(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="post-content">
        {post.sponsored && (
          <span className="partnership">Paid partnership</span>
        )}
        <h2>{post.title}</h2>
        <p>{post.body}</p>
        {post.place && (
          <Link className="post-place" to={"/place/" + post.place.id}>
            <MapPin size={16} />
            {post.place.name} · {post.place.area}
          </Link>
        )}
        {post.status === "published" ? (
          <PostActions
            post={post}
            onChange={setPost}
            onComments={() => setComments(true)}
          />
        ) : (
          <Link className="btn secondary" to={"/post?edit=" + post.id}>
            Continue draft
          </Link>
        )}
        {auth.user?.id === post.authorId && (
          <div className="own-post-actions">
            <Link to={"/post?edit=" + post.id}>Edit post</Link>
            <button
              onClick={async () => {
                if (
                  !window.confirm(
                    "Delete this post? This also removes its comments and likes.",
                  )
                )
                  return;
                try {
                  await api("/posts/" + post.id, { method: "DELETE" });
                  toast("Post deleted.");
                  onDelete?.();
                } catch (e) {
                  toast((e as Error).message);
                }
              }}
            >
              Delete post
            </button>
          </div>
        )}
      </div>
      {comments && (
        <CommentsDrawer
          post={post}
          onClose={() => setComments(false)}
          onAdded={() =>
            api<{ post: Post }>("/posts/" + post.id)
              .then((r) => setPost(r.post))
              .catch(() => {})
          }
        />
      )}
      {report && (
        <ReportDrawer
          type="post"
          targetId={post.id}
          onClose={() => setReport(false)}
        />
      )}
    </article>
  );
}

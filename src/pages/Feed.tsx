import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  MapPin,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Flag,
} from "lucide-react";
import { api, mediaUrl, useApi } from "../api";
import { useAuth, useGeo } from "../context";
import { Avatar, Empty, ErrorState, Loading } from "../components/ui";
import {
  CommentsDrawer,
  PostActions,
  ReportDrawer,
} from "../components/PostCard";
import type { Post } from "../types";

function FeedSlide({
  post: initial,
  index,
  onActive,
}: {
  post: Post;
  index: number;
  onActive: (index: number) => void;
}) {
  const [post, setPost] = useState(initial),
    [muted, setMuted] = useState(true),
    [playing, setPlaying] = useState(false),
    [comments, setComments] = useState(false),
    [report, setReport] = useState(false),
    [progress, setProgress] = useState(0);
  const element = useRef<HTMLElement>(null),
    video = useRef<HTMLVideoElement>(null),
    visible = useRef(false),
    auth = useAuth();
  const medium = post.media.find((m) => m.type === "video") || post.media[0];
  useEffect(() => {
    if (!element.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const active = entries[0].isIntersecting;
        visible.current = active;
        if (active) {
          onActive(index);
          if (video.current)
            video.current.play().catch(() => setPlaying(false));
        } else video.current?.pause();
      },
      { threshold: 0.65 },
    );
    observer.observe(element.current);
    const hide = () => {
      if (document.hidden) video.current?.pause();
      else if (visible.current) video.current?.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", hide);
    };
  }, [index, onActive]);
  useEffect(() => {
    if (comments || report) video.current?.pause();
    else if (visible.current) video.current?.play().catch(() => {});
  }, [comments, report]);
  return (
    <article
      className="feed-slide"
      ref={element}
      aria-label={"Food story: " + post.title}
      data-index={index}
    >
      <div className="feed-visual">
        {medium.type === "video" ? (
          <>
            <video
              ref={video}
              src={mediaUrl(medium.url)}
              poster={
                post.sample && post.place
                  ? mediaUrl(post.place.image)
                  : undefined
              }
              playsInline
              loop
              muted={muted}
              preload="metadata"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                setProgress(
                  Number.isFinite(v.duration) ? v.currentTime / v.duration : 0,
                );
              }}
            />
            <div className="video-controls">
              <button
                className="round"
                aria-label={playing ? "Pause video" : "Play video"}
                onClick={() =>
                  video.current?.paused
                    ? video.current.play()
                    : video.current?.pause()
                }
              >
                {playing ? <Pause size={20} /> : <Play size={20} />}
              </button>
              <button
                className="round"
                aria-label={muted ? "Unmute video" : "Mute video"}
                onClick={() => setMuted(!muted)}
              >
                {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
            </div>
            <progress value={progress} max={1} aria-label="Video progress" />
          </>
        ) : (
          <img src={mediaUrl(medium.url)} alt={post.title} />
        )}
        <div className="feed-shade" />
        <div className="feed-caption">
          <div className="author">
            <Avatar name={post.author?.name} />
            <div>
              <strong>{post.author?.name}</strong>
              <small>{post.sample ? "Sample food story" : "Food diary"}</small>
            </div>
            {post.sponsored && (
              <span className="partnership">Paid partnership</span>
            )}
          </div>
          <h2>{post.title}</h2>
          <p>{post.body}</p>
          {post.place && (
            <Link className="feed-place" to={"/place/" + post.place.id}>
              <MapPin size={16} />
              {post.place.name} · {post.place.area}
            </Link>
          )}
        </div>
        <PostActions
          post={post}
          onChange={setPost}
          onComments={() => setComments(true)}
          vertical
        />
        <button
          className="feed-report"
          aria-label="Report food story"
          onClick={() => {
            if (auth.requireUser()) setReport(true);
          }}
        >
          <Flag size={16} />
        </button>
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
export default function Feed() {
  const [type, setType] = useState("all"),
    [active, setActive] = useState(0),
    [nearby, setNearby] = useState(false);
  const container = useRef<HTMLDivElement>(null),
    geo = useGeo();
  const { data, error, loading, reload } = useApi<{ posts: Post[] }>(
    "/posts" + (type === "video" ? "?type=video" : ""),
  );
  let posts = data?.posts || [];
  if (nearby)
    posts = posts.filter(
      (p) =>
        p.place &&
        Math.abs(p.place.lat - geo.coords.lat) < 0.15 &&
        Math.abs(p.place.lng - geo.coords.lng) < 0.15,
    );
  function scroll(index: number) {
    const target = container.current?.querySelectorAll(".feed-slide")[index];
    target?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  }
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        document.querySelector("dialog[open]")
      )
        return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        scroll(Math.min(active + 1, posts.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        scroll(Math.max(0, active - 1));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, posts.length]);
  return (
    <div className="feed-page">
      <aside className="feed-intro">
        <h1>
          One more
          <br />
          <span>bite.</span>
        </h1>
        <p>
          Scroll a little.
          <br />
          Find something sedap.
        </p>
        <div className="feed-tabs">
          <button
            className={type === "all" ? "active" : ""}
            onClick={() => setType("all")}
          >
            All food stories
          </button>
          <button
            className={type === "video" ? "active" : ""}
            onClick={() => setType("video")}
          >
            Videos
          </button>
          <button
            className={nearby ? "active" : ""}
            aria-pressed={nearby}
            onClick={() => setNearby(!nearby)}
          >
            <MapPin size={17} />
            Around my location
          </button>
        </div>
        <Link to="/post" className="btn">
          Share your own bite
        </Link>
        <p className="feed-hint">Scroll, swipe or use your arrow keys.</p>
      </aside>
      <div className="feed-scroll" ref={container}>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} retry={reload} />
        ) : !posts.length ? (
          <Empty
            title={
              type === "video"
                ? "Your next food video starts here."
                : "A new discovery is waiting."
            }
            action="Upload a food story"
            to="/post"
          >
            {type === "video"
              ? "Upload an MP4, MOV or WebM to bring your food story to life."
              : "Try all food stories or choose another location."}
          </Empty>
        ) : (
          posts.map((p, i) => (
            <FeedSlide key={p.id} post={p} index={i} onActive={setActive} />
          ))
        )}
      </div>
      <div className="feed-navigation">
        <button
          className="round"
          aria-label="Previous food story"
          disabled={active === 0}
          onClick={() => scroll(active - 1)}
        >
          <ArrowUp />
        </button>
        <span>
          {posts.length ? active + 1 : 0} / {posts.length}
        </span>
        <button
          className="round"
          aria-label="Next food story"
          disabled={active >= posts.length - 1}
          onClick={() => scroll(active + 1)}
        >
          <ArrowDown />
        </button>
      </div>
    </div>
  );
}

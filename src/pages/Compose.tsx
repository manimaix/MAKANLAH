import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Upload, X, ImagePlus, Check, ArrowRight } from "lucide-react";
import { api, mediaUrl, send, useApi } from "../api";
import { useToast } from "../context";
import { ErrorState, Field, Loading } from "../components/ui";
import type { Media, Place, Post } from "../types";
export default function Compose() {
  const [params] = useSearchParams(),
    edit = params.get("edit"),
    [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [placeId, setPlaceId] = useState(""),
    [sponsored, setSponsored] = useState(false),
    [media, setMedia] = useState<Media[]>([]),
    [uploading, setUploading] = useState(false),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [drag, setDrag] = useState(false),
    [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;
  const file = useRef<HTMLInputElement>(null),
    nav = useNavigate(),
    toast = useToast();
  const places = useApi<{ places: Place[] }>("/places"),
    existing = useApi<{ post: Post }>(edit ? "/posts/" + edit : null);
  useEffect(() => {
    if (existing.data) {
      const p = existing.data.post;
      setTitle(p.title);
      setBody(p.body);
      setPlaceId(p.placeId || "");
      setSponsored(p.sponsored);
      setMedia(p.media);
    }
  }, [existing.data]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function upload(files: FileList | File[] | null) {
    if (!files?.length) return;
    setError("");
    if (media.length + files.length > 4) {
      setError("Choose up to four photos or videos per post.");
      return;
    }
    const form = new FormData();
    for (const item of Array.from(files)) {
      if (
        item.size >
        (item.type.startsWith("image/") ? 12 : 80) * 1024 * 1024
      ) {
        setError("Use photos up to 12 MB and videos up to 80 MB.");
        return;
      }
      form.append("files", item);
    }
    setUploading(true);
    try {
      const r = await api<{ media: Media[] }>("/media", {
        method: "POST",
        body: form,
      });
      setMedia((m) => [...m, ...r.media]);
      setDirty(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
      if (file.current) file.current.value = "";
    }
  }
  async function submit(status: "draft" | "published") {
    setError("");
    setBusy(status);
    try {
      const r = await send<{ post: Post }>(
        "/posts" + (edit ? "/" + edit : ""),
        { title, body, placeId: placeId || null, sponsored, media, status },
        edit ? "PUT" : "POST",
      );
      dirtyRef.current = false;
      setDirty(false);
      toast(
        status === "draft"
          ? "Draft saved. Come back whenever you’re hungry."
          : "Your bite is on the table.",
      );
      nav(
        status === "draft"
          ? "/profile?tab=drafts"
          : "/community?post=" + r.post.id,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  if (edit && existing.loading) return <Loading />;
  if (existing.error)
    return <ErrorState message={existing.error} retry={existing.reload} />;
  return (
    <div className="container compose-page">
      <div className="page-heading">
        <h1>{edit ? "A little finishing touch." : "Share a little sedap."}</h1>
        <p>A memorable meal deserves a little space in someone’s food diary.</p>
      </div>
      <form
        className="compose-layout"
        onSubmit={(e) => {
          e.preventDefault();
          submit("published");
        }}
        onChange={() => setDirty(true)}
      >
        <section>
          <div
            className={`upload-zone ${drag ? "dragging" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              if (!uploading) upload(e.dataTransfer.files);
            }}
          >
            <ImagePlus size={36} />
            <h2>Make them hungry.</h2>
            <p>Drop your food photos or videos here.</p>
            <button
              type="button"
              className="btn secondary"
              onClick={() => file.current?.click()}
              disabled={uploading || media.length >= 4}
            >
              <Upload size={17} />
              {uploading ? "Uploading…" : "Choose photos or videos"}
            </button>
            <small>
              Up to 4 files · Photos 12 MB · Videos 80 MB
              <br />
              JPG, PNG, WebP, AVIF, MP4, MOV or WebM
            </small>
            <input
              ref={file}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime"
              multiple
              hidden
              onChange={(e) => upload(e.target.files)}
            />
          </div>
          {!!media.length && (
            <div className="upload-previews">
              {media.map((m, i) => (
                <div key={m.id || m.url}>
                  {m.type === "video" ? (
                    <video
                      src={mediaUrl(m.url)}
                      controls
                      preload="metadata"
                      playsInline
                    />
                  ) : (
                    <img
                      src={mediaUrl(m.url)}
                      alt={"Uploaded food photo " + (i + 1)}
                    />
                  )}
                  <button
                    type="button"
                    className="round"
                    aria-label={"Remove upload " + (i + 1)}
                    onClick={() => {
                      setMedia(media.filter((_, j) => j !== i));
                      setDirty(true);
                    }}
                  >
                    <X size={17} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="posting-tips">
            <h3>A good food story is your own.</h3>
            <p>
              Share media you have permission to use, keep it kind, and disclose
              paid partnerships.
            </p>
          </div>
        </section>
        <section className="compose-fields">
          <Field label="Give your bite a title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={120}
              placeholder="That first bite of sambal…"
            />
          </Field>
          <Field
            label="What made it worth sharing?"
            hint={`${body.length} / 5,000`}
          >
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={5000}
              rows={6}
              placeholder="The flavour, the place, the people. Tell us a little about it."
            />
          </Field>
          <Field label="Tag a place (optional)">
            <select
              value={placeId}
              onChange={(e) => setPlaceId(e.target.value)}
            >
              <option value="">Just sharing a bite</option>
              {places.data?.places.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.area}
                </option>
              ))}
            </select>
          </Field>
          <label className="check-row partnership-check">
            <input
              type="checkbox"
              checked={sponsored}
              onChange={(e) => setSponsored(e.target.checked)}
            />
            This is a paid partnership or sponsored experience.
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="compose-buttons">
            <button
              type="button"
              className="btn secondary"
              disabled={!!busy || uploading || !title.trim() || !media.length}
              onClick={() => submit("draft")}
            >
              {busy === "draft" ? "Saving…" : "Save draft"}
            </button>
            <button
              className="btn"
              disabled={!!busy || uploading || !media.length}
            >
              {busy === "published"
                ? "Sharing…"
                : edit
                  ? "Save & publish"
                  : "Publish my bite"}
              <ArrowRight size={18} />
            </button>
          </div>
          <p className="privacy-note">
            <Check size={16} />
            Drafts are private. Published bites appear in the community and food
            feed.
          </p>
          <Link className="text-link" to="/profile?tab=drafts">
            See my drafts
          </Link>
        </section>
      </form>
    </div>
  );
}

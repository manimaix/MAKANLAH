import { useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { date, mediaUrl, send, useApi } from "../api";
import { useAuth, useToast } from "../context";
import { Empty, ErrorState, Loading } from "../components/ui";
import type { AdminData } from "../types";
export default function Admin() {
  const { data, error, loading, reload } = useApi<AdminData>("/admin"),
    [tab, setTab] = useState("listings"),
    [busy, setBusy] = useState(false),
    auth = useAuth(),
    toast = useToast();
  async function mutate(path: string, body: unknown, method = "PATCH") {
    setBusy(true);
    try {
      await send(path, body, method);
      reload();
      toast("Updated.");
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorState message={error} retry={reload} />;
  if (!data) return null;
  return (
    <div className="container workspace">
      <div className="workspace-heading">
        <div>
          <h1>Keep the table welcoming.</h1>
          <p>
            Review listings, follow up reports, and help the community thrive.
          </p>
        </div>
        <button className="btn secondary" onClick={reload}>
          Refresh workspace
        </button>
      </div>
      <div className="workspace-stats">
        <div>
          <span>Pending listings</span>
          <strong>
            {data.places.filter((p) => p.status === "pending").length}
          </strong>
        </div>
        <div>
          <span>Open reports</span>
          <strong>
            {data.reports.filter((r) => r.status === "open").length}
          </strong>
        </div>
        <div>
          <span>Members</span>
          <strong>{data.users.length}</strong>
        </div>
        <div>
          <span>Published stories</span>
          <strong>
            {data.posts.filter((p) => p.status === "published").length}
          </strong>
        </div>
      </div>
      <div className="tabs">
        {[
          ["listings", "Food listings"],
          ["reports", "Reports"],
          ["posts", "Content"],
          ["users", "People & roles"],
          ["audit", "Activity log"],
        ].map(([key, label]) => (
          <button
            className={tab === key ? "active" : ""}
            key={key}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {error && <ErrorState message={error} retry={reload} />}{" "}
      {tab === "listings" && (
        <div className="admin-listings">
          {[...data.places]
            .sort(
              (a, b) =>
                Number(b.status === "pending") - Number(a.status === "pending"),
            )
            .map((p) => (
              <article key={p.id}>
                <img src={mediaUrl(p.image)} alt={p.dish} />
                <div>
                  <h2>{p.name}</h2>
                  <p>
                    {p.dish} · {p.city} · {p.cuisine}
                  </p>
                  <small>
                    {p.address}
                    {p.sample ? " · Sample listing" : ""}
                  </small>
                  <p>{p.description}</p>
                  <span className={"status " + p.status}>{p.status}</span>
                </div>
                <div className="admin-listing-actions">
                  <button
                    className="btn"
                    disabled={busy || p.status === "approved"}
                    onClick={() =>
                      mutate("/admin/places/" + p.id, { status: "approved" })
                    }
                  >
                    Approve
                  </button>
                  <button
                    className="btn secondary"
                    disabled={busy || p.status === "rejected"}
                    onClick={() =>
                      mutate("/admin/places/" + p.id, { status: "rejected" })
                    }
                  >
                    Reject / unlist
                  </button>
                  {p.status === "approved" && (
                    <Link className="text-link" to={"/place/" + p.id}>
                      View listing
                      <ExternalLink size={15} />
                    </Link>
                  )}
                </div>
              </article>
            ))}
        </div>
      )}
      {tab === "reports" &&
        (data.reports.length ? (
          <div className="report-list">
            {data.reports.map((r) => (
              <article key={r.id}>
                <div>
                  <span className={"status " + r.status}>{r.status}</span>
                  <h3>{r.type} report</h3>
                  <p>{r.reason}</p>
                  <small>
                    Target: {r.targetId} · {date(r.createdAt)}
                  </small>
                </div>
                <div className="button-row">
                  {r.type === "post" && (
                    <button
                      className="btn secondary"
                      disabled={busy}
                      onClick={() =>
                        mutate("/admin/posts/" + r.targetId, {
                          status: "hidden",
                        })
                      }
                    >
                      Hide post
                    </button>
                  )}
                  {r.type === "place" && (
                    <button
                      className="btn secondary"
                      disabled={busy}
                      onClick={() =>
                        mutate("/admin/places/" + r.targetId, {
                          status: "rejected",
                        })
                      }
                    >
                      Unlist place
                    </button>
                  )}
                  {r.type === "review" && (
                    <button
                      className="btn secondary"
                      disabled={busy}
                      onClick={() =>
                        mutate("/admin/reviews/" + r.targetId, {}, "DELETE")
                      }
                    >
                      Remove review
                    </button>
                  )}
                  {r.status === "open" && (
                    <button
                      className="btn"
                      disabled={busy}
                      onClick={() => mutate("/admin/reports/" + r.id, {})}
                    >
                      Resolve report
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty title="A peaceful table.">No reports to review.</Empty>
        ))}
      {tab === "posts" && (
        <div className="admin-posts">
          {data.posts.map((p) => (
            <article key={p.id}>
              {p.media[0].type === "video" ? (
                <video
                  src={mediaUrl(p.media[0].url)}
                  controls
                  preload="metadata"
                />
              ) : (
                <img src={mediaUrl(p.media[0].url)} alt={p.title} />
              )}
              <div>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
                <small>
                  {p.author?.name}
                  {p.sponsored ? " · Paid partnership" : ""}
                </small>
                <span className={"status " + p.status}>{p.status}</span>
              </div>
              <button
                className="btn secondary"
                disabled={busy}
                onClick={() =>
                  mutate("/admin/posts/" + p.id, {
                    status: p.status === "hidden" ? "published" : "hidden",
                  })
                }
              >
                {p.status === "hidden" ? "Restore post" : "Hide post"}
              </button>
            </article>
          ))}
        </div>
      )}
      {tab === "users" && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.name}</strong>
                    <small>{u.email}</small>
                  </td>
                  <td>
                    <select
                      aria-label={"Role for " + u.name}
                      disabled={busy || u.id === auth.user?.id}
                      value={u.role}
                      onChange={(e) => {
                        if (
                          confirm(
                            "Change " + u.name + " to " + e.target.value + "?",
                          )
                        )
                          mutate("/admin/users/" + u.id, {
                            role: e.target.value,
                          });
                      }}
                    >
                      {["user", "merchant", "admin"].map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span className={"status " + u.status}>{u.status}</span>
                  </td>
                  <td>
                    <button
                      className="text-link"
                      disabled={busy || u.id === auth.user?.id}
                      onClick={() => {
                        if (
                          confirm(
                            (u.status === "active" ? "Suspend " : "Restore ") +
                              u.name +
                              "?",
                          )
                        )
                          mutate("/admin/users/" + u.id, {
                            status:
                              u.status === "active" ? "suspended" : "active",
                          });
                      }}
                    >
                      {u.status === "active"
                        ? "Suspend account"
                        : "Restore account"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab === "audit" &&
        (data.audit.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.audit.map((a) => (
                  <tr key={a.id}>
                    <td>{a.action}</td>
                    <td className="mono">{a.targetId}</td>
                    <td>{new Date(a.createdAt).toLocaleString("en-MY")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="A fresh start.">
            Administrative actions will be recorded here.
          </Empty>
        ))}
    </div>
  );
}

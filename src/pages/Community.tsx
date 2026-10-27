import { Link, useSearchParams } from "react-router-dom";
import { Plus, Play, ArrowRight } from "lucide-react";
import { useApi } from "../api";
import type { Post } from "../types";
import { PostCard } from "../components/PostCard";
import { Empty, ErrorState, Loading } from "../components/ui";
export default function Community() {
  const [params] = useSearchParams(),
    single = params.get("post");
  const { data, error, loading, reload } = useApi<{
    posts: Post[];
    post?: Post;
  }>(single ? "/posts/" + single : "/posts");
  const posts = single ? (data?.post ? [data.post] : []) : data?.posts || [];
  return (
    <div className="container community-page">
      <div className="page-heading with-action">
        <div>
          <h1>
            Good food.
            <br />
            <span>Better when shared.</span>
          </h1>
          <p>Real stories, small discoveries, and a seat for everyone.</p>
        </div>
        <Link className="btn" to="/post">
          <Plus size={18} />
          Share a bite
        </Link>
      </div>
      <div className="community-layout">
        <section>
          {loading ? (
            <Loading />
          ) : error ? (
            <ErrorState message={error} retry={reload} />
          ) : posts.length ? (
            <div className="post-grid">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} onDelete={reload} />
              ))}
            </div>
          ) : (
            <Empty
              title="Every food story starts with a bite."
              action="Share the first one"
              to="/post"
            >
              Share a photo or a video of something you loved.
            </Empty>
          )}
        </section>
        <aside className="community-aside">
          <h2>A little table talk.</h2>
          <p>
            Tell us what made the meal memorable. The flavour, the people, the
            tiny stall you nearly walked past.
          </p>
          <Link className="text-link" to="/post">
            Make a little recommendation
            <ArrowRight size={18} />
          </Link>
          <div className="community-video-link">
            <Play size={28} />
            <h3>
              Less deciding.
              <br />
              More discovering.
            </h3>
            <p>A whole feed of food to fall for.</p>
            <Link className="btn secondary" to="/feed">
              Scroll the food feed
            </Link>
          </div>
          <h3>Keep it welcoming.</h3>
          <p>
            Share your own experience, credit the people behind the food, and
            disclose paid partnerships.
          </p>
        </aside>
      </div>
    </div>
  );
}

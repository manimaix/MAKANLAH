import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SlidersHorizontal, ArrowRight } from "lucide-react";
import { useApi } from "../api";
import { useAuth, useGeo } from "../context";
import { FoodCard } from "../components/FoodCard";
import { Loading, ErrorState, Empty, SearchBar } from "../components/ui";
import type { Place } from "../types";
export const cuisines = [
  "Malay",
  "Chinese",
  "Indian & Mamak",
  "Peranakan",
  "Kopitiam",
  "Dessert",
];
export default function Discover() {
  const [params, setParams] = useSearchParams(),
    [q, setQ] = useState(params.get("q") || ""),
    [sort, setSort] = useState("recommended"),
    [personal, setPersonal] = useState(params.get("forYou") === "true");
  const { user } = useAuth(),
    geo = useGeo();
  useEffect(() => {
    const t = setTimeout(() => {
      setParams(
        (p) => {
          if (q) p.set("q", q);
          else p.delete("q");
          return p;
        },
        { replace: true },
      );
    }, 250);
    return () => clearTimeout(t);
  }, [q, setParams]);
  const query = new URLSearchParams(params);
  query.set("lat", String(geo.coords.lat));
  query.set("lng", String(geo.coords.lng));
  query.set("sort", sort);
  const { data, error, loading, reload } = useApi<{ places: Place[] }>(
    "/places?" + query,
  );
  const set = (key: string, value: string) =>
    setParams((p) => {
      value ? p.set(key, value) : p.delete(key);
      return p;
    });
  let places = data?.places || [];
  if (personal && user) {
    const prefs = user.preferences;
    places = places.filter(
      (p) =>
        (!prefs.cuisines.length || prefs.cuisines.includes(p.cuisine)) &&
        p.price <= prefs.budget &&
        prefs.dietary.every((tag) => p.tags.includes(tag)) &&
        (!prefs.spicy || p.tags.includes("Spicy")),
    );
  }
  return (
    <div className="container">
      <section className="discover-intro">
        <div>
          <h1>
            Made for your
            <br />
            <span>kind of makan.</span>
          </h1>
          <p>
            Follow your cravings. Find food that fits your tastes, budget, and
            plans.
          </p>
        </div>
        <aside className="taste-prompt">
          <h2>A little more you.</h2>
          <p>Pick your flavours and make discovery feel more personal.</p>
          <Link to="/preferences" className="btn">
            Choose my tastes
            <ArrowRight size={17} />
          </Link>
        </aside>
      </section>
      <SearchBar value={q} onChange={setQ} />
      <div className="tabs discover-tabs">
        {[
          "All food",
          "For you",
          "Breakfast",
          "Lunch",
          "Dinner",
          "Sweet treats",
        ].map((t) => (
          <button
            key={t}
            className={
              (
                t === "For you"
                  ? personal
                  : !personal && (params.get("tag") || "All food") === t
              )
                ? "active"
                : ""
            }
            onClick={() => {
              setPersonal(t === "For you");
              if (t !== "For you") set("tag", t === "All food" ? "" : t);
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="discovery-layout">
        <aside className="filter-sidebar">
          <details open={!window.matchMedia("(max-width: 640px)").matches}>
            <summary>
              <SlidersHorizontal size={18} />
              Make it your makan
            </summary>
            <div className="filter-fields">
              <fieldset>
                <legend>Budget</legend>
                {[
                  ["Any budget", ""],
                  ["Under RM10", "10"],
                  ["Under RM15", "15"],
                  ["Under RM30", "30"],
                ].map(([label, value]) => (
                  <label className="check-row" key={label}>
                    <input
                      type="radio"
                      name="budget"
                      checked={(params.get("maxPrice") || "") === value}
                      onChange={() => set("maxPrice", value)}
                    />
                    {label}
                  </label>
                ))}
              </fieldset>
              <fieldset>
                <legend>Cuisine</legend>
                {["All cuisines", ...cuisines].map((c) => (
                  <label className="check-row" key={c}>
                    <input
                      type="radio"
                      name="cuisine"
                      checked={(params.get("cuisine") || "All cuisines") === c}
                      onChange={() =>
                        set("cuisine", c === "All cuisines" ? "" : c)
                      }
                    />
                    {c}
                  </label>
                ))}
              </fieldset>
              <fieldset>
                <legend>Preferences</legend>
                {["Spicy", "Vegetarian", "Halal-friendly"].map((t) => (
                  <label className="check-row" key={t}>
                    <input
                      type="checkbox"
                      checked={params.get("tag") === t}
                      onChange={(e) => set("tag", e.target.checked ? t : "")}
                    />
                    {t === "Halal-friendly" ? "Halal-friendly listings" : t}
                  </label>
                ))}
              </fieldset>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={params.get("open") === "true"}
                  onChange={(e) => set("open", e.target.checked ? "true" : "")}
                />
                Open now
              </label>
              <button
                className="text-link"
                onClick={() => {
                  setQ("");
                  setPersonal(false);
                  setParams({});
                }}
              >
                Clear filters
              </button>
              <div className="dietary-note">
                <h3>Know before you go</h3>
                <p>
                  Dietary tags come from listing information. Check with the
                  venue for your needs; they are not certification.
                </p>
              </div>
            </div>
          </details>
        </aside>
        <section className="discovery-results">
          <div className="results-heading">
            <h2>Something for every craving</h2>
            <label>
              Sort{" "}
              <select
                aria-label="Sort food"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="recommended">Recommended</option>
                <option value="rating">Top rated</option>
                <option value="price">Lowest price</option>
                <option value="distance">Nearest first</option>
              </select>
            </label>
          </div>
          {loading ? (
            <Loading />
          ) : error ? (
            <ErrorState message={error} retry={reload} />
          ) : !places.length ? (
            <Empty
              title={
                personal && !user
                  ? "Your tastes, your recommendations."
                  : "A different craving, perhaps?"
              }
              action={personal && !user ? "Sign in" : "Browse all food"}
              to={personal && !user ? "/sign-in" : "/discover"}
            >
              {personal && !user
                ? "Sign in and choose your tastes to find your kind of makan."
                : "No food matches these filters yet. Try a wider budget or another cuisine."}
            </Empty>
          ) : (
            <div className="food-grid three">
              {places.map((p) => (
                <FoodCard place={p} key={p.id} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

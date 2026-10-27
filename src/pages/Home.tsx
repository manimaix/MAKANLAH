import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, Play } from "lucide-react";
import { mediaUrl, useApi } from "../api";
import type { Place } from "../types";
import { FoodCard } from "../components/FoodCard";
import {
  Avatar,
  Loading,
  ErrorState,
  SearchBar,
  SectionHead,
  SampleNote,
} from "../components/ui";
import { LocationPicker } from "../components/Layout";
export default function Home() {
  const { data, loading, error, reload } = useApi<{ places: Place[] }>(
      "/places",
    ),
    [q, setQ] = useState(""),
    [tab, setTab] = useState("Popular now");
  const nav = useNavigate();
  let top = data?.places.slice(0, 4) || [];
  if (tab === "Budget bites")
    top = (data?.places.filter((p) => p.price <= 10) || []).slice(0, 4);
  if (tab === "Breakfast club")
    top = (
      data?.places.filter((p) => p.tags.includes("Breakfast")) || []
    ).slice(0, 4);
  if (tab === "Local legends")
    top = (
      data?.places.filter((p) =>
        ["nasi", "roti", "noodles", "laksa"].includes(p.id),
      ) || []
    ).slice(0, 4);
  return (
    <>
      <section className="container home-hero">
        <div className="hero-copy">
          <h1>
            Makan apa
            <br />
            <span>today?</span>
          </h1>
          <p>
            Your next favourite bite is closer than you think.{" "}
            <br className="desktop-only" />
            Discover local legends, hidden gems, and food worth sharing.
          </p>
          <SearchBar
            value={q}
            onChange={setQ}
            onSubmit={() => nav("/discover?q=" + encodeURIComponent(q))}
          />
          <LocationPicker />
          <div className="chips">
            {[
              ["Spicy, please", "Spicy"],
              ["Under RM15", "budget"],
              ["Mamak", "Indian & Mamak"],
              ["Sweet treats", "Sweet treats"],
            ].map(([name, value]) => (
              <Link
                className="chip"
                key={name}
                to={
                  "/discover?" +
                  (value === "budget"
                    ? "maxPrice=15"
                    : value === "Indian & Mamak"
                      ? "cuisine=" + encodeURIComponent(value)
                      : "tag=" + encodeURIComponent(value))
                }
              >
                {name}
              </Link>
            ))}
          </div>
        </div>
        <Link to="/place/nasi" className="hero-photo">
          <img
            src={mediaUrl("/assets/nasi.jpg")}
            alt="Nasi lemak with sambal sotong, cucumber, egg and peanuts"
            fetchPriority="high"
          />
          <span className="hero-badge">
            <Sparkles size={16} />
            The everyday legend
          </span>
          <div className="hero-caption">
            <div>
              <h2>Nasi lemak sambal sotong</h2>
              <p>A familiar favourite. A fresh discovery.</p>
            </div>
            <span className="round gold">
              <ArrowRight />
            </span>
          </div>
        </Link>
      </section>
      <section className="container section">
        <SectionHead
          title="Malaysia, one bite at a time."
          copy="Big flavours. Everyday favourites. Start here."
          action="Explore all food"
          to="/discover"
        />
        <div className="tabs">
          {[
            "Popular now",
            "Local legends",
            "Budget bites",
            "Breakfast club",
          ].map((t) => (
            <button
              key={t}
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} retry={reload} />
        ) : (
          <div className="food-grid four">
            {top.map((p) => (
              <FoodCard key={p.id} place={p} />
            ))}
          </div>
        )}
      </section>
      <section className="container section gems">
        <SectionHead
          title="The good kind of hidden."
          copy="Small spots and little discoveries worth passing on."
          action="Find your next gem"
          to="/discover"
        />
        <div className="food-grid three">
          {data?.places
            .filter((p) => ["roti", "satay", "kopi"].includes(p.id))
            .map((p) => (
              <FoodCard key={p.id} place={p} />
            ))}
        </div>
      </section>
      <section className="journey">
        <div className="container journey-inner">
          <div>
            <h2>
              A little detour.
              <br />A lot of flavour.
            </h2>
            <p>
              Follow your appetite through Malaysia — from a kopitiam breakfast
              to your next pasar malam find.
            </p>
            <Link className="btn" to="/discover?city=Penang">
              Explore Malaysia
              <ArrowRight size={18} />
            </Link>
          </div>
          <Link className="journey-photo" to="/discover?city=Penang">
            <img
              src={mediaUrl("/assets/city.jpg")}
              alt="George Town, Penang skyline at dusk"
              loading="lazy"
            />
            <div>
              <h3>Next stop: Penang</h3>
              <p>A city to explore, one meal at a time.</p>
            </div>
          </Link>
        </div>
      </section>
      <section className="container section community-invite">
        <div>
          <h2>
            Found something sedap?
            <br />
            Pass it on.
          </h2>
          <p>
            A photo, a favourite stall, a story over supper.
            <br />
            Your next recommendation could make someone’s day.
          </p>
          <div className="button-row">
            <Link className="btn secondary" to="/community">
              Join the community
              <ArrowRight size={18} />
            </Link>
            <Link className="text-link" to="/feed">
              <Play size={17} />
              Watch the food feed
            </Link>
          </div>
        </div>
        <div className="community-preview">
          <div className="author">
            <Avatar name="Aina Lim" />
            <div>
              <strong>Aina’s food diary</strong>
              <small>A little breakfast inspiration · Sample post</small>
            </div>
          </div>
          <div className="preview-food">
            <img
              src={mediaUrl("/assets/roti.jpg")}
              alt="Golden roti canai with dhal"
              loading="lazy"
            />
            <div>
              <h3>Roti canai & dhal</h3>
              <p>Kedai Pagi · Chow Kit</p>
            </div>
          </div>
          <blockquote>
            “Crispy edges, fluffy middle. This is my kind of morning.”
          </blockquote>
        </div>
      </section>
      <div className="container">
        <SampleNote />
      </div>
    </>
  );
}

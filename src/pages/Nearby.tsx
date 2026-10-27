import { useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Play, ArrowRight, LocateFixed } from "lucide-react";
import { useApi, mediaUrl, money } from "../api";
import { cities, useGeo } from "../context";
import { FoodMap } from "../components/Map";
import { Empty, ErrorState, Loading } from "../components/ui";
import type { Place } from "../types";
export default function Nearby() {
  const geo = useGeo(),
    [radius, setRadius] = useState("10"),
    [open, setOpen] = useState(false),
    [budget, setBudget] = useState(false),
    [selected, setSelected] = useState("");
  const query = new URLSearchParams({
    lat: String(geo.coords.lat),
    lng: String(geo.coords.lng),
    sort: "distance",
    ...(radius ? { radius } : {}),
    ...(open ? { open: "true" } : {}),
    ...(budget ? { maxPrice: "15" } : {}),
  });
  const { data, error, loading, reload } = useApi<{ places: Place[] }>(
    "/places?" + query,
  );
  const current = data?.places.find((p) => p.id === selected);
  return (
    <div className="container nearby-page">
      <div className="page-heading">
        <h1>
          Good food.
          <br className="mobile-only" /> Right around here.
        </h1>
        <p>Your next food stop could be just around the corner.</p>
      </div>
      <div className="nearby-toolbar">
        <label className="city-select">
          <MapPin size={21} />
          <select
            aria-label="Search city"
            value={geo.city}
            onChange={(e) => geo.chooseCity(e.target.value)}
          >
            {Object.keys(cities).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <button
          className="btn secondary"
          disabled={geo.locating}
          onClick={geo.locate}
        >
          <LocateFixed size={18} />
          {geo.locating ? "Finding your location…" : "Use my location"}
        </button>
        <Link className="btn" to="/feed">
          <Play size={18} />
          Scroll food nearby
        </Link>
      </div>
      {geo.error && (
        <p className="form-error" role="alert">
          {geo.error}
        </p>
      )}
      <div className="nearby-filters">
        <select
          aria-label="Search distance"
          value={radius}
          onChange={(e) => setRadius(e.target.value)}
        >
          <option value="3">Within 3 km</option>
          <option value="10">Within 10 km</option>
          <option value="50">Within 50 km</option>
          <option value="">Any distance</option>
        </select>
        <button
          className={`chip ${open ? "active" : ""}`}
          aria-pressed={open}
          onClick={() => setOpen(!open)}
        >
          Open now
        </button>
        <button
          className={`chip ${budget ? "active" : ""}`}
          aria-pressed={budget}
          onClick={() => setBudget(!budget)}
        >
          Under RM15
        </button>
        <span className="muted">
          {geo.source === "device"
            ? "Around your device location"
            : geo.source === "map"
              ? "Around your selected map point"
              : "Distances from " + geo.city + " centre"}
        </span>
      </div>
      <div className="nearby-layout">
        <section className="nearby-list">
          <h2>Your next few bites</h2>
          {loading ? (
            <Loading />
          ) : error ? (
            <ErrorState message={error} retry={reload} />
          ) : !data?.places.length ? (
            <Empty title="A little further afield?">
              No listings in this area yet. Try a wider distance or choose
              another city.
            </Empty>
          ) : (
            data.places.map((p) => (
              <article
                className={
                  selected === p.id ? "nearby-item selected" : "nearby-item"
                }
                key={p.id}
              >
                <button
                  className="nearby-select"
                  onClick={() => setSelected(p.id)}
                  aria-label={"Show " + p.name + " on map"}
                >
                  <img src={mediaUrl(p.image)} alt={p.dish} />
                  <span>
                    <strong>{p.dish}</strong>
                    <small>
                      {p.name} · {p.area}
                    </small>
                    <span>
                      {money(p.price)} · {p.distance?.toFixed(1)} km
                    </span>
                    {p.sample && <small>Sample listing</small>}
                  </span>
                </button>
                <Link
                  to={"/place/" + p.id}
                  className="round"
                  aria-label={"View " + p.name}
                >
                  <ArrowRight size={18} />
                </Link>
              </article>
            ))
          )}
          <div className="dietary-note">
            <h3>Exploring somewhere else?</h3>
            <p>
              Choose a city, use your location, or click the map to search
              around a new point. Precise location is optional.
            </p>
          </div>
        </section>
        <div className="nearby-map">
          <FoodMap
            places={data?.places || []}
            center={geo.coords}
            selected={selected}
            onSelect={setSelected}
            onPoint={geo.setPoint}
          />
          {current && (
            <Link to={"/place/" + current.id} className="selected-map-place">
              <img src={mediaUrl(current.image)} alt="" />
              <span>
                <strong>{current.dish}</strong>
                <small>
                  {current.name} · {money(current.price)}
                </small>
              </span>
              <ArrowRight />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

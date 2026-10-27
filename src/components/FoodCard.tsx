import { useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, MapPin, Star, ArrowUpRight } from "lucide-react";
import { mediaUrl, money, send } from "../api";
import { useAuth, useToast } from "../context";
import type { Place } from "../types";
export function FoodCard({
  place,
  compact = false,
}: {
  place: Place;
  compact?: boolean;
}) {
  const [saved, setSaved] = useState(place.saved || false),
    [busy, setBusy] = useState(false);
  const auth = useAuth(),
    toast = useToast();
  async function save() {
    if (!auth.requireUser() || busy) return;
    setBusy(true);
    try {
      const r = await send<{ saved: boolean }>("/saves", {
        type: "place",
        id: place.id,
      });
      setSaved(r.saved);
      toast(
        r.saved
          ? "Saved for your next makan."
          : "Removed from your saved places.",
      );
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className={`food-card ${compact ? "compact" : ""}`}>
      <div className="food-photo">
        <Link to={"/place/" + place.id} tabIndex={-1} aria-hidden="true">
          <img src={mediaUrl(place.image)} alt={place.dish} loading="lazy" />
        </Link>
        <button
          className={`round save-button ${saved ? "selected" : ""}`}
          aria-label={saved ? "Unsave " + place.dish : "Save " + place.dish}
          aria-pressed={saved}
          disabled={busy}
          onClick={save}
        >
          <Bookmark size={19} fill={saved ? "currentColor" : "none"} />
        </button>
        {place.sample && <span className="photo-label">Sample</span>}
      </div>
      <div className="food-info">
        <h3>
          <Link to={"/place/" + place.id}>{place.dish}</Link>
        </h3>
        <p>
          {place.name} · {place.area}
        </p>
        <div className="food-meta">
          <span>
            <Star size={14} />
            {place.rating ? place.rating.toFixed(1) : "New"}
          </span>
          <span>{place.cuisine}</span>
          {place.distance !== undefined && (
            <span>
              <MapPin size={12} />
              {place.distance.toFixed(1)} km
            </span>
          )}
        </div>
        <div className="food-bottom">
          <strong>{money(place.price)}</strong>
          <Link to={"/place/" + place.id} aria-label={"View " + place.dish}>
            <ArrowUpRight size={20} />
          </Link>
        </div>
      </div>
    </article>
  );
}

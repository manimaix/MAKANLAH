import { useRef, useState } from "react";
import { ImagePlus, Plus, Trash2, Upload } from "lucide-react";
import { api, mediaUrl, money, send } from "../../api";
import { Drawer, Field } from "../ui";
import type { Media, MenuChoice, MenuItem, Place } from "../../types";
export function DishEditor({
  place,
  item,
  categories,
  onClose,
  onSaved,
}: {
  place: Place;
  item?: MenuItem;
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [value, setValue] = useState({
    name: item?.name || "",
    description: item?.description || "",
    category: item?.category || categories[0] || "Mains",
    price: item ? item.priceCents / 100 : 12,
    image: item?.image || place.image,
    available: item?.available ?? true,
    variants: item?.variants || ([] as MenuChoice[]),
    addOns: item?.addOns || ([] as MenuChoice[]),
  });
  const [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("files", file);
      const r = await api<{ media: Media[] }>("/media", {
        method: "POST",
        body: form,
      });
      setValue((v) => ({ ...v, image: r.media[0].url }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }
  function choice(
    key: "variants" | "addOns",
    index: number,
    patch: Partial<MenuChoice>,
  ) {
    setValue((v) => ({
      ...v,
      [key]: v[key].map((c, i) => (i === index ? { ...c, ...patch } : c)),
    }));
  }
  return (
    <Drawer title={item ? "Edit item" : "Add item"} onClose={onClose}>
      <form
        className="dish-editor"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await send(
              item
                ? "/merchant/menu/" + item.id
                : "/merchant/places/" + place.id + "/menu",
              { ...value, priceCents: Math.round(value.price * 100) },
              item ? "PUT" : "POST",
            );
            onSaved();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="dish-photo-picker">
          <img src={mediaUrl(value.image)} alt="Item photo" />
          <button
            type="button"
            className="btn secondary"
            disabled={uploading}
            onClick={() => input.current?.click()}
          >
            <Upload size={16} />
            {uploading ? "Uploading…" : "Change photo"}
          </button>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            hidden
            onChange={(e) => upload(e.target.files?.[0])}
          />
        </div>
        <Field label="Item name">
          <input
            required
            maxLength={100}
            value={value.name}
            onChange={(e) => setValue((v) => ({ ...v, name: e.target.value }))}
            placeholder="Nasi lemak ayam rendang"
          />
        </Field>
        <Field label="Description">
          <textarea
            rows={3}
            maxLength={500}
            value={value.description}
            onChange={(e) =>
              setValue((v) => ({ ...v, description: e.target.value }))
            }
            placeholder="Describe the ingredients and portion."
          />
        </Field>
        <div className="form-grid">
          <Field label="Price (RM)">
            <input
              required
              type="number"
              min="0"
              max="5000"
              step="0.01"
              value={value.price}
              onChange={(e) =>
                setValue((v) => ({ ...v, price: Number(e.target.value) }))
              }
            />
          </Field>
          <Field label="Category">
            <input
              required
              list="menu-categories"
              maxLength={60}
              value={value.category}
              onChange={(e) =>
                setValue((v) => ({ ...v, category: e.target.value }))
              }
            />
            <datalist id="menu-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
        </div>
        <label className="availability-control">
          <span>
            <strong>Available to order</strong>
            <small>Turn off when the kitchen runs out.</small>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={value.available}
            onChange={(e) =>
              setValue((v) => ({ ...v, available: e.target.checked }))
            }
          />
        </label>
        {(["variants", "addOns"] as const).map((key) => (
          <section className="dish-options" key={key}>
            <div>
              <h3>{key === "variants" ? "Options" : "Extras"}</h3>
              <p>
                {key === "variants"
                  ? "The customer selects one option."
                  : "The customer can select more than one extra."}
              </p>
            </div>
            {value[key].map((c, i) => (
              <div className="option-editor-row" key={c.id}>
                <input
                  aria-label={
                    (key === "variants" ? "Option" : "Extra") +
                    " name " +
                    (i + 1)
                  }
                  required
                  maxLength={60}
                  value={c.name}
                  onChange={(e) => choice(key, i, { name: e.target.value })}
                  placeholder={
                    key === "variants" ? "Regular / Large" : "Extra egg"
                  }
                />
                <label>
                  <span>+ RM</span>
                  <input
                    aria-label={
                      (key === "variants" ? "Option" : "Extra") +
                      " price " +
                      (i + 1)
                    }
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={c.priceCents / 100}
                    onChange={(e) =>
                      choice(key, i, {
                        priceCents: Math.round(Number(e.target.value) * 100),
                      })
                    }
                  />
                </label>
                <button
                  type="button"
                  className="round"
                  aria-label={"Remove " + c.name}
                  onClick={() =>
                    setValue((v) => ({
                      ...v,
                      [key]: v[key].filter((_, j) => j !== i),
                    }))
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-link"
              disabled={value[key].length >= (key === "variants" ? 8 : 12)}
              onClick={() =>
                setValue((v) => ({
                  ...v,
                  [key]: [
                    ...v[key],
                    { id: crypto.randomUUID(), name: "", priceCents: 0 },
                  ],
                }))
              }
            >
              <Plus size={16} />
              {key === "variants" ? "Add option" : "Add an extra"}
            </button>
          </section>
        ))}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="drawer-save">
          <button type="button" className="btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" disabled={busy || uploading}>
            {busy ? "Saving…" : item ? "Save changes" : "Add to menu"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}

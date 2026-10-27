import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { mediaUrl, money } from "../../api";
import { Drawer, Field } from "../ui";
import type { MenuItem, Place } from "../../types";
export interface CartLine {
  key: string;
  menuId: string;
  quantity: number;
  variantId?: string;
  addOnIds: string[];
  note: string;
}
export function linePrice(line: CartLine, item: MenuItem) {
  return (
    item.priceCents +
    (item.variants?.find((v) => v.id === line.variantId)?.priceCents || 0) +
    (item.addOns || [])
      .filter((a) => line.addOnIds.includes(a.id))
      .reduce((n, a) => n + a.priceCents, 0)
  );
}
export function DishPicker({
  item,
  place,
  onClose,
  onAdd,
}: {
  item: MenuItem;
  place: Place;
  onClose: () => void;
  onAdd: (line: CartLine) => void;
}) {
  const [variant, setVariant] = useState(item.variants?.[0]?.id || ""),
    [addOns, setAddOns] = useState<string[]>([]),
    [quantity, setQuantity] = useState(1),
    [note, setNote] = useState("");
  const line: CartLine = {
    key: JSON.stringify([item.id, variant, [...addOns].sort(), note.trim()]),
    menuId: item.id,
    quantity,
    ...(variant ? { variantId: variant } : {}),
    addOnIds: addOns,
    note: note.trim(),
  };
  return (
    <Drawer title={item.name} onClose={onClose}>
      <form
        className="dish-picker"
        onSubmit={(e) => {
          e.preventDefault();
          onAdd(line);
        }}
      >
        <img
          className="picker-photo"
          src={mediaUrl(item.image || place.image)}
          alt={item.name}
        />
        <p className="picker-description">{item.description}</p>
        <strong className="picker-price">{money(item.priceCents / 100)}</strong>
        {!!item.variants?.length && (
          <fieldset className="guest-options">
            <legend>
              Options<span>Select one option</span>
            </legend>
            {item.variants.map((v) => (
              <label key={v.id}>
                <input
                  type="radio"
                  name="dish-option"
                  value={v.id}
                  checked={variant === v.id}
                  onChange={() => setVariant(v.id)}
                  required
                />
                <span>{v.name}</span>
                <strong>
                  {v.priceCents ? "+" + money(v.priceCents / 100) : "Included"}
                </strong>
              </label>
            ))}
          </fieldset>
        )}
        {!!item.addOns?.length && (
          <fieldset className="guest-options">
            <legend>
              Extras<span>Optional</span>
            </legend>
            {item.addOns.map((a) => (
              <label key={a.id}>
                <input
                  type="checkbox"
                  checked={addOns.includes(a.id)}
                  onChange={(e) =>
                    setAddOns((ids) =>
                      e.target.checked
                        ? [...ids, a.id]
                        : ids.filter((id) => id !== a.id),
                    )
                  }
                />
                <span>{a.name}</span>
                <strong>+{money(a.priceCents / 100)}</strong>
              </label>
            ))}
          </fieldset>
        )}
        <Field label="Item note" hint="For allergy information, ask the staff.">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            rows={2}
            placeholder=""
          />
        </Field>
        <div className="picker-bottom">
          <div className="quantity-control">
            <button
              type="button"
              className="round"
              aria-label="Decrease quantity"
              disabled={quantity <= 1}
              onClick={() => setQuantity((n) => n - 1)}
            >
              <Minus size={18} />
            </button>
            <strong>{quantity}</strong>
            <button
              type="button"
              className="round"
              aria-label="Increase quantity"
              disabled={quantity >= 20}
              onClick={() => setQuantity((n) => n + 1)}
            >
              <Plus size={18} />
            </button>
          </div>
          <button className="btn" disabled={!item.available}>
            Add to order · {money((linePrice(line, item) * quantity) / 100)}
          </button>
        </div>
      </form>
    </Drawer>
  );
}

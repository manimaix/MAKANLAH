import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Download, ExternalLink, Printer, QrCode } from "lucide-react";
import { Drawer, Field } from "../ui";
import { mediaUrl, send } from "../../api";
import { useToast } from "../../context";
import type { Place, Table } from "../../types";
export function tableLink(origin: string, table: Table) {
  try {
    const url = new URL("/order/" + table.token, origin);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}
export function QRArtwork({
  place,
  table,
  origin,
  onReady,
  onError,
}: {
  place: Place;
  table: Table;
  origin: string;
  onReady?: () => void;
  onError?: () => void;
}) {
  const [image, setImage] = useState("");
  const [error, setError] = useState(false);
  const url = tableLink(origin, table);
  useEffect(() => {
    let cancelled = false;
    setError(false);
    if (url)
      QRCode.toDataURL(url, {
        width: 600,
        margin: 3,
        color: { dark: "#2A1A0E", light: "#FEF3E2" },
      })
        .then((value) => {
          if (!cancelled) setImage(value);
        })
        .catch(() => {
          if (!cancelled) {
            setError(true);
            setImage("");
            onError?.();
          }
        });
    else {
      setError(true);
      setImage("");
    }
    return () => {
      cancelled = true;
    };
  }, [url]);
  return (
    <div className="m-qr-art">
      <span className="logo">
        makanlah<span>.</span>
      </span>
      <h3>{place.name}</h3>
      <p>{table.label}</p>
      {image ? (
        <img
          src={image}
          alt={"Scan to order at " + table.label}
          onLoad={onReady}
        />
      ) : (
        <div className="qr-placeholder">
          <QrCode />
          <p role="status">
            {error
              ? "Cannot create the QR code. Reload the page."
              : "Create QR code…"}
          </p>
        </div>
      )}
      <h4>Scan to order</h4>
      <small>Scan this QR code with your phone camera.</small>
    </div>
  );
}
export function TableQR({
  table,
  place,
  origin,
  onClose,
  onSaved,
}: {
  table: Table;
  place: Place;
  origin: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(table.label),
    [seats, setSeats] = useState(table.seats || 2),
    [area, setArea] = useState(table.area || "Main dining"),
    [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const toast = useToast(),
    url = tableLink(origin, table);
  return (
    <Drawer title={table.label + " · QR code"} onClose={onClose}>
      <QRArtwork
        place={place}
        table={table}
        origin={origin}
        onReady={() => setReady(true)}
      />
      <div className="qr-art-actions">
        <a
          className="btn"
          href={mediaUrl(
            "/api/merchant/tables/" +
              table.id +
              "/qr.png?origin=" +
              encodeURIComponent(origin),
          )}
          download
        >
          <Download size={16} />
          Download QR
        </a>
        <button
          className="btn secondary"
          disabled={!ready}
          onClick={() => window.print()}
        >
          <Printer size={16} />
          Print QR code
        </button>
      </div>
      <div className="qr-copy-row">
        <input aria-label="Table ordering link" readOnly value={url} />
        <button
          className="round"
          disabled={!url}
          aria-label="Copy table link"
          onClick={() =>
            navigator.clipboard
              .writeText(url)
              .then(() => toast("Table link copied."))
              .catch(() => toast("Copy the link from the address field."))
          }
        >
          <Copy size={17} />
        </button>
      </div>
      <a className="text-link" href={url} target="_blank" rel="noreferrer">
        Open customer menu
        <ExternalLink size={16} />
      </a>
      <form
        className="table-editor"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await send(
              "/merchant/tables/" + table.id,
              { label, seats, area },
              "PATCH",
            );
            toast("Table updated.");
            onSaved();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h3>Table details</h3>
        <Field label="Table name">
          <input
            required
            maxLength={60}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </Field>
        <div className="form-grid">
          <Field label="Seats">
            <input
              type="number"
              min="1"
              max="30"
              value={seats}
              onChange={(e) => setSeats(Number(e.target.value))}
            />
          </Field>
          <Field label="Dining area">
            <input
              required
              maxLength={60}
              value={area}
              onChange={(e) => setArea(e.target.value)}
            />
          </Field>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn secondary" disabled={busy}>
          {busy ? "Saving…" : "Save table details"}
        </button>
      </form>
    </Drawer>
  );
}

import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  Bookmark,
  Compass,
  MapPin,
  Menu,
  Plus,
  Play,
  Users,
  X,
  ArrowUpRight,
  Store,
  Shield,
} from "lucide-react";
import { cities, useAuth, useGeo } from "../context";
import { Avatar } from "./ui";
import { appPath } from "../paths";
export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="Makanlah home">
      makanlah<span>.</span>
    </Link>
  );
}
const links = [
  ["/discover", "Explore"],
  ["/nearby", "Near me"],
  ["/feed", "Food feed"],
  ["/community", "Community"],
  ["/about", "About us"],
];
export function LocationPicker() {
  const geo = useGeo();
  return (
    <details className="location-picker">
      <summary>
        <MapPin size={17} />
        <span>
          {geo.source === "device"
            ? "Your current location"
            : geo.source === "map"
              ? "Selected map location"
              : geo.city}
        </span>
      </summary>
      <div className="location-popover">
        <h3>Where are we makan-ing?</h3>
        <label className="field">
          <span>Explore a city</span>
          <select
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
          onClick={geo.locate}
          disabled={geo.locating}
        >
          <MapPin size={17} />
          {geo.locating ? "Finding you…" : "Use my location"}
        </button>
        <small>Precise location stays in this browser session.</small>
        {geo.error && (
          <p className="form-error" role="alert">
            {geo.error}
          </p>
        )}
      </div>
    </details>
  );
}
export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth(),
    [open, setOpen] = useState(false),
    location = useLocation();
  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);
  if (location.pathname === "/merchant" && user?.role === "merchant")
    return <>{children}</>;
  if (location.pathname === "/sign-in")
    return (
      <div className="account-layout">
        <header>
          <Logo />
          <Link to="/">Back to Makanlah</Link>
        </header>
        <main id="main">{children}</main>
        <footer>Developed by Nextgen Tech</footer>
      </div>
    );
  if (location.pathname.startsWith("/order/"))
    return (
      <div className="qr-order-layout">
        <a className="skip-link" href="#main">
          Skip to ordering
        </a>
        <header className="qr-order-header">
          <Logo />
          <span>Table ordering</span>
          <Link to="/discover">
            Explore Makanlah
            <ArrowUpRight size={15} />
          </Link>
        </header>
        <main id="main">{children}</main>
        <footer className="qr-order-footer">Developed by Nextgen Tech</footer>
      </div>
    );
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="site-header">
        <div className="nav-wrap">
          <Logo />
          <nav
            className={open ? "main-nav open" : "main-nav"}
            aria-label="Main navigation"
          >
            {links.map(([path, name]) => (
              <NavLink key={path} to={path}>
                {name}
              </NavLink>
            ))}
            {user?.role === "merchant" && (
              <NavLink to="/merchant">
                <Store size={16} />
                Merchant
              </NavLink>
            )}
            {user?.role === "admin" && (
              <NavLink to="/admin">
                <Shield size={16} />
                Admin
              </NavLink>
            )}
          </nav>
          <div className="nav-actions">
            <Link
              className="round saved-nav"
              to="/saved"
              aria-label="Saved places"
            >
              <Bookmark size={20} />
            </Link>
            <Link to="/post" className="btn share-nav">
              <Plus size={17} />
              Share a bite
            </Link>
            {user ? (
              <details className="account-menu">
                <summary aria-label="Account menu">
                  <Avatar name={user.name} />
                </summary>
                <div className="account-popover">
                  <strong>{user.name}</strong>
                  <small>{user.role}</small>
                  <Link to="/profile">My food diary</Link>
                  <Link to="/preferences">Taste preferences</Link>
                  {user.role === "merchant" && (
                    <Link to="/merchant">Merchant workspace</Link>
                  )}
                  {user.role === "admin" && (
                    <Link to="/admin">Admin workspace</Link>
                  )}
                  <button onClick={() => logout()}>Sign out</button>
                </div>
              </details>
            ) : (
              <Link to="/sign-in" className="sign-in-link">
                Sign in
              </Link>
            )}
            <button
              className="round menu-toggle"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main
        id="main"
        className={location.pathname === "/feed" ? "feed-main" : ""}
      >
        {children}
      </main>
      {location.pathname !== "/feed" && <Footer />}
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <NavLink to="/discover">
          <Compass />
          Explore
        </NavLink>
        <NavLink to="/nearby">
          <MapPin />
          Near me
        </NavLink>
        <NavLink to="/feed">
          <Play />
          Food feed
        </NavLink>
        <NavLink to="/community">
          <Users />
          Community
        </NavLink>
        <NavLink to="/post">
          <Plus />
          Post
        </NavLink>
      </nav>
    </>
  );
}
function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-top">
        <div>
          <Logo />
          <p>
            Good food brings us together.
            <br />
            Let’s find your next favourite bite.
          </p>
        </div>
        <div>
          <h3>Go makan</h3>
          <Link to="/discover">Explore food</Link>
          <Link to="/nearby">Food near you</Link>
          <Link to="/feed">Food feed</Link>
        </div>
        <div>
          <h3>Pull up a chair</h3>
          <Link to="/community">Community</Link>
          <Link to="/about">About Makanlah</Link>
          <Link to="/sign-in?mode=register&role=merchant">
            List your food <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>
          Developed with appetite by <strong>Nextgen Tech.</strong>
        </span>
        <a href={appPath("/ASSET-CREDITS.md")} target="_blank" rel="noreferrer">
          Photography credits
        </a>
        <span>Made for Malaysia. Open to everyone.</span>
      </div>
    </footer>
  );
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api, send } from "./api";
import type { Coordinates, User } from "./types";

interface Auth {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setUser: (u: User | null) => void;
  logout: () => Promise<void>;
  requireUser: () => boolean;
}
const AuthContext = createContext<Auth>(null!);
export const useAuth = () => useContext(AuthContext);
const ToastContext = createContext<(message: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);
export const cities: Record<string, Coordinates> = {
  "Kuala Lumpur": { lat: 3.1535, lng: 101.707 },
  Penang: { lat: 5.4141, lng: 100.3288 },
  "Petaling Jaya": { lat: 3.1073, lng: 101.6067 },
  Melaka: { lat: 2.195, lng: 102.249 },
  "Johor Bahru": { lat: 1.4927, lng: 103.7414 },
  Ipoh: { lat: 4.5975, lng: 101.0901 },
  "Kota Kinabalu": { lat: 5.9804, lng: 116.0735 },
  Kuching: { lat: 1.5533, lng: 110.3592 },
};
interface Geo {
  coords: Coordinates;
  city: string;
  source: "city" | "device" | "map";
  locating: boolean;
  error: string;
  locate: () => void;
  chooseCity: (city: string) => void;
  setPoint: (point: Coordinates) => void;
}
const LocationContext = createContext<Geo>(null!);
export const useGeo = () => useContext(LocationContext);
export function Providers({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [toast, setToast] = useState("");
  const nav = useNavigate(),
    location = useLocation();
  const refresh = useCallback(async () => {
    try {
      const r = await api<{ user: User | null }>("/session");
      setUser(r.user);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh().catch(() => setToast("Cannot connect to Makanlah. Try again."));
  }, [refresh]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const [city, setCity] = useState(() => {
    try {
      return localStorage.getItem("makanlah-city") || "Kuala Lumpur";
    } catch {
      return "Kuala Lumpur";
    }
  });
  const [coords, setCoords] = useState<Coordinates>(
      cities[city] || cities["Kuala Lumpur"],
    ),
    [source, setSource] = useState<Geo["source"]>("city"),
    [locating, setLocating] = useState(false),
    [geoError, setGeoError] = useState("");
  const chooseCity = (value: string) => {
    setCity(value);
    setCoords(cities[value] || cities["Kuala Lumpur"]);
    setSource("city");
    setGeoError("");
    try {
      localStorage.setItem("makanlah-city", value);
    } catch {}
  };
  const locate = () => {
    if (!navigator.geolocation) {
      setGeoError(
        "Location is unavailable on this browser. Choose a city instead.",
      );
      return;
    }
    setLocating(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCoords({ lat: p.coords.latitude, lng: p.coords.longitude });
        setSource("device");
        setLocating(false);
      },
      (e) => {
        setLocating(false);
        setGeoError(
          e.code === 1
            ? "Location access is off. Enable it in your browser or choose a city."
            : "Your location could not be found. Try again or choose a city.",
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  };
  const auth: Auth = {
    user,
    setUser,
    loading,
    refresh,
    logout: async () => {
      await send("/auth/logout", {});
      setUser(null);
      nav("/");
    },
    requireUser: () => {
      if (user) return true;
      nav(
        "/sign-in?next=" +
          encodeURIComponent(location.pathname + location.search),
      );
      return false;
    },
  };
  return (
    <AuthContext.Provider value={auth}>
      <LocationContext.Provider
        value={{
          city,
          coords,
          source,
          locating,
          error: geoError,
          locate,
          chooseCity,
          setPoint: (p) => {
            setCoords(p);
            setSource("map");
          },
        }}
      >
        <ToastContext.Provider value={setToast}>
          {children}
          <div className={`toast ${toast ? "visible" : ""}`} role="status">
            {toast}
          </div>
        </ToastContext.Provider>
      </LocationContext.Provider>
    </AuthContext.Provider>
  );
}

import { Component, Suspense, lazy, type ReactNode } from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { Providers, useAuth } from "./context";
import { Layout } from "./components/Layout";
import { Empty, Loading } from "./components/ui";
import Home from "./pages/Home";
import { staticPreview } from "./paths";
const Discover = lazy(() => import("./pages/Discover"));
const Nearby = lazy(() => import("./pages/Nearby"));
const Detail = lazy(() => import("./pages/Detail"));
const Community = lazy(() => import("./pages/Community"));
const Feed = lazy(() => import("./pages/Feed"));
const Compose = lazy(() => import("./pages/Compose"));
const About = lazy(() => import("./pages/About"));
const Merchant = lazy(() => import("./pages/MerchantWorkspace"));
const Admin = lazy(() => import("./pages/Admin"));
const SignIn = lazy(() =>
  import("./pages/Account").then((m) => ({ default: m.SignIn })),
);
const Preferences = lazy(() =>
  import("./pages/Account").then((m) => ({ default: m.PreferencesPage })),
);
const Library = lazy(() =>
  import("./pages/Account").then((m) => ({ default: m.Library })),
);
const TableOrder = lazy(() => import("./pages/QRMenu"));
const OrderReceipt = lazy(() =>
  import("./pages/Order").then((m) => ({ default: m.OrderReceipt })),
);
function Require({ children, role }: { children: ReactNode; role?: string }) {
  const auth = useAuth(),
    location = useLocation();
  if (auth.loading) return <Loading />;
  if (!auth.user)
    return (
      <Navigate
        replace
        to={
          "/sign-in?next=" +
          encodeURIComponent(location.pathname + location.search)
        }
      />
    );
  if (role && auth.user.role !== role)
    return (
      <Empty title="Access denied" action="Explore food" to="/discover">
        This account cannot open the page. Sign in with an account that has
        access.
      </Empty>
    );
  return children;
}
class AppError extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="container error-state">
        <h1>Cannot display the page</h1>
        <p>Reload the page.</p>
        <button className="btn" onClick={() => location.reload()}>
          Reload Makanlah
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  return (
    <AppError>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "") || "/"}>
        <Providers>
          {staticPreview && <div className="preview-notice" role="note">Website preview. Accounts, uploads and ordering are not enabled.</div>}
          <Layout>
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/discover" element={<Discover />} />
                <Route path="/nearby" element={<Nearby />} />
                <Route path="/place/:id" element={<Detail />} />
                <Route path="/feed" element={<Feed />} />
                <Route path="/community" element={<Community />} />
                <Route path="/about" element={<About />} />
                <Route path="/sign-in" element={<SignIn />} />
                <Route
                  path="/post"
                  element={
                    <Require>
                      <Compose />
                    </Require>
                  }
                />
                <Route
                  path="/preferences"
                  element={
                    <Require>
                      <Preferences />
                    </Require>
                  }
                />
                <Route
                  path="/saved"
                  element={
                    <Require>
                      <Library savedOnly />
                    </Require>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <Require>
                      <Library />
                    </Require>
                  }
                />
                <Route
                  path="/merchant"
                  element={
                    <Require role="merchant">
                      <Merchant />
                    </Require>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <Require role="admin">
                      <Admin />
                    </Require>
                  }
                />
                <Route path="/order/receipt/:id" element={<OrderReceipt />} />
                <Route path="/order/:token" element={<TableOrder />} />
                <Route
                  path="*"
                  element={
                    <Empty
                      title="This bite went missing."
                      action="Back to Makanlah"
                      to="/"
                    >
                      The page you’re looking for isn’t here.
                    </Empty>
                  }
                />
              </Routes>
            </Suspense>
          </Layout>
        </Providers>
      </BrowserRouter>
    </AppError>
  );
}

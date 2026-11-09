import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { AppLayout } from "@/AppLayout";
import { AuthForm } from "@/components/AuthForm";
import Account from "@/pages/Account";
import Consultation from "@/pages/Consultation";
import Home from "@/pages/Home";
import NewServer from "@/pages/NewServer";
import NotFound from "@/pages/NotFound";
import Recommendation from "@/pages/Recommendation";
import Reports from "@/pages/Reports";
import RouteError from "@/pages/RouteError";
import Server from "@/pages/Server";
import "./globals.css";

// three.js is most of the bundle, so the backdrop loads after the page it sits behind.
const Planet = lazy(() => import("@/components/Planet").then((m) => ({ default: m.Planet })));

const router = createBrowserRouter([
  { path: "/login", element: <AuthForm mode="login" /> },
  { path: "/signup", element: <AuthForm mode="signup" /> },
  {
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Home /> },
      { path: "servers/new", element: <NewServer /> },
      { path: "servers/:id", element: <Server /> },
      { path: "servers/:id/recommendations/:recommendationId", element: <Recommendation /> },
      { path: "consultations/:id", element: <Consultation /> },
      { path: "reports", element: <Reports /> },
      { path: "account", element: <Account /> },
    ],
  },
  { path: "*", element: <NotFound /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Suspense>
      <Planet />
    </Suspense>
    <RouterProvider router={router} />
  </StrictMode>,
);

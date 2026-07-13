"use client";

import { ToastContainer } from "react-toastify";
import { UserProvider } from "@/src/utils/userContext";

export default function Providers({ children }) {
  return (
    <UserProvider>
      {children}
      {/* App-wide toast notifications (top-right, auto-hide after 3s). Mounted at
          the provider level so toasts survive client-side navigation, e.g. the
          "signed in" toast persists through the redirect to the dashboard. */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        newestOnTop
        pauseOnHover
        closeOnClick
      />
    </UserProvider>
  );
}

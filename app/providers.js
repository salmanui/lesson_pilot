"use client";

import { ToastContainer } from "react-toastify";
import { UserProvider } from "@/src/utils/userContext";
import SubscriptionModal from "@/src/components/SubscriptionModal";

export default function Providers({ children }) {
  return (
    <UserProvider>
      {children}
      {/* Every AI tool shares one free-generation allowance, so the modal that
          explains the limit is mounted once here rather than per page. */}
      <SubscriptionModal />
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

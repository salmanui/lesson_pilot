"use client";

import React, { createContext, useEffect, useState } from "react";

export const UserContext = createContext({
  user: null,
  setUser: () => {},
  hasLoadedUser: false,
  isSignInModalOpen: false,
  openSignInModal: () => {},
  closeSignInModal: () => {},
  isSubscriptionModalOpen: false,
  openSubscriptionModal: () => {},
  closeSubscriptionModal: () => {},
  subscriptionStatusLoading: false,
  hasActiveSubscription: null,
  subscriptionSummary: null,
  authMode: "default",
  logout: () => {},
});

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [hasLoadedUser, setHasLoadedUser] = useState(false);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState("default");

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const storedUser = JSON.parse(localStorage.getItem("user")) || null;
      setUser(storedUser);
    } catch {
      setUser(null);
    } finally {
      setHasLoadedUser(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !hasLoadedUser) return;

    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user, hasLoadedUser]);

  const openSignInModal = (mode = "default") => {
    setAuthMode(mode);
    setIsSignInModalOpen(true);
  };

  const closeSignInModal = () => {
    setIsSignInModalOpen(false);
    setAuthMode("default");
  };

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
      localStorage.removeItem("userId");
      localStorage.removeItem("email");
      localStorage.removeItem("mobileNumber");
      localStorage.removeItem("mobileNo");
      localStorage.removeItem("phoneNo");
      localStorage.removeItem("phoneNumber");
    }

    setUser(null);
    closeSignInModal();
  };

  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        hasLoadedUser,
        isSignInModalOpen,
        openSignInModal,
        closeSignInModal,
        isSubscriptionModalOpen: false,
        openSubscriptionModal: () => {},
        closeSubscriptionModal: () => {},
        subscriptionStatusLoading: false,
        hasActiveSubscription: null,
        subscriptionSummary: null,
        authMode,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

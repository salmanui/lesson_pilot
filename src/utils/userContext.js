"use client";

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getUserSubscriptionStatus,
  startTrialIfNeeded,
} from "./subscriptionApi";

export const UserContext = createContext({
  user: null,
  setUser: () => {},
  hasLoadedUser: false,
  isSignInModalOpen: false,
  openSignInModal: () => {},
  closeSignInModal: () => {},
  isSubscriptionModalOpen: false,
  subscriptionModalReason: null,
  subscriptionModalSourceTool: null,
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
  // `reason` and `sourceTool` come from the caller and drive the modal's copy.
  const [subscriptionModal, setSubscriptionModal] = useState({
    isOpen: false,
    reason: null,
    sourceTool: null,
  });

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

  // Starts the 14-day clock the first time we see a signed-in user. No-ops once
  // anything already anchors the trial, so it cannot restart on a later sign-in.
  useEffect(() => {
    if (!hasLoadedUser || !user) return;
    startTrialIfNeeded(user);
  }, [user, hasLoadedUser]);

  const openSignInModal = (mode = "default") => {
    setAuthMode(mode);
    setIsSignInModalOpen(true);
  };

  const closeSignInModal = () => {
    setIsSignInModalOpen(false);
    setAuthMode("default");
  };

  // Stable identities: consumers list these in effect dependency arrays, and a
  // fresh function each render would re-run those effects on every render.
  const openSubscriptionModal = useCallback(
    ({ reason = null, sourceTool = null } = {}) =>
      setSubscriptionModal({ isOpen: true, reason, sourceTool }),
    [],
  );

  const closeSubscriptionModal = useCallback(
    () =>
      setSubscriptionModal({ isOpen: false, reason: null, sourceTool: null }),
    [],
  );

  // Entitlement only depends on the user payload, but the trial countdown inside
  // this summary is measured against the clock at the moment it was computed, so
  // it goes stale in a session left open across a day boundary. Anything that
  // renders the day count or gates on it re-reads status itself (see TrialBanner
  // and SubscriptionModal) rather than trusting this snapshot.
  const subscriptionSummary = useMemo(
    () => getUserSubscriptionStatus(user),
    [user],
  );

  // null while the stored session is still being read, so consumers can tell
  // "not loaded yet" apart from "loaded, and this user is not subscribed".
  const hasActiveSubscription = !hasLoadedUser
    ? null
    : Boolean(subscriptionSummary.isPremium);

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
    closeSubscriptionModal();
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
        isSubscriptionModalOpen: subscriptionModal.isOpen,
        subscriptionModalReason: subscriptionModal.reason,
        subscriptionModalSourceTool: subscriptionModal.sourceTool,
        openSubscriptionModal,
        closeSubscriptionModal,
        subscriptionStatusLoading: !hasLoadedUser,
        hasActiveSubscription,
        subscriptionSummary,
        authMode,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

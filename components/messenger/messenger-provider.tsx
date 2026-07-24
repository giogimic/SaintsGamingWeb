"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { generateKeyPair, exportPrivateKey, exportPublicKey, getLocalPrivateKey, setLocalPrivateKey } from "@/lib/crypto";
import { uploadPublicKey } from "@/app/actions/messenger";

type FriendUser = { id: string, username: string, image: string | null };

type MessengerContextType = {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  activeChat: FriendUser | null;
  setActiveChat: (user: FriendUser | null) => void;
  isCryptoReady: boolean;
};

const MessengerContext = createContext<MessengerContextType | undefined>(undefined);

export function MessengerProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [activeChat, setActiveChat] = useState<FriendUser | null>(null);
  const [isCryptoReady, setIsCryptoReady] = useState(false);

  useEffect(() => {
    if (!session?.user) return;

    async function initCrypto() {
      try {
        const localKey = getLocalPrivateKey();
        if (localKey) {
          setIsCryptoReady(true);
          return;
        }

        // Generate new keys
        const keyPair = await generateKeyPair();
        const pkcs8Base64 = await exportPrivateKey(keyPair.privateKey);
        const spkiBase64 = await exportPublicKey(keyPair.publicKey);

        // Store private key locally
        setLocalPrivateKey(pkcs8Base64);

        // Upload public key to server
        await uploadPublicKey(spkiBase64);
        
        setIsCryptoReady(true);
      } catch (err) {
        console.error("Failed to initialize E2EE keys:", err);
      }
    }

    initCrypto();
  }, [session]);

  return (
    <MessengerContext.Provider value={{ isOpen, setIsOpen, activeChat, setActiveChat, isCryptoReady }}>
      {children}
    </MessengerContext.Provider>
  );
}

export function useMessenger() {
  const context = useContext(MessengerContext);
  if (context === undefined) {
    return {
      isOpen: false,
      setIsOpen: () => {},
      activeChat: null,
      setActiveChat: () => {},
      isCryptoReady: false
    };
  }
  return context;
}

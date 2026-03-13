"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

type ConnectModule = typeof import("@stacks/connect");
type WalletNetwork = "mainnet" | "testnet";
type RequestFn = ConnectModule["request"];

type StacksWalletContextValue = {
  address: string | null;
  addressNetwork: WalletNetwork | null;
  connected: boolean;
  connecting: boolean;
  network: WalletNetwork;
  networkMismatch: boolean;
  connectWallet: () => Promise<string | null>;
  disconnectWallet: () => Promise<void>;
  requestWallet: (
    method: string,
    params?: Record<string, unknown>,
  ) => Promise<unknown>;
  refreshWallet: () => Promise<string | null>;
};

const StacksWalletContext = createContext<StacksWalletContextValue | null>(null);

const providerAliasMap: Record<string, string> = {
  leather: "LeatherProvider",
  leatherprovider: "LeatherProvider",
  xverse: "XverseProviders.BitcoinProvider",
  xverseprovider: "XverseProviders.BitcoinProvider",
  "xverseproviders.bitcoinprovider": "XverseProviders.BitcoinProvider",
  "xverseproviders.stacksprovider": "XverseProviders.BitcoinProvider",
  asigna: "AsignaProvider",
  asignaprovider: "AsignaProvider",
  fordefi: "FordefiProviders.UtxoProvider",
  fordefiprovider: "FordefiProviders.UtxoProvider",
  "fordefiproviders.utxoprovider": "FordefiProviders.UtxoProvider",
  walletconnect: "WalletConnectProvider",
  walletconnectprovider: "WalletConnectProvider",
};

const knownProviderIds = new Set([
  "LeatherProvider",
  "XverseProviders.BitcoinProvider",
  "AsignaProvider",
  "FordefiProviders.UtxoProvider",
  "WalletConnectProvider",
]);

const DEFAULT_APPROVED_PROVIDER_IDS = [
  "LeatherProvider",
  "XverseProviders.BitcoinProvider",
];

function normalizeProviderId(value: string): string | null {
  const trimmed = value.trim().replace(/^['"]|['"]$/g, "");
  if (!trimmed) return null;
  const normalized = providerAliasMap[trimmed.toLowerCase()] ?? trimmed;
  if (!knownProviderIds.has(normalized)) {
    return null;
  }
  return normalized;
}

let connectModulePromise: Promise<ConnectModule> | null = null;

async function loadConnectModule(): Promise<ConnectModule> {
  if (!connectModulePromise) {
    connectModulePromise = import("@stacks/connect");
  }
  return connectModulePromise;
}

function normalizeApprovedProviders(
  approvedProviderIds: string[] | undefined,
): string[] {
  const normalized = Array.from(
    new Set(
      (approvedProviderIds ?? DEFAULT_APPROVED_PROVIDER_IDS)
        .map(normalizeProviderId)
        .filter((provider): provider is string => Boolean(provider)),
    ),
  );

  return normalized.length > 0 ? normalized : DEFAULT_APPROVED_PROVIDER_IDS;
}

function pickAddressFromEntries(entries: unknown): string | null {
  if (!Array.isArray(entries)) return null;

  const parsed = entries
    .map((entry) => {
      const value = entry as Record<string, any> | null;
      if (!value || typeof value.address !== "string") return null;

      return {
        address: value.address,
        symbol: typeof value.symbol === "string" ? value.symbol : null,
      };
    })
    .filter(
      (entry): entry is { address: string; symbol: string | null } =>
        Boolean(entry),
    );

  const preferred = parsed.find(
    (entry) =>
      entry.symbol?.toUpperCase() === "STX" || entry.address.startsWith("S"),
  );

  return preferred?.address || parsed[0]?.address || null;
}

function extractWalletAddress(payload: unknown): string | null {
  if (typeof payload === "string") {
    return payload.startsWith("S") ? payload : null;
  }

  const value = payload as Record<string, any>;
  if (!value) return null;

  if (typeof value.address === "string") return value.address;
  if (typeof value.result?.address === "string") return value.result.address;

  const addresses = pickAddressFromEntries(value.addresses);
  if (addresses) return addresses;

  const resultAddresses = pickAddressFromEntries(value.result?.addresses);
  if (resultAddresses) return resultAddresses;

  const accounts = pickAddressFromEntries(value.accounts);
  if (accounts) return accounts;

  const resultAccounts = pickAddressFromEntries(value.result?.accounts);
  if (resultAccounts) return resultAccounts;

  if (typeof value.addresses?.stx?.[0]?.address === "string") {
    return value.addresses.stx[0].address;
  }
  if (typeof value.result?.addresses?.stx?.[0]?.address === "string") {
    return value.result.addresses.stx[0].address;
  }

  return null;
}

async function walletRequest(
  method: string,
  params?: Record<string, unknown>,
): Promise<unknown> {
  const { request } = await loadConnectModule();
  const requestAny = request as unknown as (
    methodOrConfig: unknown,
    params?: Record<string, unknown>,
  ) => Promise<unknown>;

  let directError: unknown;
  try {
    return await requestAny(method, params);
  } catch (error) {
    directError = error;
  }

  let objectStyleError: unknown;
  try {
    return await requestAny({ method, params });
  } catch (error) {
    objectStyleError = error;
  }

  if (!params) {
    return requestAny(method);
  }

  const errorMessages = [directError, objectStyleError]
    .map(error => {
      if (!error || typeof error !== "object") return null;
      const value = error as { message?: string; code?: number | string };
      if (typeof value.message === "string" && value.message.trim()) {
        return typeof value.code !== "undefined"
          ? `${value.message} (code ${value.code})`
          : value.message;
      }
      return null;
    })
    .filter((message): message is string => Boolean(message));

  if (errorMessages.length > 0) {
    throw new Error(
      `Wallet request failed for method: ${method}. ${errorMessages.join(" | ")}`,
    );
  }

  throw new Error(`Wallet request failed for method: ${method}`);
}

async function requestGetAddressesWithOptions(params: {
  request: RequestFn;
  options: Record<string, unknown>;
  network: WalletNetwork;
}) {
  const requestAny = params.request as unknown as (
    options: Record<string, unknown>,
    method: string,
    methodParams?: Record<string, unknown>,
  ) => Promise<unknown>;

  return requestAny(params.options, "getAddresses", {
    network: params.network,
  });
}

function isUserCancellation(error: unknown): boolean {
  const message = String(
    (error as { message?: string } | null)?.message || "",
  ).toLowerCase();
  const code = (error as { code?: number } | null)?.code;
  return (
    code === -32000 ||
    code === -31001 ||
    message.includes("cancel") ||
    message.includes("reject")
  );
}

function getAddressNetwork(address: string | null): WalletNetwork | null {
  if (!address) return null;
  if (address.startsWith("SP") || address.startsWith("SM")) return "mainnet";
  if (address.startsWith("ST") || address.startsWith("SN")) return "testnet";
  return null;
}

type StacksWalletProviderProps = {
  children: ReactNode;
  network: WalletNetwork;
  approvedProviderIds?: string[];
  walletConnectProjectId?: string;
};

export function StacksWalletProvider({
  children,
  network,
  approvedProviderIds,
  walletConnectProjectId,
}: StacksWalletProviderProps) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const approvedProviders = useMemo(
    () => normalizeApprovedProviders(approvedProviderIds),
    [approvedProviderIds],
  );
  const addressNetwork = useMemo(() => getAddressNetwork(address), [address]);
  const networkMismatch = Boolean(addressNetwork && addressNetwork !== network);

  const refreshWallet = useCallback(async () => {
    const { getLocalStorage, isConnected } = await loadConnectModule();

    if (!isConnected()) {
      setAddress(null);
      return null;
    }

    const methods = ["getAddresses", "stx_getAddresses", "stx_getAccounts"];
    for (const method of methods) {
      try {
        const response = await walletRequest(method, { network });
        const nextAddress = extractWalletAddress(response);
        if (nextAddress) {
          setAddress(nextAddress);
          return nextAddress;
        }
      } catch {
        // Try next provider method.
      }
    }

    const cachedAddress = getLocalStorage()?.addresses?.stx?.[0]?.address || null;
    setAddress(cachedAddress);
    return cachedAddress;
  }, [network]);

  const connectWallet = useCallback(async () => {
    setConnecting(true);
    try {
      const { connect, request } = await loadConnectModule();
      const baseOptions = {
        network,
        forceWalletSelect: true,
        ...(walletConnectProjectId
          ? { walletConnectProjectId }
          : {}),
      };
      const approvedOptions =
        approvedProviders.length > 0
          ? { approvedProviderIds: approvedProviders }
          : {};

      let response: unknown;
      try {
        response = await connect({
          ...baseOptions,
          ...approvedOptions,
        });
      } catch (error) {
        if (isUserCancellation(error)) {
          throw error;
        }

        try {
          response = await requestGetAddressesWithOptions({
            request,
            options: {
              ...baseOptions,
              ...approvedOptions,
            },
            network,
          });
        } catch (requestError) {
          if (approvedProviders.length === 0 || isUserCancellation(requestError)) {
            throw requestError;
          }

          try {
            response = await connect(baseOptions);
          } catch {
            response = await requestGetAddressesWithOptions({
              request,
              options: baseOptions,
              network,
            });
          }
        }
      }

      const nextAddress = extractWalletAddress(response) || (await refreshWallet());
      if (nextAddress) {
        setAddress(nextAddress);
      }
      return nextAddress;
    } catch (error) {
      console.error("Wallet connection error:", error);
      const msg =
        error instanceof Error ? error.message : "Wallet connection failed";
      toast.error("Could not connect wallet", {
        description: msg.includes("module") || msg.includes("factory")
          ? "Please try again or refresh the page. If the problem persists, the app may need a redeploy."
          : msg,
      });
      return null;
    } finally {
      setConnecting(false);
    }
  }, [approvedProviders, network, refreshWallet, walletConnectProjectId]);

  const disconnectWallet = useCallback(async () => {
    const { disconnect } = await loadConnectModule();
    await disconnect();
    setAddress(null);
  }, []);

  const requestWallet = useCallback(
    async (method: string, params?: Record<string, unknown>) =>
      walletRequest(method, params),
    [],
  );

  useEffect(() => {
    void refreshWallet();
  }, [refreshWallet]);

  const contextValue = useMemo<StacksWalletContextValue>(
    () => ({
      address,
      addressNetwork,
      connected: Boolean(address),
      connecting,
      network,
      networkMismatch,
      connectWallet,
      disconnectWallet,
      requestWallet,
      refreshWallet,
    }),
    [
      address,
      addressNetwork,
      connecting,
      network,
      networkMismatch,
      connectWallet,
      disconnectWallet,
      requestWallet,
      refreshWallet,
    ],
  );

  return (
    <StacksWalletContext.Provider value={contextValue}>
      {children}
    </StacksWalletContext.Provider>
  );
}

export function useStacksWallet(): StacksWalletContextValue {
  const context = useContext(StacksWalletContext);
  if (!context) {
    throw new Error(
      "useStacksWallet must be used within a StacksWalletProvider",
    );
  }
  return context;
}

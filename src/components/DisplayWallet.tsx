"use client";

import { useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, LogOut, Wallet } from "lucide-react";
import { useStacksWallet } from "@/components/stacks-wallet-provider";
import { shortenAddress } from "@/lib/utils";

function explorerBase() {
  return process.env.NEXT_PUBLIC_STACKS_NETWORK === "mainnet"
    ? "https://explorer.hiro.so/address"
    : "https://explorer.hiro.so/address";
}

export default function DisplayWallet() {
  const { address, connected, connecting, connectWallet, disconnectWallet } =
    useStacksWallet();

  const shortAddress = useMemo(
    () => (address ? shortenAddress(address) : null),
    [address],
  );

  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
  };

  const openExplorer = () => {
    if (!address) return;
    const chain =
      process.env.NEXT_PUBLIC_STACKS_NETWORK === "mainnet"
        ? ""
        : "?chain=testnet";
    window.open(`${explorerBase()}/${address}${chain}`, "_blank");
  };

  if (!connected || !address) {
    return (
      <Button
        variant="outline"
        className="ml-auto font-bold border-purple-900 text-purple-900 hover:text-purple-300 hover:border-purple-800"
        onClick={() => void connectWallet()}
        disabled={connecting}
      >
        <Wallet className="md:mr-2 h-4 w-4" />
        <span className="hidden md:inline">
          {connecting ? "Connecting..." : "Connect Wallet"}
        </span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="ml-auto font-bold border-purple-900 text-purple-900 hover:text-purple-300 hover:border-purple-800"
        >
          <span className="relative md:mr-2 inline-flex">
            <Wallet className="h-4 w-4" />
            <span
              className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-emerald-500"
              aria-hidden="true"
            />
          </span>
          <span className="hidden md:inline">
            Connected {shortAddress ? `(${shortAddress})` : ""}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-gray-900 text-white border-gray-800">
        <DropdownMenuLabel className="space-y-1">
          <p className="text-xs text-emerald-400">Connected</p>
          <p className="font-mono text-xs">{address}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-800" />
        <DropdownMenuItem
          onClick={() => void copyAddress()}
          className="cursor-pointer hover:bg-gray-800"
        >
          <Copy className="mr-2 h-4 w-4" />
          Copy address
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={openExplorer}
          className="cursor-pointer hover:bg-gray-800"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          View in explorer
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-gray-800" />
        <DropdownMenuItem
          onClick={() => void disconnectWallet()}
          className="cursor-pointer text-red-400 hover:bg-gray-800 hover:text-red-300"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

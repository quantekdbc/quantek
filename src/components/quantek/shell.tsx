import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronRight,
  Coins,
  Command,
  ExternalLink,
  Fingerprint,
  Github,
  Globe,
  Layers3,
  LayoutDashboard,
  LoaderCircle,
  Menu,
  Orbit,
  Rocket,
  ScanLine,
  Settings,
  ShieldCheck,
  Wallet,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Geometry, Wordmark } from "./geometry";
import { navigation, operationalNavigation, productNavigation } from "@/lib/quantek/data";
import { useConsole } from "@/lib/quantek/context";

const operationalIcons = [LayoutDashboard, Orbit, Layers3, ChartNoAxesCombined, Coins, Activity, Settings];
const productIcons = [Rocket, Fingerprint, WalletCards, ScanLine, BookOpen];

export function Shell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const c = useConsole();
  const [walletOpen, setWalletOpen] = useState(false);
  const [palette, setPalette] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState("");
  const title = navigation.find((item) => item[1] === path)?.[0] ?? "Console";

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setPalette((open) => !open);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const operations = operationalNavigation.map(([label, to], index) => {
    const Icon = operationalIcons[index] ?? LayoutDashboard;
    return (
      <Link
        to={to}
        key={to}
        className={"nav-link " + (path === to ? "active" : "")}
        aria-current={path === to ? "page" : undefined}
      >
        <Icon aria-hidden="true" />
        {label}
        {label === "Pools" && <span className="nav-count">03</span>}
        {label === "Activity" && <span className="nav-count">{String(c.events.length).padStart(2, "0")}</span>}
      </Link>
    );
  });

  return (
    <div className="app-shell">
      <a href="#workspace-content" className="skip-link">Skip to QUANTEK workspace</a>

      <header className="topbar">
        <div className="topbar-brand-zone">
          <Link to="/" className="brand" aria-label="QUANTEK Home">
            <Geometry compact />
            <Wordmark />
          </Link>

          <nav className="product-nav" aria-label="QUANTEK product navigation">
            {productNavigation.map(([label, to]) => (
              <Link
                key={to}
                to={to}
                className={"product-nav-link " + (path === to ? "active" : "")}
                aria-current={path === to ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
            <a
              className="product-nav-link external"
              href="https://github.com/quantekdbc/quantek"
              target="_blank"
              rel="noreferrer"
            >
              GitHub <Github size={11} aria-hidden="true" />
            </a>
          </nav>
        </div>

        <div className="topbar-right">
          <a
            className="protocol-link"
            href="https://docs.meteora.ag/developer-guide/guides/dbc/overview"
            target="_blank"
            rel="noreferrer"
            aria-label="Meteora Dynamic Bonding Curve documentation"
          >
            METEORA DBC <ExternalLink size={10} />
          </a>
          <Button
            variant="ghost"
            className="network-button"
            onClick={() => {
              const network = c.network === "devnet" ? "mainnet-beta" : "devnet";
              c.setNetwork(network);
              c.setRpc(network === "devnet" ? "https://api.devnet.solana.com" : "https://api.mainnet-beta.solana.com");
            }}
            aria-label={"Switch to " + (c.network === "devnet" ? "Mainnet" : "Devnet")}
          >
            <span className="live-dot" />
            {c.network === "devnet" ? "Devnet" : "Mainnet"}
            <ChevronDown size={11} />
          </Button>
          <div className="rpc-status" aria-live="polite">RPC <span className="live-dot" />{c.rpcHealth}</div>
          <Button variant="ghost" className="command-trigger" onClick={() => setPalette(true)} aria-label="Open command palette">
            <Command size={13} /><span className="keycap">⌘ K</span>
          </Button>
          <Button className="top-wallet" variant="outline" onClick={() => setWalletOpen(true)}>
            <Wallet aria-hidden="true" />
            {c.account ? c.account.address.slice(0, 4) + "…" + c.account.address.slice(-4) : "Connect Wallet"}
          </Button>
          <Button variant="ghost" size="icon" className="top-product-menu" onClick={() => setMobile(true)} aria-label="Open QUANTEK navigation">
            <Menu size={17} />
          </Button>
        </div>
      </header>

      <aside className="sidebar">
        <div className="rail-label">OPERATIONS / 01</div>
        <nav aria-label="Operations navigation">{operations.slice(0, 6)}</nav>
        <div className="rail-bottom">
          {operations.slice(6)}
          <div className="rail-system">
            <div className="micro"><span className="live-dot" />SIMULATION ENVIRONMENT</div>
            <p>No live funds at risk.</p>
            <Link to="/settings" className="micro flex justify-between mt-4">NETWORK SETTINGS <ArrowUpRight size={12} /></Link>
          </div>
          <div className="rail-footer"><span>QUANTEK v0.1</span><span>α</span></div>
        </div>
      </aside>

      <main className="workspace">
        <div className="workspace-top">
          <div className="breadcrumb" aria-label="Breadcrumb">
            <Button variant="ghost" size="icon" className="mobile-menu" aria-label="Open navigation" onClick={() => setMobile(true)}><Menu /></Button>
            <Globe size={12} aria-hidden="true" />
            <span>Workspace</span>
            <ChevronRight size={10} aria-hidden="true" />
            <span className="text-foreground">{title}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="workspace-date">SESSION / SIMULATED</span>
            <span className="status-tag" aria-label="Status: Demo Mode"><span className="live-dot" />DEMO MODE</span>
          </div>
        </div>
        <div className="page-content" id="workspace-content" tabIndex={-1}>
          {children}
          <footer className="footer">
            <span><ShieldCheck size={10} aria-hidden="true" />NON-CUSTODIAL BY DESIGN · WALLET-CONTROLLED EXECUTION</span>
            <span>WOTS-16 / SHA-256 · SOLANA / METEORA DBC <ArrowUpRight size={10} aria-hidden="true" /></span>
          </footer>
        </div>
      </main>

      <Dialog open={walletOpen} onOpenChange={setWalletOpen}>
        <DialogContent>
          <DialogTitle>{c.account ? "Connected wallet" : "Connect a wallet"}</DialogTitle>
          <DialogDescription>Wallet-standard connection. QUANTEK never asks for private keys.</DialogDescription>
          {c.account ? (
            <>
              <div className="code-block">{c.account.address}</div>
              <Button disabled={c.walletBusy} variant="outline" onClick={async () => { await c.disconnect(); setWalletOpen(false); }}>Disconnect wallet</Button>
            </>
          ) : (
            <div className="wallet-list">
              {c.wallets.length ? c.wallets.map((wallet) => (
                <Button
                  disabled={c.walletBusy}
                  variant="outline"
                  key={wallet.name}
                  onClick={async () => { if (await c.connect(wallet)) setWalletOpen(false); }}
                >
                  {c.walletBusy && <LoaderCircle className="animate-spin" />}
                  <img src={wallet.icon} alt="" />
                  {wallet.name}
                  <ArrowUpRight className="ml-auto" aria-hidden="true" />
                </Button>
              )) : (
                <div className="empty-state"><Wallet size={28} aria-hidden="true" />No compatible browser wallet detected.<p>Install a wallet-standard compatible Solana wallet, then reopen this dialog.</p></div>
              )}
            </div>
          )}
          {c.walletError && <div role="alert" className="error-message">{c.walletError}</div>}
          <div className="notice">Connecting a wallet does not authorize a launch, Quantum Wallet spend, or liquidity action.</div>
        </DialogContent>
      </Dialog>

      <Dialog open={palette} onOpenChange={setPalette}>
        <DialogContent>
          <DialogTitle>Command center</DialogTitle>
          <DialogDescription>QUANTEK workspace and product surfaces</DialogDescription>
          <input autoFocus aria-label="Search pages" placeholder="Search pages…" value={search} onChange={(event) => setSearch(event.target.value)} />
          {!navigation.some((item) => item[0].toLowerCase().includes(search.toLowerCase())) && <div className="empty-state" role="status">No matching QUANTEK pages.</div>}
          <div className="command-list">
            {navigation
              .filter((item) => item[0].toLowerCase().includes(search.toLowerCase()))
              .map(([name, to]) => <Link key={to} to={to} onClick={() => setPalette(false)}>{name}<ArrowUpRight aria-hidden="true" /></Link>)}
            <a href="https://github.com/quantekdbc/quantek" target="_blank" rel="noreferrer">GitHub <Github aria-hidden="true" /></a>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={mobile} onOpenChange={setMobile}>
        <DialogContent className="mobile-sheet translate-x-0 translate-y-0">
          <DialogTitle><Wordmark /></DialogTitle>
          <DialogDescription>QUANTEK product and operations navigation</DialogDescription>
          <nav className="mobile-nav" aria-label="Mobile QUANTEK navigation">
            <div className="rail-label">PRODUCT</div>
            {productNavigation.map(([label, to], index) => {
              const Icon = productIcons[index] ?? Rocket;
              return <Link key={to} to={to} onClick={() => setMobile(false)}><Icon />{label}</Link>;
            })}
            <a href="https://github.com/quantekdbc/quantek" target="_blank" rel="noreferrer"><Github />GitHub</a>
            <div className="rail-label mt-4">OPERATIONS</div>
            {operationalNavigation.map(([label, to], index) => {
              const Icon = operationalIcons[index] ?? LayoutDashboard;
              return <Link key={to} to={to} onClick={() => setMobile(false)}><Icon />{label}</Link>;
            })}
          </nav>
        </DialogContent>
      </Dialog>
    </div>
  );
}

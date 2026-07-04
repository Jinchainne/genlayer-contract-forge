'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Camera, Github, Globe, Layers3, MessageCircle, Send } from 'lucide-react';

const items = [
  {
    href: '/',
    label: 'Contract Forge',
    icon: Layers3,
    description: 'Review and deploy',
  },
  {
    href: '/occupancy',
    label: 'Occupancy AI Desk',
    icon: Camera,
    description: 'Live webcam counts',
  },
];

const community = [
  { label: 'Discord', href: 'https://discord.com/invite/8Jm4v89VAu', icon: MessageCircle },
  { label: 'Telegram', href: 'https://t.me/genlayer', icon: Send },
  { label: 'X', href: 'https://x.com/genlayer', icon: Globe },
  { label: 'GitHub', href: 'https://github.com/genlayerlabs', icon: Github },
  { label: 'Docs', href: 'https://docs.genlayer.com/', icon: BookOpen },
  { label: 'Website', href: 'https://genlayer.com/', icon: Globe },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto max-w-[1800px] px-4 pt-3 lg:px-6">
        <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(6,8,18,0.96),rgba(5,7,14,0.98))] shadow-[0_26px_72px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <div
            className="absolute inset-0 bg-[url('/genlayer-banner.png')] bg-cover bg-[center_35%] opacity-15 mix-blend-screen"
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.18),transparent_22%),radial-gradient(circle_at_85%_0%,rgba(217,70,239,0.18),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_34%)]"
            aria-hidden="true"
          />

          <div className="relative grid gap-3 px-4 py-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-5 lg:px-5">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-[18px] border border-white/10 bg-white/95 p-2 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
                <img src="/genlayer-mark.svg" alt="GenLayer logo" className="h-full w-full object-contain" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.36em] text-cyan-200/70">GenLayer Studio</p>
                <p className="text-xl font-black leading-tight text-white">Contract Forge</p>
                <p className="text-xs text-white/60">Dark neon builder suite for review, occupancy, and deployment.</p>
              </div>
            </div>

            <div className="overflow-x-auto pb-1">
              <div className="inline-flex min-w-full flex-wrap gap-2 lg:justify-center">
                {items.map(item => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={`flex min-w-[220px] items-center gap-3 rounded-[18px] border px-4 py-3 transition ${
                        active
                          ? 'border-cyan-400/50 bg-cyan-400/10 text-white shadow-[0_0_0_1px_rgba(34,211,238,0.2)]'
                          : 'border-white/10 bg-white/5 text-white/85 hover:border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <span className={`grid h-11 w-11 place-items-center rounded-[14px] ${active ? 'bg-cyan-400 text-black' : 'bg-white/10 text-white'}`}>
                        <Icon size={18} />
                      </span>
                      <span className="text-left">
                        <span className="block text-sm font-black">{item.label}</span>
                        <span className="block text-xs text-white/55">{item.description}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:auto-cols-fr lg:grid-flow-col">
              {community.map(item => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    title={item.label}
                    className="group flex h-12 w-12 items-center justify-center rounded-[16px] border border-white/10 bg-white/5 text-white/80 transition hover:-translate-y-0.5 hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-white"
                  >
                    <Icon size={18} className="transition group-hover:scale-110" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

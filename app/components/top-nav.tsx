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
  { label: 'Discord', href: 'https://discord.gg/VpfmXEMN66', icon: MessageCircle },
  { label: 'Telegram', href: 'https://t.me/genlayer', icon: Send },
  { label: 'X', href: 'https://x.com/genlayer', icon: Globe },
  { label: 'GitHub', href: 'https://github.com/genlayerlabs', icon: Github },
  { label: 'Docs', href: 'https://docs.genlayer.com/', icon: BookOpen },
  { label: 'Website', href: 'https://genlayer.com/', icon: Globe },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,14,26,0.98),rgba(7,10,18,0.98))] p-3 text-white shadow-[0_26px_72px_rgba(0,0,0,0.45)] lg:sticky lg:top-4">
      <div className="flex gap-3 overflow-x-auto lg:flex-col lg:overflow-visible">
        <div className="min-w-[240px] rounded-[24px] border border-white/10 bg-white/5 px-4 py-4 text-white backdrop-blur">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/50">GenLayer Studio</p>
          <p className="mt-2 text-lg font-black leading-tight">Contract Forge</p>
          <p className="mt-1 text-sm text-white/65">Builder tools for deploy packs, occupancy, and release notes.</p>
        </div>

        <div className="grid gap-2">
          {items.map(item => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-w-[240px] items-center gap-3 rounded-[18px] border px-4 py-3 transition ${
                  active ? 'border-cyan-400/40 bg-cyan-400/10 text-white' : 'border-white/10 bg-white/5 text-white/85 hover:bg-white/10'
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

        <div className="min-w-[240px] rounded-[24px] border border-white/10 bg-white/5 p-4 backdrop-blur">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/50">Community</p>
          <div className="mt-3 grid gap-2">
            {community.map(item => {
              const Icon = item.icon;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-[16px] border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/85 transition hover:bg-black/30"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-[12px] bg-white/10">
                    <Icon size={16} />
                  </span>
                  <span className="font-semibold">{item.label}</span>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Camera, Layers3 } from 'lucide-react';

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

export default function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="rounded-[24px] border border-black/10 bg-white p-3 shadow-[0_16px_42px_rgba(0,0,0,0.06)] lg:sticky lg:top-4">
      <div className="flex gap-3 overflow-x-auto lg:flex-col lg:overflow-visible">
        <div className="min-w-[240px] rounded-[20px] border border-black/10 bg-black px-4 py-4 text-white">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/55">GenLayer Studio</p>
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
                  active ? 'border-red-600 bg-red-50 text-red-700' : 'border-black/10 bg-black/5 text-black hover:bg-black/10'
                }`}
              >
                <span className={`grid h-11 w-11 place-items-center rounded-[14px] ${active ? 'bg-red-600 text-white' : 'bg-white text-black'}`}>
                  <Icon size={18} />
                </span>
                <span className="text-left">
                  <span className="block text-sm font-black">{item.label}</span>
                  <span className="block text-xs text-black/55">{item.description}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

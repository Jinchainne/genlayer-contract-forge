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
    <nav className="mb-4 rounded-[20px] border border-black/10 bg-white px-3 py-3 shadow-[0_10px_28px_rgba(0,0,0,0.05)]">
      <div className="flex flex-wrap items-center gap-2">
        {items.map(item => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-w-[220px] items-center gap-3 rounded-[16px] border px-4 py-3 transition ${
                active ? 'border-red-600 bg-red-50 text-red-700' : 'border-black/10 bg-black/5 text-black hover:bg-black/10'
              }`}
            >
              <span className={`grid h-10 w-10 place-items-center rounded-full ${active ? 'bg-red-600 text-white' : 'bg-white text-black'}`}>
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
    </nav>
  );
}

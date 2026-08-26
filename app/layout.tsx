import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_ORIGIN || 'https://yihe-memory.leo527952.chatgpt.site'),
  title: '忆核 — AI 驱动的知识记忆训练',
  description: '用间隔重复和 AI 评估，把面试知识真正变成长期记忆。',
  openGraph: {
    title: '忆核 — 把面试知识，练成长期记忆',
    description: '间隔重复、语音回答、AI 判题，让计算机八股真正进入长期记忆。',
    type: 'website',
    locale: 'zh_CN',
    images: [{ url:'/og.png', width:1792, height:1024, alt:'忆核 — 把面试知识，练成长期记忆' }],
  },
  twitter: {
    card:'summary_large_image',
    title:'忆核 — 把面试知识，练成长期记忆',
    description:'间隔重复、语音回答、AI 判题，让计算机八股真正进入长期记忆。',
    images:['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}

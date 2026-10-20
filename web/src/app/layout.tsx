import React from 'react';
import './globals.css';
import { Providers } from './Providers.js';

export interface Metadata {
  title?: string;
  description?: string;
  [key: string]: any;
}

export const metadata: Metadata = {
  title: 'KitchenPulse — Commercial KDS & Supply Chain Operations',
  description: 'Multi-tenant autonomous commercial kitchen operations, inventory deduction, and Gemini AI forecasting.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('kitchenpulse_theme');var d=s==='dark'||(!s&&window.matchMedia('(prefers-color-scheme: dark)').matches)||(s==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark');document.documentElement.classList.remove('light');}else{document.documentElement.classList.add('light');document.documentElement.classList.remove('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-neu-base text-slate-800 dark:text-slate-100 min-h-screen antialiased selection:bg-sky-500/30 selection:text-sky-900 dark:selection:text-sky-200 transition-colors duration-200">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

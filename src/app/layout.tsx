import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Poppins } from 'next/font/google';

const poppins = Poppins({ 
  subsets: ['latin'], 
  variable: '--font-poppins',
  weight: ['400', '500', '600', '700'] 
});

export const metadata: Metadata = {
  title: 'MinatiVault',
  description: 'Admin panel for your Telegram bot',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} dark`}>
      <body className="antialiased font-sans bg-background">
        <div className="flex min-h-screen w-full flex-col">
           {children}
        </div>
        <Toaster />
      </body>
    </html>
  );
}

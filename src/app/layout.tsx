import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/toaster"
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import MainNav from "@/components/main-nav";



const inter = Inter({ subsets: ["latin"] });

const title = "Chat App by Me";
const description = "Powered by Anthropic";
const openGraphImage = "/opengraph-image.png";

export const metadata: Metadata = {
  // metadataBase: new URL(getURL()),
  title: title,
  description: description,
  openGraph: {
    title: title,
    description: description,
    images: [
      {
        url: openGraphImage,
        width: 1814,
        height: 988,
        alt: "Chat App by Me",
      },
    ],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()

  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SidebarProvider>
            <AppSidebar userData={data?.user || undefined} />
            <SidebarInset>
              <header className="flex shrink-0 items-center gap-2 transition-[width,height] ease-linear">
                <div className="flex items-center gap-2 px-4 flex-grow ">
                  <SidebarTrigger className="-ml-1" />
                </div>
                <MainNav />
              </header>
              <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                {children}
              </div>
              <Toaster />
            </SidebarInset>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

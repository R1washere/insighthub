import type { Metadata } from "next";
import "./globals.css";
import { WorkspaceProvider } from "../components/app/workspace-provider";

export const metadata: Metadata = {
  title: "InsightHub",
  description: "Product analytics for SaaS teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <WorkspaceProvider>{children}</WorkspaceProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in — eSariSari Support Desk",
  description: "Sign in to the eSariSari Support Desk",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

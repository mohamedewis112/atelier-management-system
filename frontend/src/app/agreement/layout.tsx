import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "التوقيع الإلكتروني على العقد",
  description: "التوقيع الرقمي على الاتفاقية",
};

export default function AgreementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

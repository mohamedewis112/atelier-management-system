import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "التوقيع الرقمي على الاتفاقية",
  description: "التوقيع الرقمي على الاتفاقية",
};

export default function AgreementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

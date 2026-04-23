import type { Metadata } from "next";
import { ContactPageContent } from "@/components/contact-page-content";

export const metadata: Metadata = {
  title: "Contact | Justron Beats",
  description: "Send a direct message to Justron for custom work, collabs, and beat inquiries."
};

export default function ContactPage() {
  return <ContactPageContent />;
}

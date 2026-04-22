import Link from "next/link";
import { notFound } from "next/navigation";
import { BeatDetailContent } from "@/components/beat-detail-content";
import { fetchBeatBySlug } from "@/lib/beats";

type BeatPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export default async function BeatPage({ params }: BeatPageProps) {
  const { slug } = await params;
  const beat = await fetchBeatBySlug(slug);

  if (!beat) {
    notFound();
  }

  return (
    <main className="space-y-6">
      <Link
        href="/"
        className="inline-block rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900"
      >
        Back to Home
      </Link>
      <BeatDetailContent beat={beat} />
    </main>
  );
}

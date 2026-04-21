export default function ContactPage() {
  return (
    <main className="max-w-2xl space-y-8">
      <h1 className="text-3xl font-semibold text-zinc-100">Contact</h1>
      <form className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="name" className="text-sm text-zinc-400">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none ring-zinc-500 transition focus:ring-2"
            placeholder="Your name"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm text-zinc-400">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none ring-zinc-500 transition focus:ring-2"
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="message" className="text-sm text-zinc-400">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            rows={5}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none ring-zinc-500 transition focus:ring-2"
            placeholder="Tell me about your project..."
          />
        </div>

        <button
          type="submit"
          className="rounded-full border border-zinc-600 px-5 py-2.5 text-sm font-medium text-zinc-100 transition hover:border-zinc-400 hover:bg-zinc-900"
        >
          Send message
        </button>
      </form>
    </main>
  );
}

import TodosMemoBoard from "./todos-memo-board";

export default function TodosPage() {
  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-body">
          <p className="section-eyebrow">Platform</p>
          <h1 className="hero-title">To Dos</h1>
          <p className="hero-sub">
            Memo board for tracking items that need to be built, investigated, or
            resolved across the platform.
          </p>
        </div>
      </section>

      <TodosMemoBoard />
    </main>
  );
}

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container">
      <section style={{ padding: "3rem 0", maxWidth: "60ch" }}>
        <p className="eyebrow">Not found</p>
        <h1 style={{ fontSize: "2rem" }}>That page isn&apos;t here</h1>
        <p className="muted">
          The link may be old, or the household id may not exist. Everything in Blinkitchen starts
          from one of these:
        </p>
        <p>
          <Link className="btn btn-primary" href="/">
            Start at the beginning
          </Link>{" "}
          <Link className="btn btn-secondary" href="/explore">
            Explore households
          </Link>
        </p>
      </section>
    </div>
  );
}
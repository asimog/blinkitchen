import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container">
      <section className="status-page">
        <div className="empty-panel">
          <Compass size={22} aria-hidden className="empty-icon" />
          <h1 className="status-title">That page isn&apos;t here</h1>
          <p className="muted">
            The link may be old, or the household id may not exist. Everything in Blinkitchen starts
            from one of these:
          </p>
          <div className="row wrap">
            <Link className="btn btn-primary" href="/">
              Start at the beginning
            </Link>
            <Link className="btn btn-secondary" href="/explore">
              Explore households
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
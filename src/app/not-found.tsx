import Link from "next/link";
import styles from "@/components/app/app.module.css";

export default function NotFound() {
  return (
    <div className={`${styles.screen} ${styles.paper}`}>
      <div className={styles.onboardHead}>
        <h1 className={styles.display}>Nothing cooking here.</h1>
      </div>
      <div className={styles.footer}>
        <Link className={styles.primary} href="/">
          Back to today
        </Link>
      </div>
    </div>
  );
}

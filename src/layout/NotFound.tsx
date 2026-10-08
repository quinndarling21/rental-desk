import { Link } from 'react-router';

export function NotFound() {
  return (
    <section className="empty-state">
      <h1>Page not found</h1>
      <p>
        <Link to="/agreements">Back to agreements</Link>
      </p>
    </section>
  );
}

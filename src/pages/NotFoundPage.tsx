import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="section grid min-h-[60vh] place-items-center py-10 text-center">
      <div><p className="text-7xl font-extrabold text-ogaviolet">404</p><h1 className="mt-4 text-3xl font-bold">Page not found</h1><Link className="button-primary mt-6" to="/">Go home</Link></div>
    </section>
  );
}

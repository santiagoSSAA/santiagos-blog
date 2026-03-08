import type { Metadata } from "next";
import { NewsletterForm } from "@/components/NewsletterForm";

export const metadata: Metadata = {
  title: "Sobre mí",
};

export default function AboutPage() {
  return (
    <main className="py-20">
      <div className="mx-auto max-w-3xl px-6">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Sobre mí
        </h1>

        <p className="mt-8 text-lg leading-relaxed text-neutral-300">
          Soy Santiago, un solo founder construyendo productos desde cero.
          Este blog es mi espacio para compartir el camino — los aciertos, los
          errores y todo lo que voy aprendiendo en el proceso.
        </p>

        <section className="mt-16">
          <h2 className="text-2xl font-bold tracking-tight">Mi historia</h2>
          <p className="mt-4 leading-relaxed text-neutral-400">
            Siempre me apasionó crear cosas. Desde que escribí mis primeras
            líneas de código supe que quería construir productos que resolvieran
            problemas reales. Después de años trabajando en distintos proyectos,
            decidí lanzarme como solo founder y apostar todo a mis propias ideas.
          </p>
          <p className="mt-4 leading-relaxed text-neutral-400">
            No ha sido un camino fácil, pero cada desafío me ha enseñado algo
            valioso. Aquí documento ese viaje con total transparencia.
          </p>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-bold tracking-tight">
            ¿Qué encontrarás aquí?
          </h2>
          <ul className="mt-4 space-y-3 text-neutral-400">
            <li className="flex gap-3">
              <span className="text-neutral-500">—</span>
              <span>
                Reflexiones sobre emprendimiento y la vida de un solo founder.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-neutral-500">—</span>
              <span>
                Aprendizajes técnicos, herramientas y procesos que me funcionan.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-neutral-500">—</span>
              <span>
                Videos y contenido donde comparto con más detalle lo que estoy
                construyendo.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-neutral-500">—</span>
              <span>
                Historias personales y lecciones aprendidas en el camino.
              </span>
            </li>
          </ul>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-bold tracking-tight">
            Conecta conmigo
          </h2>
          <p className="mt-4 leading-relaxed text-neutral-400">
            Me encanta conectar con personas que están en un camino similar o que
            simplemente sienten curiosidad por lo que hago. No dudes en
            escribirme — siempre respondo.
          </p>
        </section>

        <section className="mt-20 border-t border-neutral-800 pt-12 text-center">
          <h2 className="text-2xl font-bold tracking-tight">
            Acompáñame en el camino
          </h2>
          <p className="mt-3 text-neutral-400">
            Suscríbete al newsletter y recibe cada nuevo post en tu correo.
          </p>
          <div className="mt-8">
            <NewsletterForm />
          </div>
        </section>
      </div>
    </main>
  );
}

const SILK = 'bg-gradient-to-b from-transparent via-slate-300 to-slate-400/70';

/**
 * Toques decorativos de Halloween (arañas, murciélagos, calabazas...).
 * Capa fija, sin interacción, que se ve por encima del contenido pero
 * por debajo de la navegación y los modales.
 */
export function HalloweenAmbient() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[35] select-none overflow-hidden">
      {/* Araña colgando — izquierda */}
      <div className="animate-hv-swing absolute left-2 top-0 hidden flex-col items-center sm:flex">
        <div className={`h-20 w-px ${SILK}`} />
        <span className="text-xl leading-none drop-shadow-sm">🕷️</span>
      </div>

      {/* Telaraña colgando — derecha */}
      <div className="animate-hv-swing animate-hv-delay-2 absolute right-3 top-0 flex flex-col items-center">
        <div className={`h-14 w-px ${SILK}`} />
        <span className="text-lg leading-none drop-shadow-sm">🕸️</span>
      </div>

      {/* Murciélago */}
      <span className="animate-hv-float absolute right-8 top-24 hidden text-2xl opacity-80 md:block">🦇</span>

      {/* Calabaza */}
      <span className="animate-hv-float animate-hv-delay-2 absolute left-3 top-44 hidden text-2xl opacity-80 md:block">🎃</span>

      {/* Fantasmita */}
      <span className="animate-hv-float absolute right-5 bottom-32 hidden text-2xl opacity-70 lg:block">👻</span>

      {/* Dulce */}
      <span className="animate-hv-float animate-hv-delay-3 absolute left-6 bottom-44 hidden text-xl opacity-70 lg:block">🍬</span>
    </div>
  );
}

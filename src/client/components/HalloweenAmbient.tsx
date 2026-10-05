const SILK = 'bg-gradient-to-b from-transparent via-slate-400/70 to-slate-500/80';

/**
 * Toques decorativos de Halloween pensados para mobile.
 * - La araña cuelga de su hilo (tiene sentido).
 * - Los murciélagos vuelan (pueden flotar).
 * - La calabaza queda posada en una esquina.
 * Capa fija, sin interacción, por encima del contenido pero por debajo
 * del carrito, la navegación y los modales.
 */
export function HalloweenAmbient() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[15] select-none overflow-hidden">
      {/* Araña colgando de su hilo (centro-superior, sin tapar contenido) */}
      <div className="animate-hv-swing absolute left-[60%] top-0 flex flex-col items-center">
        <div className={`h-12 w-px ${SILK}`} />
        <span className="text-lg leading-none drop-shadow-sm">🕷️</span>
      </div>

      {/* Murciélago volando (arriba-derecha) */}
      <span className="animate-hv-float absolute right-5 top-20 text-2xl opacity-80 drop-shadow-sm">🦇</span>

      {/* Calabaza posada (abajo-derecha) */}
      <span className="absolute bottom-24 right-2 text-2xl opacity-75 drop-shadow-sm">🎃</span>

      {/* Murciélago volando (abajo-izquierda, pantallas no tan chicas) */}
      <span className="animate-hv-float animate-hv-delay-2 absolute bottom-44 left-3 hidden text-xl opacity-70 drop-shadow-sm sm:block">🦇</span>

      {/* Fantasmita flotando (solo pantallas grandes) */}
      <span className="animate-hv-float animate-hv-delay-3 absolute bottom-64 left-6 hidden text-xl opacity-60 drop-shadow-sm lg:block">👻</span>
    </div>
  );
}

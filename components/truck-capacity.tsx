type TruckCapacityProps = {
  occupancy: number;
  weight: number;
  capacity: number;
  status: string;
};

const number = (value: number) => new Intl.NumberFormat("es-CO").format(value);

export function TruckCapacity({ occupancy, weight, capacity, status }: TruckCapacityProps) {
  const fill = capacity > 0 ? Math.min(100, Math.max(0, occupancy)) / 100 : 0;
  const overloaded = occupancy > 100;
  const loadColor = overloaded || (weight > 0 && occupancy < 50) ? "#ef4444" : occupancy < 70 ? "#facc15" : "#22c55e";

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-[#cce4e4] bg-white p-3 sm:p-4" role="img" aria-label={`Camión con ${number(weight)} de ${number(capacity)} kilogramos cargados. Aforo ${occupancy.toFixed(1)} por ciento. Estado: ${status}.`}>
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-xs font-bold uppercase tracking-wider text-[#35616a]">Carga del vehículo</p>
        <p className="text-xs font-bold text-[#35616a]">{capacity ? `${number(weight)} / ${number(capacity)} kg` : "Elige un vehículo"}</p>
      </div>
      <svg className="mt-1 w-full" viewBox="0 0 520 190" aria-hidden="true">
        <defs>
          <pattern id="truck-cargo-grid" width="38" height="36" patternUnits="userSpaceOnUse">
            <path d="M 0 0 H 38 M 0 0 V 36" fill="none" stroke="#0b5961" strokeOpacity=".24" strokeWidth="1.5" />
          </pattern>
          <clipPath id="truck-trailer-clip"><rect x="30" y="29" width="306" height="100" rx="7" /></clipPath>
        </defs>
        <path className="truck-road" d="M 10 164 H 510" stroke="#b7d8da" strokeWidth="4" strokeLinecap="round" strokeDasharray="22 14" />
        <g className="truck-body">
          <rect x="24" y="23" width="318" height="112" rx="11" fill="#e4f1f0" stroke="#0b5961" strokeWidth="5" />
          <g clipPath="url(#truck-trailer-clip)">
            <rect x="30" y="29" width="306" height="100" fill="#f5faf9" />
            <rect x="30" y="29" width="306" height="100" fill={loadColor} opacity=".78" style={{ transform: `scaleX(${fill})`, transformOrigin: "30px 79px", transition: "transform 650ms ease, fill 300ms ease" }} />
            <rect x="30" y="29" width="306" height="100" fill="url(#truck-cargo-grid)" />
          </g>
          <path d="M 342 60 H 407 Q 417 60 423 70 L 458 105 Q 464 111 464 122 V 135 H 342 Z" fill="#0b5961" />
          <path d="M 369 72 H 403 Q 409 72 413 78 L 437 102 H 369 Z" fill="#c9edf1" />
          <path d="M 24 135 H 466" stroke="#0b5961" strokeWidth="7" strokeLinecap="round" />
          <rect x="456" y="116" width="11" height="10" rx="2" fill="#facc15" />
          {[100, 389].map(x => <g key={x}><circle cx={x} cy="143" r="23" fill="#19323b" /><circle className="truck-wheel" cx={x} cy="143" r="13" fill="#d3e8e7" stroke="#637f83" strokeWidth="3" strokeDasharray="8 4" /><circle cx={x} cy="143" r="4" fill="#19323b" /></g>)}
        </g>
        {overloaded && <g><path d="M 265 12 H 334" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" /><circle cx="349" cy="13" r="11" fill="#ef4444" /><text x="349" y="18" textAnchor="middle" fontSize="15" fontWeight="bold" fill="white">!</text></g>}
      </svg>
      <p className="px-1 text-center text-xs font-medium text-[#48656c]">{overloaded ? "Sobrecupo: reduce la carga para continuar." : capacity ? "El color y la carga cambian al ingresar unidades." : "Selecciona una placa para ver la capacidad."}</p>
    </div>
  );
}

import React from 'react';

export default function ItineraryScreen() {
  const events = [
    { time: '4:00 PM', title: 'Ceremonia Civil', desc: '¡El momento más esperado! Nos daremos el sí.' },
    { time: '5:30 PM', title: 'Recepción', desc: 'Llegada al lugar, cocteles de bienvenida y acomodo.' },
    { time: '6:30 PM', title: 'Banquete', desc: 'A disfrutar de una deliciosa cena todos juntos.' },
    { time: '8:00 PM', title: 'Primer Baile', desc: 'Nuestro primer baile como esposos.' },
    { time: '8:30 PM', title: 'Fiesta', desc: '¡A romper la pista! DJ, luces y diversión.' },
    { time: '12:00 AM', title: 'Tornaboda', desc: 'Antojitos de medianoche para recuperar energía.' },
  ];

  return (
    <div className="itinerary-container">
      <h2 className="gallery__heading" style={{ textAlign: 'center' }}>Itinerario de Bodas</h2>
      <p style={{ textAlign: 'center', opacity: 0.8 }}>Acompáñanos en cada momento de nuestro gran día.</p>
      
      <div className="itinerary-timeline">
        {events.map((ev, idx) => (
          <div key={idx} className="itinerary-item">
            <span className="itinerary-time">{ev.time}</span>
            <h3 className="itinerary-title">{ev.title}</h3>
            <p className="itinerary-desc">{ev.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

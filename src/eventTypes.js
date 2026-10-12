// ═══════════════════════════════════════════════════════════
//  TIPOS DE EVENTO
//  Cada tipo define qué pestañas se muestran y qué textos se usan.
//  Para agregar un tipo nuevo, basta con añadir una entrada aquí.
//  Pestañas disponibles: 'album' | 'itinerary' | 'singles' | 'wall'
//  La PRIMERA pestaña de la lista es la que se abre por defecto.
// ═══════════════════════════════════════════════════════════

export const DEFAULT_EVENT_TYPE = 'boda';

export const EVENT_TYPES = {
  boda: {
    label: 'Boda', emoji: '💍',
    tabs: ['album', 'itinerary', 'singles', 'wall'],
    hosts: 'los novios',
    wallNames: 'Nuestra Boda',
    wallBio: '¡Bienvenidos a nuestro muro! Déjanos tus felicitaciones y buenos deseos ❤️',
    welcomeTitle: '¡Bienvenidos a nuestra boda!',
    welcomeMessage: 'Estamos inmensamente felices de compartir este día tan especial con todos ustedes.\n\nGracias por acompañarnos y ser parte de nuestra historia. ¡Disfruten, celebren con nosotros y compartan sus mejores momentos en el álbum!',
  },
  xv: {
    label: 'XV años', emoji: '👑',
    tabs: ['album', 'itinerary', 'wall'],
    hosts: 'la quinceañera',
    wallNames: 'Mis XV Años',
    wallBio: '¡Gracias por celebrar conmigo! Déjame tus buenos deseos 💖',
    welcomeTitle: '¡Bienvenidos a mis XV años!',
    welcomeMessage: 'Gracias por acompañarme en una noche tan especial.\n\n¡Disfruta la fiesta, baila mucho y comparte tus fotos en el álbum!',
  },
  cumple: {
    label: 'Cumpleaños', emoji: '🎂',
    tabs: ['album', 'wall'],
    hosts: 'el festejado',
    wallNames: 'Mi Cumpleaños',
    wallBio: '¡Gracias por venir a celebrar! Déjame tus felicitaciones 🎉',
    welcomeTitle: '¡Bienvenidos a la fiesta!',
    welcomeMessage: 'Gracias por celebrar conmigo este día.\n\n¡Pásala increíble y comparte tus mejores fotos en el álbum!',
  },
  bautizo: {
    label: 'Bautizo', emoji: '🕊️',
    tabs: ['album', 'itinerary', 'wall'],
    hosts: 'la familia',
    wallNames: 'Nuestro Bautizo',
    wallBio: 'Gracias por acompañarnos en este día tan especial 🕊️',
    welcomeTitle: '¡Bienvenidos al bautizo!',
    welcomeMessage: 'Gracias por acompañarnos en este día tan importante para nuestra familia.\n\nComparte tus fotos y buenos deseos en el álbum.',
  },
  comunion: {
    label: 'Primera Comunión', emoji: '✝️',
    tabs: ['album', 'itinerary', 'wall'],
    hosts: 'la familia',
    wallNames: 'Mi Primera Comunión',
    wallBio: 'Gracias por acompañarme en este día tan especial 🙏',
    welcomeTitle: '¡Bienvenidos a mi Primera Comunión!',
    welcomeMessage: 'Gracias por acompañarme en un día tan importante.\n\nComparte tus fotos y tus buenos deseos en el álbum.',
  },
  confirmacion: {
    label: 'Confirmación', emoji: '🕯️',
    tabs: ['album', 'itinerary', 'wall'],
    hosts: 'la familia',
    wallNames: 'Mi Confirmación',
    wallBio: 'Gracias por acompañarme en este paso tan especial 🙏',
    welcomeTitle: '¡Bienvenidos a mi Confirmación!',
    welcomeMessage: 'Gracias por acompañarme en este día tan significativo.\n\nComparte tus fotos y tus buenos deseos en el álbum.',
  },
  despedida: {
    label: 'Despedida de soltero/a', emoji: '🥂',
    tabs: ['album', 'itinerary', 'wall'],
    hosts: 'los organizadores',
    wallNames: 'La Despedida',
    wallBio: '¡Última noche de soltería! Déjanos tus mensajes y fotos 🥳',
    welcomeTitle: '¡Bienvenidos a la despedida!',
    welcomeMessage: '¡Esta noche se celebra a lo grande!\n\nSube tus fotos, deja tus mensajes y que no falte la diversión.',
  },
  babyshower: {
    label: 'Baby shower', emoji: '🍼',
    tabs: ['album', 'itinerary', 'wall'],
    hosts: 'los papás',
    wallNames: 'Nuestro Baby Shower',
    wallBio: 'Déjanos tus buenos deseos para el bebé 💙💗',
    welcomeTitle: '¡Bienvenidos al baby shower!',
    welcomeMessage: 'Gracias por compartir con nosotros la espera de nuestro bebé.\n\nDeja tus buenos deseos y comparte tus fotos en el álbum.',
  },
  graduacion: {
    label: 'Graduación', emoji: '🎓',
    tabs: ['album', 'itinerary', 'wall'],
    hosts: 'el graduado',
    wallNames: 'Mi Graduación',
    wallBio: '¡Lo logramos! Gracias por ser parte de este momento 🎓',
    welcomeTitle: '¡Bienvenidos a mi graduación!',
    welcomeMessage: 'Gracias por acompañarme en la meta que tanto esperé.\n\nComparte tus fotos y tus felicitaciones en el álbum.',
  },
  aniversario: {
    label: 'Aniversario', emoji: '💞',
    tabs: ['album', 'wall'],
    hosts: 'los festejados',
    wallNames: 'Nuestro Aniversario',
    wallBio: 'Gracias por celebrar con nosotros 💞',
    welcomeTitle: '¡Bienvenidos a nuestro aniversario!',
    welcomeMessage: 'Gracias por acompañarnos a celebrar este capítulo de nuestra historia.\n\nComparte tus fotos y mensajes en el álbum.',
  },
  corporativo: {
    label: 'Evento corporativo', emoji: '💼',
    tabs: ['album', 'itinerary'],
    hosts: 'la organización',
    wallNames: 'Nuestro Evento',
    wallBio: '',
    welcomeTitle: '¡Bienvenidos al evento!',
    welcomeMessage: 'Gracias por acompañarnos.\n\nConsulta el programa y comparte tus fotos en el álbum.',
  },
  otro: {
    label: 'Otro evento', emoji: '🎉',
    tabs: ['album', 'itinerary', 'wall'],
    hosts: 'los anfitriones',
    wallNames: 'Nuestro Evento',
    wallBio: '¡Gracias por acompañarnos! Déjanos tus mensajes 🎉',
    welcomeTitle: '¡Bienvenidos!',
    welcomeMessage: 'Gracias por acompañarnos en este evento.\n\n¡Disfruten y compartan sus mejores momentos en el álbum!',
  },
};

// Devuelve la configuración del tipo; si no existe (o el evento es antiguo), usa "boda".
export function getEventType(key) {
  return EVENT_TYPES[key] || EVENT_TYPES[DEFAULT_EVENT_TYPE];
}

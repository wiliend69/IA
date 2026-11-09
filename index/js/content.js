/* Static content: avatar presets, departments, shop catalog, curriculum and seeded leaderboards.
 * UI strings are Spanish; English-wing challenge prompts are English by design. */
(function () {
  'use strict';

  window.CONTENT = {
    departments: [
      { id: 'ventas', label: 'Ventas', color: '#f59e0b', icon: 'bi-graph-up-arrow' },
      { id: 'desarrollo', label: 'Desarrollo', color: '#3b82f6', icon: 'bi-code-slash' },
      { id: 'rrhh', label: 'Recursos Humanos', color: '#ec4899', icon: 'bi-people-fill' },
      { id: 'marketing', label: 'Marketing', color: '#a855f7', icon: 'bi-megaphone-fill' },
      { id: 'finanzas', label: 'Finanzas', color: '#10b981', icon: 'bi-bank' },
    ],

    presets: [
      { id: 0, name: 'Ejecutivo', desc: 'Traje marino y corbata', skin: '#f1c27d', top: '#1e3a8a', bottom: '#1f2937', hair: '#3b2314', accent: '#dc2626', accessory: 'tie' },
      { id: 1, name: 'Creativo', desc: 'Jersey ámbar y gafas', skin: '#c68642', top: '#d97706', bottom: '#334155', hair: '#111827', accent: '#0f172a', accessory: 'glasses' },
      { id: 2, name: 'Tech', desc: 'Sudadera y auriculares', skin: '#8d5524', top: '#059669', bottom: '#0f172a', hair: '#a16207', accent: '#e5e7eb', accessory: 'headphones' },
    ],

    shop: [
      { id: 'grad', slot: 'hat', name: 'Birrete de Graduado', price: 25, icon: 'bi-mortarboard-fill', desc: 'Para quienes nunca dejan de aprender.' },
      { id: 'outfit_violet', slot: 'outfit', name: 'Chaqueta Violeta', price: 35, color: '#7c3aed', icon: 'bi-palette-fill', desc: 'Sustituye el color de tu prenda superior.' },
      { id: 'aura', slot: 'aura', name: 'Aura Dorada', price: 40, icon: 'bi-stars', desc: 'Un halo brillante a tus pies.' },
      { id: 'outfit_gold', slot: 'outfit', name: 'Chaqueta Dorada', price: 50, color: '#ca8a04', icon: 'bi-award-fill', desc: 'El uniforme del talento senior.' },
      { id: 'crown', slot: 'hat', name: 'Corona de Talento', price: 60, icon: 'bi-gem', desc: 'Reservada para la élite de la academia.' },
    ],

    tracks: {
      tech: {
        key: 'tech',
        title: 'Academia Técnica',
        subtitle: 'Evolución Full-Stack · el temario se desbloquea por dominio de requisitos',
        icon: 'bi-cpu',
        color: '#3b82f6',
        pointsField: 'techPoints',
        dailyKey: 'tech',
        levels: [
          {
            id: 'p1', title: 'Fase 1 · Front-End Básico', subtitle: 'Arquitectura de maquetación HTML5 y CSS3', skill: 'front',
            instruction: 'Instrucción: lee el enunciado y resuelve el reto.',
            challenges: [
              { type: 'choice', title: 'Semántica HTML5', prompt: '¿Qué etiqueta HTML5 representa el contenido principal y único de una página?', options: ['<div id="main">', '<main>', '<section>', '<span class="main">'], answer: 1, mono: true, explain: '<main> identifica el contenido principal del documento y debe aparecer una sola vez por página.' },
              { type: 'order', title: 'Cuadrícula Flexbox', prompt: 'Observa las reglas CSS y ordena las cajas tal y como se mostrarán en pantalla (de izquierda a derecha).', code: '.contenedor { display: flex; }\n.caja-a { order: 3; }\n.caja-b { order: 1; }\n.caja-c { order: 2; }', visual: 'flex', items: ['Caja A', 'Caja B', 'Caja C'], answer: ['Caja B', 'Caja C', 'Caja A'], explain: 'Flexbox coloca los elementos según su valor de order, de menor a mayor: B (1), C (2), A (3).' },
              { type: 'choice', title: 'Centrado perfecto', prompt: '¿Qué combinación centra un elemento horizontal y verticalmente dentro de un contenedor con display: flex?', options: ['text-align: center; vertical-align: middle;', 'justify-content: center; align-items: center;', 'margin: auto 0; float: center;', 'align-content: start; justify-items: end;'], answer: 1, mono: true, explain: 'justify-content alinea en el eje principal y align-items en el eje transversal.' },
            ],
          },
          {
            id: 'p2', title: 'Fase 2 · Responsive y Frameworks', subtitle: 'Sistema de rejilla de Bootstrap', skill: 'front',
            instruction: 'Instrucción: aplica el sistema de rejilla de Bootstrap.',
            challenges: [
              { type: 'choice', title: 'La rejilla base', prompt: '¿Cuántas columnas tiene el sistema de rejilla por defecto de Bootstrap?', options: ['6', '10', '12', '16'], answer: 2, explain: 'Bootstrap divide cada fila en 12 columnas, lo que permite mitades, tercios y cuartos exactos.' },
              { type: 'choice', title: 'Breakpoints', prompt: 'Una tarjeta debe ocupar todo el ancho en móvil y la mitad a partir de pantallas medianas. ¿Qué clases usas?', options: ['col-6', 'col-12 col-md-6', 'col-md-12 col-6', 'w-50'], answer: 1, mono: true, explain: 'Bootstrap es mobile-first: col-12 aplica siempre y col-md-6 lo sobrescribe desde el breakpoint md.' },
              { type: 'order', title: 'Puzzle de rejilla', prompt: 'Ordena los elementos del exterior al interior para construir una rejilla Bootstrap válida.', items: ['.col-md-4', '.container', '.row'], answer: ['.container', '.row', '.col-md-4'], connector: 'nest', mono: true, explain: 'El contenedor envuelve la fila (.row) y la fila contiene las columnas.' },
            ],
          },
          {
            id: 'p3', title: 'Fase 3 · Lógica de Programación', subtitle: 'Diagnóstico de scripts en Python', skill: 'back',
            instruction: 'Instrucción: diagnostica el error del script y elige la corrección.',
            challenges: [
              { type: 'choice', title: 'Error de sintaxis', prompt: 'Este script falla con SyntaxError. ¿Cuál es la línea 1 corregida?', code: 'def saludar(nombre)\n    print("Hola", nombre)\n\nsaludar("Equipo")', options: ['def saludar(nombre);', 'def saludar(nombre):', 'def saludar[nombre]:', 'function saludar(nombre):'], answer: 1, mono: true, explain: 'En Python, la definición de una función termina con dos puntos.' },
              { type: 'choice', title: 'Indentación', prompt: 'Python lanza IndentationError. ¿Cómo debe quedar la línea 3?', code: 'edad = 21\nif edad >= 18:\nprint("Acceso permitido")', options: ['print("Acceso permitido");', '    print("Acceso permitido")', '{ print("Acceso permitido") }', 'print: "Acceso permitido"'], answer: 1, mono: true, explain: 'Los bloques de Python se definen con sangría, normalmente cuatro espacios.' },
              { type: 'choice', title: 'Tipos de datos', prompt: 'El script lanza TypeError. ¿Qué corrección produce total = 8?', code: 'unidades = "5"\ntotal = unidades + 3\nprint(total)', options: ['total = unidades + "3"', 'total = int(unidades) + 3', 'total = str(unidades + 3)', 'total = unidades * 3'], answer: 1, mono: true, explain: 'int() convierte la cadena "5" en número antes de sumar.' },
            ],
          },
          {
            id: 'p4', title: 'Fase 4 · Transición Back-End', subtitle: 'Servidores, APIs REST y bases de datos SQL', skill: 'back',
            instruction: 'Instrucción: enruta los nodos y construye consultas.',
            challenges: [
              { type: 'order', title: 'Enrutado de nodos', prompt: 'Conecta los nodos en el orden correcto para resolver la petición GET /api/empleados.', items: ['Base de datos SQL', 'Cliente (navegador)', 'Respuesta JSON', 'Servidor API REST'], answer: ['Cliente (navegador)', 'Servidor API REST', 'Base de datos SQL', 'Respuesta JSON'], connector: 'arrow', explain: 'El cliente llama a la API, la API consulta la base de datos y devuelve los datos serializados en JSON.' },
              { type: 'choice', title: 'Verbos HTTP', prompt: '¿Qué método HTTP es el adecuado para crear un nuevo recurso en una API REST?', options: ['GET', 'POST', 'DELETE', 'HEAD'], answer: 1, mono: true, explain: 'POST crea recursos; GET lee, DELETE elimina y HEAD solo obtiene cabeceras.' },
              { type: 'order', title: 'Constructor de consultas SQL', prompt: 'Construye la consulta que obtiene el nombre de los empleados del departamento de Ventas.', items: ["WHERE departamento = 'Ventas'", 'FROM empleados', 'SELECT nombre'], answer: ['SELECT nombre', 'FROM empleados', "WHERE departamento = 'Ventas'"], connector: 'sql', mono: true, explain: 'Una consulta SQL básica sigue el orden SELECT → FROM → WHERE.' },
            ],
          },
        ],
      },

      english: {
        key: 'english',
        title: 'Cámara de Inglés',
        subtitle: 'Inglés corporativo inmersivo · instrucciones en español, retos en inglés',
        icon: 'bi-translate',
        color: '#a855f7',
        pointsField: 'commPoints',
        dailyKey: 'language',
        levels: [
          {
            id: 'a1', title: 'Nivel 1 · A1 Starter', subtitle: 'Vocabulario y saludos corporativos', skill: 'english',
            instruction: 'Instrucción: selecciona o construye la respuesta correcta en inglés.',
            challenges: [
              { type: 'choice', title: 'Greetings', prompt: 'Your colleague says: "Good morning! How are you today?"', options: ["I'm fine, thanks. And you?", 'Goodbye, see you later.', 'I am 25 years.', 'Yes, please.'], answer: 0, explain: '"I\'m fine, thanks. And you?" es la respuesta natural a un saludo cordial.' },
              { type: 'choice', title: 'Office vocabulary', prompt: 'Choose the English word for "reunión".', options: ['Desk', 'Meeting', 'Salary', 'Schedule'], answer: 1, explain: 'Meeting = reunión. Desk = escritorio, Salary = salario, Schedule = horario.' },
              { type: 'order', title: 'Build the sentence', prompt: 'Put the words in order to greet a new client.', items: ['meet', 'Nice', 'you', 'to'], answer: ['Nice', 'to', 'meet', 'you'], explain: '"Nice to meet you" es la fórmula estándar al conocer a alguien.' },
            ],
          },
          {
            id: 'a2', title: 'Nivel 2 · A2 Elementary', subtitle: 'Correos corporativos y diálogos simulados', skill: 'english',
            instruction: 'Instrucción: lee el correo o el diálogo y responde en inglés.',
            challenges: [
              { type: 'choice', title: 'Email comprehension', passage: 'Subject: Client meeting update\n\nHi Laura,\nThe client meeting has been moved from Tuesday to Thursday at 10 a.m. Please bring the Q3 sales report.\n\nThanks,\nMark', prompt: 'When is the new meeting?', options: ['Tuesday at 10 a.m.', 'Thursday at 10 a.m.', 'Thursday at 3 p.m.', 'Next Tuesday'], answer: 1, explain: '"Moved from Tuesday to Thursday at 10 a.m." indica el nuevo día y hora.' },
              { type: 'choice', title: 'Email comprehension', passage: 'Subject: Client meeting update\n\nHi Laura,\nThe client meeting has been moved from Tuesday to Thursday at 10 a.m. Please bring the Q3 sales report.\n\nThanks,\nMark', prompt: 'What does Mark ask Laura to bring?', options: ['The client contract', 'A new laptop', 'The Q3 sales report', 'Coffee for the team'], answer: 2, explain: '"Please bring the Q3 sales report" es la petición explícita.' },
              { type: 'choice', title: 'Simulated dialog', passage: 'Customer: "Hello, I can\'t log in to my account."\nAgent: "______"', prompt: 'Choose the most professional reply.', options: ['"That is not my problem."', '"I\'m sorry to hear that. Can you tell me your username, please?"', '"Try again tomorrow."', '"Log in is easy."'], answer: 1, explain: 'Empatizar y pedir información concreta es la respuesta profesional.' },
            ],
          },
          {
            id: 'b1', title: 'Nivel 3 · B1 Intermediate', subtitle: 'Documentación técnica, pitch y objeciones', skill: 'english', englishOnly: true,
            instruction: 'Instruction: read carefully and choose the best answer. This level is fully in English.',
            challenges: [
              { type: 'choice', title: 'Technical documentation', passage: 'API Reference — Orders v2\nThe /v2/orders endpoint is rate-limited to 100 requests per minute per API key. Requests above this limit return HTTP 429 (Too Many Requests). Clients should retry using exponential backoff and must not create new API keys to bypass the limit.', prompt: 'What should a client do after receiving an HTTP 429 response?', options: ['Create a new API key immediately', 'Retry later with increasing wait times', 'Send the same request 100 times', 'Switch to the /v1/orders endpoint'], answer: 1, explain: 'Exponential backoff means waiting progressively longer before each retry.' },
              { type: 'order', title: 'Product pitch structure', prompt: 'Arrange the sentences to build a persuasive product pitch.', items: ['This saves each rep around five hours per week.', 'Can we schedule a 20-minute demo next Tuesday?', 'Many sales teams lose hours every week updating spreadsheets.', 'Our platform syncs your CRM data automatically in real time.'], answer: ['Many sales teams lose hours every week updating spreadsheets.', 'Our platform syncs your CRM data automatically in real time.', 'This saves each rep around five hours per week.', 'Can we schedule a 20-minute demo next Tuesday?'], connector: 'stack', explain: 'A strong pitch flows: Problem → Solution → Benefit → Call to action.' },
              { type: 'choice', title: 'Handling objections', passage: 'Client: "Honestly, your solution looks too expensive for us."', prompt: 'Which response handles the objection best?', options: ['"Then maybe you should look for a cheaper company."', '"I understand. Could we look at the cost of the hours your team currently loses? Most clients recover the investment in three months."', '"The price is fixed. Take it or leave it."', '"Expensive? No, it is cheap."'], answer: 1, explain: 'Acknowledge the concern, then reframe price as return on investment.' },
            ],
          },
        ],
      },

      soft: {
        key: 'soft',
        title: 'Cámara de Habilidades Blandas',
        subtitle: 'Inteligencia emocional, gestión del estrés y liderazgo',
        icon: 'bi-heart-pulse',
        color: '#10b981',
        pointsField: 'commPoints',
        dailyKey: 'soft',
        levels: [
          {
            id: 's1', title: 'Nivel 1 · Autoconciencia y Estrés', subtitle: 'Decisiones ramificadas ante la presión diaria', skill: 'soft',
            instruction: 'Instrucción: elige la reacción más saludable y profesional. Cada opción tiene consecuencias.',
            challenges: [
              { type: 'choice', title: 'Carga de trabajo', passage: 'Son las 15:00. Tienes tres entregas para hoy y tu responsable te pide una cuarta tarea "urgente".', prompt: '¿Cómo respondes?', options: ['Aceptas sin decir nada y te quedas hasta medianoche.', 'Expones tus tres entregas y le pides ayuda para priorizar cuál puede esperar.', 'Le dices que es imposible y te niegas.', 'Haces las cuatro a medias para cumplir con todo el mundo.'], answer: 1, feedback: ['Evitas el conflicto hoy, pero acumulas agotamiento y aumenta el riesgo de errores.', 'Comunicas tu capacidad real y conviertes la presión en una decisión compartida.', 'Pones un límite, pero sin ofrecer alternativas la relación se tensa.', 'La calidad baja en todas las entregas y la presión vuelve mañana.'] },
              { type: 'choice', title: 'Antes de presentar', passage: 'Faltan cinco minutos para tu presentación ante dirección. Notas el corazón acelerado y las manos frías.', prompt: '¿Qué haces?', options: ['Revisas el móvil para distraerte.', 'Haces tres respiraciones lentas (inhalar 4 s, exhalar 6 s) y repasas tu primer mensaje clave.', 'Te repites que vas a hacerlo mal para estar preparado.', 'Pides a un compañero que presente por ti.'], answer: 1, feedback: ['La distracción no regula la activación: llegarás igual de tenso y menos centrado.', 'La respiración lenta activa el sistema parasimpático y el mensaje clave te da un ancla.', 'El diálogo interno negativo amplifica la ansiedad.', 'Evitar la situación refuerza el miedo a largo plazo.'] },
              { type: 'choice', title: 'Correo nocturno', passage: 'A las 23:00 recibes un correo muy crítico de un cliente sobre tu trabajo.', prompt: '¿Cómo gestionas la situación?', options: ['Respondes al instante defendiendo cada punto.', 'Lo reenvías al equipo con un comentario irónico.', 'Reconoces tu reacción emocional, cierras el correo y preparas una respuesta serena por la mañana.', 'Lo ignoras y esperas que el cliente lo olvide.'], answer: 2, feedback: ['Responder en caliente suele escalar el conflicto.', 'El sarcasmo daña la confianza interna y puede filtrarse al cliente.', 'Nombrar la emoción y posponer la respuesta te permite actuar con criterio.', 'Ignorar el problema lo agrava y deteriora la relación con el cliente.'] },
            ],
          },
          {
            id: 's2', title: 'Nivel 2 · Conflictos y Liderazgo', subtitle: 'Simulación de gestión entre PM y desarrollo', skill: 'soft',
            instruction: 'Instrucción: actúas como líder del proyecto. Media en la ruptura de comunicación.',
            challenges: [
              { type: 'choice', title: 'La reunión semanal', passage: 'Marta (Project Manager): "El equipo de desarrollo siempre se retrasa."\nIván (desarrollador): "Porque los requisitos cambian cada día."', prompt: '¿Qué haces como líder?', options: ['Das la razón a Marta porque tiene más antigüedad.', 'Detienes la acusación, reconoces ambas frustraciones y propones revisar juntos los cambios de alcance de las dos últimas semanas.', 'Cambias de tema para evitar la tensión.', 'Les pides que lo resuelvan entre ellos fuera de la reunión.'], answer: 1, feedback: ['Tomar partido por jerarquía rompe la confianza del equipo técnico.', 'Validas a ambas partes y llevas la conversación de las personas a los datos.', 'El conflicto no resuelto reaparecerá con más intensidad.', 'Delegar el conflicto sin estructura suele empeorarlo.'] },
              { type: 'choice', title: 'Conversación 1:1', passage: 'Iván te escribe en privado: "Siento que nadie escucha al equipo técnico."', prompt: '¿Cuál es tu siguiente paso?', options: ['Le dices que no se lo tome como algo personal.', 'Agendas una conversación 1:1, escuchas sin interrumpir y acordáis un canal para que el equipo técnico valide los requisitos.', 'Reenvías su mensaje a Marta.', 'Le recuerdas que debe cumplir sus plazos.'], answer: 1, feedback: ['Minimizar la emoción hace que la persona se sienta todavía menos escuchada.', 'La escucha activa más un acuerdo concreto transforma la queja en mejora.', 'Romper la confidencialidad destruye la confianza.', 'Responder con exigencias ignora la causa del problema.'] },
              { type: 'choice', title: 'Acuerdo de equipo', passage: 'Tras la mediación, debes definir cómo evitar nuevos choques entre producto y desarrollo.', prompt: '¿Qué acuerdo propones?', options: ['Una sanción para quien vuelva a quejarse.', 'Un acuerdo de trabajo: congelar requisitos 48 h antes de cada sprint y una revisión conjunta PM-desarrollo.', 'Que la PM deje de hablar directamente con desarrollo.', 'Dejar que el tiempo lo arregle.'], answer: 1, feedback: ['El castigo silencia los problemas, no los resuelve.', 'Un acuerdo explícito y compartido previene el conflicto de forma sistémica.', 'Cortar la comunicación agrava los malentendidos.', 'Sin acuerdos, el patrón se repetirá.'] },
            ],
          },
        ],
      },
    },

    day1: [
      { type: 'input', title: 'Reto 1 · CSS', prompt: 'Escribe la propiedad CSS que cambia el color del texto de un párrafo.', code: 'p {\n  ____: #2dd4bf;\n}', answers: ['color'], placeholder: 'Escribe la propiedad', explain: 'La propiedad color define el color del texto.' },
      { type: 'input', title: 'Reto 2 · HTML', prompt: 'Completa la etiqueta que crea un enlace hacia otra página.', code: '<____ href="https://empresa.com">Portal</____>', answers: ['a'], placeholder: 'Escribe la etiqueta', explain: '<a> con el atributo href crea un hipervínculo.' },
      { type: 'input', title: 'Reto 3 · Python', prompt: '¿Qué imprime este script?', code: 'equipo = ["Ana", "Luis", "Sara"]\nprint(len(equipo))', answers: ['3'], placeholder: 'Escribe el resultado', explain: 'len() devuelve el número de elementos de la lista: 3.' },
    ],

    seedLeaders: {
      tech: [['Lucía Martín', 320], ['Carlos Ruiz', 265], ['Ana Pérez', 210], ['Diego Sanz', 150], ['Elena Gil', 95]],
      comm: [['Sofía Navarro', 300], ['Javier López', 240], ['Marina Torres', 180], ['Pablo Vega', 120], ['Irene Castro', 60]],
    },
  };
})();

// RoadCoda driver app — Spanish (#56)
// The driver picks English or Español with the EN / ES button at the top (it starts in Spanish when the
// phone is set to Spanish). The app is written in English; this file swaps what's on the screen into
// Spanish as it's drawn: whole phrases first, then the patterns for lines with numbers, names and times in
// them. Anything it doesn't know stays in English, so a new screen never breaks — it just isn't translated
// yet. Store names, addresses and what the office types stay exactly as written.
(function () {
  var KEY = 'rc-drv-lang';
  var lang = 'en';
  try { lang = localStorage.getItem(KEY) || ((navigator.language || '').toLowerCase().indexOf('es') === 0 ? 'es' : 'en'); } catch (e) {}
  window.RC_LANG = lang;
  window.RC_SET_LANG = function (l) { try { localStorage.setItem(KEY, l); } catch (e) {} location.reload(); };
  if (lang !== 'es') return;
  document.documentElement.lang = 'es';

  var T = {
    'So you stay signed in and it opens like an app: tap the button below, or the browser menu (⋮) ›': 'Para seguir con la sesión iniciada y abrirla como una app: toque el botón de abajo, o el menú del navegador (⋮) ›',
    'So you stay signed in: tap the': 'Para seguir con la sesión iniciada: toque el botón',
    'button (square with an arrow) at the bottom of Safari, then': '(el cuadrado con una flecha) abajo en Safari, y luego',
    '. The icon signs in separately, so then tap': '. El ícono inicia sesión por separado, así que luego toque',
    'below and type that code into the app.': 'abajo y escriba ese código en la app.',
    'I added it: get app code': 'Ya lo agregué: obtener código de la app',
    "Your company's RoadCoda trial has ended, so the app is view-only. Call the office.": 'La prueba de RoadCoda de su empresa terminó, así que la app es solo de lectura. Llame a la oficina.',
    // stops and the day
    "Today's stops": 'Paradas de hoy', 'Messages': 'Mensajes', 'My pay': 'Mi pago', 'Refresh': 'Actualizar',
    'Report accident / injury': 'Reportar accidente / lesión', 'Pending': 'Pendiente', 'Arrived': 'Llegué', 'Delivered': 'Entregado',
    'Picked up': 'Recogido', 'Issue reported': 'Problema reportado', 'Refused': 'Rechazado', 'Closed / no access': 'Cerrado / sin acceso',
    'OS&D · Damaged': 'OS&D · Dañado', 'OS&D · Short': 'OS&D · Faltante', 'OS&D · Over': 'OS&D · Sobrante',
    'Delivery instructions': 'Instrucciones de entrega', 'tap to open': 'toque para abrir', 'Documents': 'Documentos',
    'Enter the starting odometer above first.': 'Primero anote arriba el odómetro de salida.',
    'Odometer at the start (before the first stop)': 'Odómetro al salir (antes de la primera parada)',
    'Odometer now, load finished': 'Odómetro ahora, carga terminada', 'Odometer at this stop': 'Odómetro en esta parada',
    'Save reading': 'Guardar lectura', 'Enter the odometer at this stop.': 'Anote el odómetro en esta parada.',
    'Enter the odometer reading.': 'Anote la lectura del odómetro.',
    'Scan labels': 'Escanear etiquetas', 'Add photo': 'Agregar foto', 'Report issue': 'Reportar problema', 'Submit issue': 'Enviar problema',
    'Choose…': 'Elija…', 'Damaged freight': 'Carga dañada', 'Short (fewer than ordered)': 'Faltante (menos de lo pedido)',
    'Over (more than ordered)': 'Sobrante (más de lo pedido)', 'Refused by receiver': 'Rechazado por quien recibe', 'Other': 'Otro',
    'Note': 'Nota', 'Note (optional)': 'Nota (opcional)', 'Why': 'Motivo', 'What is it': 'Qué es',
    'Set the delivered counts above, and add a photo of any damage, before you submit.': 'Ponga arriba las cantidades entregadas y agregue una foto de cualquier daño antes de enviar.',
    'Found freight for someone not on this load, or a stop needs to change?': '¿Encontró carga de alguien que no está en esta carga, o hay que cambiar una parada?',
    'Call dispatch': 'Llame a despacho', 'Call dispatch now.': 'Llame a despacho ahora.', 'Door code': 'Código de puerta', 'Gate code': 'Código de portón',
    'Other code': 'Otro código', 'No written instructions on file. Call dispatch if you need help.': 'No hay instrucciones escritas. Llame a despacho si necesita ayuda.',
    'None on file for this stop. Call dispatch if you need help.': 'No hay nada registrado para esta parada. Llame a despacho si necesita ayuda.',
    'No item counts on this stop.': 'Esta parada no tiene cantidades.', 'Scanned': 'Escaneado', 'all scanned': 'todo escaneado',
    'Added on this load': 'Agregado a esta carga', 'Navigate': 'Navegar', '➤ Navigate': '➤ Navegar', 'Map app for Navigate': 'Aplicación de mapas para Navegar',
    "The dock hasn't released this load yet.": 'El andén todavía no ha liberado esta carga.',
    "Every piece has to be scanned onto your truck first. You can't start the trip until then — call the dock if you're waiting.": 'Primero hay que escanear cada pieza en su camión. No puede empezar el viaje hasta entonces — llame al andén si está esperando.',
    'Your delivery counts already leave these out.': 'Sus cantidades de entrega ya no incluyen estas.',
    'Locked while moving': 'Bloqueado en movimiento', 'Eyes on the road. RoadCoda opens again when the truck stops.': 'Ojos en el camino. RoadCoda se abre de nuevo cuando el camión se detiene.',
    'Stop the truck first — you can send when stopped.': 'Primero detenga el camión — puede enviar cuando esté detenido.', 'Stop the truck first.': 'Primero detenga el camión.',
    // signature
    'Receiver signature': 'Firma de quien recibe', 'Receiver signs here': 'Quien recibe firma aquí', "Receiver's name": 'Nombre de quien recibe',
    'Have the receiver sign in the box.': 'Pida a quien recibe que firme en el recuadro.', 'Sign with your finger in the box.': 'Firme con el dedo en el recuadro.',
    'Sign here': 'Firme aquí', 'Sign': 'Firmar', 'Clear': 'Borrar', 'Signed — finish delivery': 'Firmado — terminar entrega',
    'Signed with exceptions — finish': 'Firmado con excepciones — terminar', 'Finish delivery without a signature': 'Terminar entrega sin firma',
    "Receiver not available / won't sign": 'Quien recibe no está / no quiere firmar', 'Receiver refused to sign': 'Quien recibe se negó a firmar',
    'No one available to sign': 'No hay nadie para firmar', 'Store closed — left per instructions': 'Tienda cerrada — se dejó según instrucciones',
    'Drop-and-hook / unattended delivery': 'Drop-and-hook / entrega sin personal', 'Skip — no signature needed': 'Omitir — no se necesita firma',
    "Say why there's no signature.": 'Diga por qué no hay firma.', "Type the receiver's name.": 'Escriba el nombre de quien recibe.',
    'The receiver notes it here before signing.': 'Quien recibe lo anota aquí antes de firmar.', 'Receiver noted: ': 'Quien recibe anotó: ',
    "Write what's short, damaged or over.": 'Escriba lo que falta, está dañado o sobra.', 'Anything short, damaged or over?': '¿Algo faltante, dañado o sobrante?',
    'Signing for': 'Firmando por', 'Done — give the phone back': 'Listo — devuelva el teléfono',
    // photos, scanning, documents
    'Take / choose photos': 'Tomar / elegir fotos', 'Photos': 'Fotos', 'Remove this photo?': '¿Quitar esta foto?', 'Remove this scan?': '¿Quitar este escaneo?',
    'Photo not saved: ': 'Foto no guardada: ', 'Point the camera at a label': 'Apunte la cámara a una etiqueta', 'Done scanning': 'Terminé de escanear',
    'Ready — pull the scanner trigger on each label.': 'Listo — jale el gatillo del escáner en cada etiqueta.',
    'Using a scanner (built-in or Bluetooth) — no camera': 'Uso un escáner (integrado o Bluetooth) — sin cámara',
    'Camera scanner did not load. Check your connection and try again.': 'El escáner de la cámara no cargó. Revise su conexión e intente de nuevo.',
    'Camera scanner did not load. Type label numbers instead.': 'El escáner de la cámara no cargó. Escriba los números de las etiquetas.',
    'BOL': 'BOL', 'BOL # (if there is one)': 'BOL # (si hay)', 'Fuel receipt': 'Recibo de combustible', 'Lumper receipt': 'Recibo de lumper',
    'Scale ticket': 'Boleta de báscula', 'Toll receipt': 'Recibo de peaje', 'Trip sheet': 'Hoja de viaje',
    'BOLs, fuel receipts, lumper and scale tickets, tolls — take a clear photo of each page.': 'BOLs, recibos de combustible, lumper y báscula, peajes — tome una foto clara de cada página.',
    "Stop (if it's for one)": 'Parada (si es para una)', '— the whole load —': '— toda la carga —', 'Share': 'Compartir',
    // messages
    'No messages yet. Messages from dispatch show here.': 'No hay mensajes todavía. Los mensajes de despacho aparecen aquí.',
    'Message from dispatch': 'Mensaje de despacho', 'Reply': 'Responder', 'Send': 'Enviar', 'On my way': 'Voy en camino', 'Running late': 'Voy tarde',
    'Waiting to unload': 'Esperando para descargar', 'At the dock': 'En el andén', 'Call me': 'Llámeme', 'Not sent': 'No enviado',
    'Dispatch changed my load': 'Despacho cambió mi carga', 'A new load for me': 'Una carga nueva para mí', "Messages I haven't read in the app": 'Mensajes que no he leído en la aplicación',
    'Text me about my loads': 'Envíenme textos sobre mis cargas', 'Switch on to get texts at ': 'Actívelo para recibir textos en ',
    'Ask the office to put your cell number on file first.': 'Primero pida a la oficina que registre su número de celular.',
    // pay
    'Gross': 'Bruto', 'Deductions': 'Deducciones', 'Before taxes': 'Antes de impuestos', 'Not final yet': 'Todavía no es final',
    'No pay to show yet.': 'Todavía no hay pago para mostrar.', 'Nothing yet this week.': 'Nada todavía esta semana.', 'Approved': 'Aprobado',
    'Your pay before taxes. Taxes and withholding come off in payroll. Questions about a line? Call the office.': 'Su pago antes de impuestos. Los impuestos y retenciones se descuentan en la nómina. ¿Preguntas sobre una línea? Llame a la oficina.',
    'Yard shift': 'Turno de patio', 'Clock in': 'Marcar entrada', 'Clock out': 'Marcar salida', 'Clock out now?': '¿Marcar salida ahora?', 'Not clocked in.': 'No ha marcado entrada.',
    // shift, truck, sign-in
    'Start my shift': 'Empezar mi turno', 'Tap your name to start your shift.': 'Toque su nombre para empezar su turno.', 'Switch driver': 'Cambiar de conductor',
    'End your shift on this truck and hand it to the next driver?': '¿Terminar su turno en este camión y pasárselo al siguiente conductor?',
    'Other drivers': 'Otros conductores', 'Not me': 'No soy yo', 'on this truck today': 'en este camión hoy', 'Loading drivers…': 'Cargando conductores…',
    'Loading…': 'Cargando…', 'Sign in': 'Iniciar sesión', 'Sign in to RoadCoda': 'Iniciar sesión en RoadCoda', 'Sign in this phone': 'Iniciar sesión en este teléfono',
    'Sign in with email and password instead': 'Mejor iniciar sesión con correo y contraseña', 'Email': 'Correo electrónico', 'Email (optional)': 'Correo electrónico (opcional)',
    'Password': 'Contraseña', 'Phone': 'Teléfono', 'PIN': 'PIN', 'Save PIN': 'Guardar PIN', 'Save password': 'Guardar contraseña',
    'Choose a new password': 'Elija una contraseña nueva', 'Choose your password': 'Elija su contraseña', 'Choose your reset PIN': 'Elija su PIN de restablecimiento',
    'New password (at least 8 characters)': 'Contraseña nueva (al menos 8 caracteres)', 'Use at least 8 characters.': 'Use al menos 8 caracteres.',
    "The two passwords don't match.": 'Las dos contraseñas no coinciden.', "The two PINs don't match.": 'Los dos PIN no coinciden.', 'Use 4 to 6 numbers.': 'Use de 4 a 6 números.',
    'Type it again': 'Escríbalo otra vez', 'Your reset PIN': 'Su PIN de restablecimiento', 'Reset card': 'Tarjeta de restablecimiento', 'reset card': 'tarjeta de restablecimiento',
    "If this phone ever gets signed out, you'll scan your reset card and enter this PIN. 4 to 6 numbers, only you should know it.": 'Si alguna vez se cierra la sesión en este teléfono, escaneará su tarjeta de restablecimiento y pondrá este PIN. De 4 a 6 números, solo usted debe saberlo.',
    "Your reset PIN (or last 4 of your CDL if you haven't set one)": 'Su PIN de restablecimiento (o los últimos 4 de su CDL si no ha puesto uno)',
    'Last 4 characters of your CDL number': 'Últimos 4 caracteres de su número de CDL', 'Enter all 4 characters.': 'Escriba los 4 caracteres.',
    'Scan your sign-in code or reset card': 'Escanee su código de inicio de sesión o su tarjeta de restablecimiento', 'Scan sign-in code': 'Escanear código de inicio',
    'Point the camera at the QR code': 'Apunte la cámara al código QR', "That isn't a RoadCoda sign-in code.": 'Ese no es un código de inicio de RoadCoda.',
    'This code has expired or was already used. Ask dispatch for a new one.': 'Este código venció o ya se usó. Pida uno nuevo a despacho.',
    'This link has expired or was already used. Ask dispatch to send you a new one.': 'Este enlace venció o ya se usó. Pida a despacho que le envíe uno nuevo.',
    'That login link has expired or was already used. Ask dispatch to send a new one.': 'Ese enlace de inicio venció o ya se usó. Pida a despacho que le envíe uno nuevo.',
    'This card is locked after too many wrong tries. Call dispatch to unlock it.': 'Esta tarjeta está bloqueada por demasiados intentos. Llame a despacho para desbloquearla.',
    'Your driver app access is turned off. Call dispatch.': 'Su acceso a la aplicación está desactivado. Llame a despacho.',
    "Tap the button to sign this phone in. You won't need a password.": 'Toque el botón para iniciar sesión en este teléfono. No necesitará contraseña.',
    'Use this phone for RoadCoda': 'Usar este teléfono para RoadCoda', 'Pair with the truck': 'Emparejar con el camión', 'Pairing code': 'Código de emparejamiento',
    'Set up this device for a truck (office gives you a pairing code)': 'Configurar este dispositivo para un camión (la oficina le da un código de emparejamiento)',
    'This device was unpaired from the truck by the office.': 'La oficina desemparejó este dispositivo del camión.', 'Get a new code': 'Obtener un código nuevo',
    'Enter app code': 'Escribir código de la aplicación', 'app code': 'código de la aplicación', 'Office sign-in': 'Inicio de sesión de oficina',
    'Add RoadCoda to your home screen': 'Agregue RoadCoda a su pantalla de inicio', 'Install app': 'Instalar aplicación', 'Later': 'Después', 'Not now': 'Ahora no',
    'Add to Home Screen': 'Agregar a pantalla de inicio', 'Add to Home screen': 'Agregar a pantalla de inicio', 'Add to home screen': 'Agregar a pantalla de inicio',
    'You see only your own loads. The app locks while the truck is moving.': 'Usted solo ve sus propias cargas. La aplicación se bloquea mientras el camión está en movimiento.',
    'Light screen. Tap for dark.': 'Pantalla clara. Toque para oscura.', 'Dark screen. Tap to follow the phone.': 'Pantalla oscura. Toque para seguir el teléfono.',
    'Yes': 'Sí', 'No': 'No', 'Not sure': 'No estoy seguro', 'Open': 'Abrir', 'Cancel': 'Cancelar', 'Back': 'Atrás', 'Back to stops': 'Volver a las paradas',
    'Try again': 'Intente de nuevo', 'Got it': 'Entendido', 'Start': 'Empezar', 'Add': 'Agregar', 'Where': 'Dónde', 'Truck': 'Camión',
    'Short': 'Faltante', 'Damaged': 'Dañado', 'Over': 'Sobrante', 'labels': 'etiquetas', 'label': 'etiqueta',
    // check-in, handbook, report a problem
    'Quick check-in': 'Consulta rápida', 'Answer what you can': 'Conteste lo que pueda', 'Anything else': 'Algo más',
    'One minute, a few taps. It goes to management, not dispatch.': 'Un minuto, unos toques. Va a la gerencia, no a despacho.',
    '1 = not at all, 5 = completely. Your answers go to management, not dispatch.': '1 = nada, 5 = totalmente. Sus respuestas van a la gerencia, no a despacho.',
    'Thank you. Management reads every one of these.': 'Gracias. La gerencia lee cada una.', 'Check-in': 'Consulta',
    'Handbook': 'Manual', 'Handbook to read and sign': 'Manual para leer y firmar', "Read it when you're stopped, then sign with your finger.": 'Léalo cuando esté detenido y luego firme con el dedo.',
    'By signing you confirm you received this handbook and will read and follow it.': 'Al firmar confirma que recibió este manual y que lo leerá y seguirá.',
    'Type your full name': 'Escriba su nombre completo', 'Type your full name.': 'Escriba su nombre completo.', 'Your name': 'Su nombre', 'Please write your name.': 'Por favor escriba su nombre.',
    'Report a problem to RoadCoda': 'Reportar un problema a RoadCoda', 'What went wrong? (RoadCoda also gets the page you are on and any errors)': '¿Qué salió mal? (RoadCoda también recibe la página donde está y cualquier error)',
    'Anything we should fix? (optional)': '¿Algo que debamos arreglar? (opcional)', 'Not saved: ': 'No guardado: ',
    // accident / injury
    'Safety first': 'La seguridad primero', 'Call 911': 'Llame al 911', 'What happened?': '¿Qué pasó?', 'Choose what happened.': 'Elija qué pasó.',
    'Collision': 'Choque', 'Hit property (dock, pole, gate)': 'Golpe a propiedad (andén, poste, portón)', 'Cargo damage': 'Daño a la carga',
    'Our truck damage': 'Daño a nuestro camión', 'Someone hurt (not a crash)': 'Alguien lastimado (no un choque)', 'Something else': 'Otra cosa', 'Accident / injury': 'Accidente / lesión',
    "If anyone is hurt, call 911 first. Hazards on, triangles out. Stay at the scene. Be polite — don't argue, don't say it was your fault, and don't discuss it with anyone but police and your company. Take photos before anything is moved.": 'Si alguien está herido, llame primero al 911. Intermitentes prendidas, triángulos afuera. Quédese en el lugar. Sea amable — no discuta, no diga que fue su culpa y no hable del tema con nadie más que la policía y su compañía. Tome fotos antes de que se mueva algo.',
    "Picking one starts your report — it's saved with the time and your location right away.": 'Al elegir una empieza su reporte — se guarda de inmediato con la hora y su ubicación.',
    'Is anyone hurt?': '¿Hay alguien herido?', 'Are YOU hurt?': '¿Está USTED herido?', 'Was anyone killed?': '¿Murió alguien?',
    'Was anyone taken for medical treatment (ambulance, hospital, urgent care)?': '¿Llevaron a alguien a recibir atención médica (ambulancia, hospital, urgencias)?',
    'Does any vehicle have to be towed away (can\'t be driven)?': '¿Hay que remolcar algún vehículo (no se puede manejar)?',
    'Did police come or were they called?': '¿Vino la policía o la llamaron?', 'Did police give YOU a ticket?': '¿La policía LE dio una multa a usted?',
    'Did any hazardous material spill?': '¿Se derramó algún material peligroso?', 'Was the truck driver at fault?': '¿Fue culpa del conductor del camión?',
    'This is a DOT-recordable accident.': 'Este es un accidente registrable por el DOT.',
    'A DOT post-accident drug and alcohol test is likely required. The alcohol test should be within 2 hours, the drug test within 32 hours. Don\'t drink anything alcoholic.': 'Probablemente se requiere una prueba de drogas y alcohol del DOT después del accidente. La prueba de alcohol debe ser dentro de 2 horas y la de drogas dentro de 32 horas. No tome nada con alcohol.',
    'Make sure dispatch knows, get the police report number, and take photos of everything.': 'Asegúrese de que despacho sepa, consiga el número del reporte de policía y tome fotos de todo.',
    'What happened, in your words': 'Qué pasó, en sus palabras', 'Add a short note describing what happened.': 'Agregue una nota breve de lo que pasó.',
    'Injuries — who, how, where they were taken': 'Lesiones — quién, cómo, a dónde los llevaron', 'The scene': 'El lugar', 'No GPS fix — type the location above.': 'Sin señal GPS — escriba la ubicación arriba.',
    'Police / report card': 'Policía / tarjeta del reporte', 'Police department': 'Departamento de policía', 'Police report #': 'Número de reporte de policía',
    'Other vehicles and drivers': 'Otros vehículos y conductores', 'Other vehicle': 'Otro vehículo', 'Add another vehicle': 'Agregar otro vehículo',
    'Vehicle (year, make, model)': 'Vehículo (año, marca, modelo)', 'Plate & state': 'Placa y estado', 'Driver name': 'Nombre del conductor',
    'Insurance company': 'Compañía de seguros', 'Policy #': 'Número de póliza', 'Their insurance card': 'Su tarjeta de seguro', 'Their license': 'Su licencia', 'Their plate': 'Su placa',
    'None added. Tip: a photo of their insurance card and license does most of this.': 'Nada agregado. Consejo: una foto de su tarjeta de seguro y licencia cubre casi todo.',
    'Witnesses': 'Testigos', 'Witness card': 'Tarjeta de testigo',
    'Hand your phone to anyone who saw it. They write what happened and sign with a finger.': 'Pase su teléfono a quien lo vio. Escribe lo que pasó y firma con el dedo.',
    "Witness card saved. Thank them — and take their phone number if they didn't write one.": 'Tarjeta de testigo guardada. Agradézcale — y tome su número de teléfono si no lo escribió.',
    'Thank you for helping. Please tell us what you saw. Your details go only to the trucking company and its insurer.': 'Gracias por ayudar. Por favor díganos lo que vio. Sus datos van solo a la compañía de transporte y a su aseguradora.',
    'Or type the label number': 'O escriba el número de la etiqueta', "Receiver's notes, e.g. 1 pallet crushed, short 2 totes": 'Notas de quien recibe, p. ej. 1 tarima aplastada, faltan 2 contenedores',
    'Road, cross street, town': 'Camino, calle que cruza, pueblo', 'Short note (required for Other)': 'Nota breve (obligatoria para Otro)', 'Type a message': 'Escriba un mensaje',
    'Where you were going, what the other vehicle did, what you did': 'A dónde iba, qué hizo el otro vehículo, qué hizo usted',
    'e.g. 1 pallet crushed, receiver signed noting damage': 'p. ej. 1 tarima aplastada, quien recibe firmó anotando el daño', 'e.g. 120450': 'p. ej. 120450',
    'e.g. 2 pages, fuel at Pilot exit 8': 'p. ej. 2 páginas, combustible en Pilot salida 8', 'required': 'obligatorio',
    '— the office checks every trip before payday.': '— la oficina revisa cada viaje antes del día de pago.', '— this is what you were paid.': '— esto es lo que se le pagó.', '— the office has been told.': '— ya se le avisó a la oficina.',
    'What did you see?': '¿Qué vio?', 'Save report': 'Guardar reporte', 'Your recent reports': 'Sus reportes recientes', 'Nothing added yet.': 'Nada agregado todavía.',
    // 139: pre-trip / post-trip inspection (DVIR)
    'Pre-trip inspection': 'Inspección antes del viaje', 'Post-trip inspection': 'Inspección después del viaje',
    'Start pre-trip': 'Empezar inspección', 'Start post-trip': 'Empezar inspección', 'Send inspection': 'Enviar inspección',
    'OK': 'OK', 'Defect': 'Defecto', 'N/A': 'N/A', 'All OK': 'Todo OK', 'Unsafe to drive': 'No es seguro manejar',
    'Take photo (needed)': 'Tomar foto (obligatoria)', 'optional': 'opcional', 'photo': 'foto', 'Uploading…': 'Subiendo…',
    'Odometer (optional)': 'Odómetro (opcional)', 'Remarks (optional)': 'Comentarios (opcional)', 'Anything else the shop should know': 'Algo más que el taller deba saber',
    'Your name': 'Su nombre', "What's wrong? e.g. left marker light out": '¿Qué está mal? p. ej. luz de posición izquierda fundida',
    'Since the last report': 'Desde el último reporte', "I've reviewed these repairs": 'Revisé estas reparaciones', 'Still open from earlier': 'Todavía pendiente de antes',
    'Open defects on your equipment': 'Defectos pendientes en su equipo', 'The shop knows. Check them on your inspection.': 'El taller ya sabe. Revíselos en su inspección.',
    'Repaired': 'Reparado', 'No repair needed': 'No necesita reparación', 'Do the pre-trip inspection above first.': 'Primero haga arriba la inspección antes del viaje.',
    'the end-of-day report on your equipment': 'el reporte de fin del día de su equipo', 'Nothing on the checklist for this unit.': 'No hay nada en la lista para esta unidad.',
    'By signing I confirm I checked this equipment and reported anything that isn\'t in safe working order.': 'Al firmar confirmo que revisé este equipo y reporté todo lo que no está en buenas condiciones.',
    'By signing I confirm I checked this equipment and reported anything that isn\'t in safe working order, and that I reviewed the repairs above.': 'Al firmar confirmo que revisé este equipo, reporté todo lo que no está en buenas condiciones y revisé las reparaciones de arriba.',
    'By signing I certify this report on the equipment I drove today is true and complete.': 'Al firmar certifico que este reporte del equipo que manejé hoy es verdadero y completo.',
    'Tick that you reviewed the repairs.': 'Marque que revisó las reparaciones.', 'Type your name.': 'Escriba su nombre.',
    'Leave the inspection? What you checked is not sent.': '¿Salir de la inspección? Lo que revisó no se envía.',
    'You marked something unsafe to drive. The truck goes down for repair and dispatch is told. Send?': 'Marcó algo como no seguro para manejar. El camión queda fuera de servicio y se avisa a despacho. ¿Enviar?',
    'Sent. Dispatch has been told the truck is unsafe to drive — call them before you go anywhere.': 'Enviado. Se avisó a despacho que el camión no es seguro — llámelos antes de ir a cualquier lugar.',
    'Sent. Dispatch and the shop can see the defects.': 'Enviado. Despacho y el taller pueden ver los defectos.',
    'Review the repairs on the last report first': 'Primero revise las reparaciones del último reporte', 'Sign with your finger in the box': 'Firme con el dedo en el recuadro', 'Type your name': 'Escriba su nombre',
    'Service brakes and trailer brake connections': 'Frenos de servicio y conexiones de freno del remolque', 'Parking brake': 'Freno de estacionamiento', 'Steering': 'Dirección',
    'Lights and reflectors': 'Luces y reflectores', 'Tires': 'Llantas', 'Wheels and rims': 'Ruedas y rines', 'Horn': 'Claxon', 'Windshield and wipers': 'Parabrisas y limpiadores',
    'Mirrors': 'Espejos', 'Coupling devices (fifth wheel, kingpin)': 'Acoplamiento (quinta rueda, perno rey)', 'Air lines and glad hands': 'Líneas de aire y manitas',
    'Fluid leaks (oil, coolant, fuel)': 'Fugas (aceite, anticongelante, combustible)', 'Emergency equipment (extinguisher, triangles)': 'Equipo de emergencia (extintor, triángulos)',
    'Brakes and brake connections': 'Frenos y conexiones de freno', 'Coupling (kingpin, landing gear)': 'Acoplamiento (perno rey, patas)', 'Doors, hinges and liftgate': 'Puertas, bisagras y rampa',
    'Reefer unit running at the set temperature': 'Termo funcionando a la temperatura fijada', 'Reefer fuel level': 'Nivel de combustible del termo',
  };
  // Lines with numbers, names and times in them
  var P = [
    // 139: inspections
    [/^Check "(.+)" on (.+) first\.?$/, 'Revise "$1" en $2 primero.'], [/^Say what's wrong with "(.+)" on (.+)\.?$/, 'Diga qué está mal con "$1" en $2.'],
    [/^Take a photo for "(.+)" on (.+)\.?$/, 'Tome una foto de "$1" en $2.'],
    [/^Truck (.+) is down for repair\.$/, 'El camión $1 está fuera de servicio por reparación.'], [/^Trailer (.+) is down for repair\.$/, 'El remolque $1 está fuera de servicio por reparación.'],
    [/^Don't drive it\. Call dispatch$/, 'No lo maneje. Llame a despacho'],
    [/^✓ Pre-trip done ([^·]+)$/, '✓ Inspección antes del viaje hecha $1'], [/^✓ Post-trip done ([^·]+)$/, '✓ Inspección después del viaje hecha $1'],
    [/^(\d+) defects? reported$/, '$1 defecto(s) reportado(s)'],
    [/^the shop fixed (\d+) items? since the last report — you'll review (it|them) first$/, 'el taller arregló $1 desde el último reporte — primero lo(s) revisará'],
    [/^Post-trip inspection · (.+)$/, 'Inspección después del viaje · $1'],
    [/^Tractor ([^·]+)$/, 'Tractor $1'], [/^Trailer ([^·]+)$/, 'Remolque $1'],
    [/^Arrived · arrived (.+)$/, 'Llegó a las $1'], [/^Delivered · arrived (.+)$/, 'Entregado · llegó a las $1'], [/^Picked up · arrived (.+)$/, 'Recogido · llegó a las $1'],
    [/^Stop (\d+) · PICKUP · (.+)$/, 'Parada $1 · RECOGIDA · $2'], [/^Stop (\d+) · (.+)$/, 'Parada $1 · $2'],
    [/^Load (\S+)$/i, 'Carga $1'], [/^Documents · Load (.+)$/, 'Documentos · Carga $1'],
    [/^Window$/, 'Horario'], [/^Window (.+)$/, 'Horario $1'],
    [/^(\d+) stops? left$/, 'Quedan $1 paradas'], [/^All done for today: (\d+) loads? delivered\.$/, 'Todo listo por hoy: $1 cargas entregadas.'],
    [/^Odometer( \(hub miles\))?$/, 'Odómetro$1'], [/^start (.*) · end (.*)$/, 'salida $1 · llegada $2'],
    [/^(.+) delivered \(of (\d+)\)$/, function (m, u, n) { return (UNITS[u] || u) + ' entregadas (de ' + n + ')'; }],
    [/^(.+) picked up \(of (\d+)\)$/, function (m, u, n) { return (UNITS[u] || u) + ' recogidas (de ' + n + ')'; }],
    [/^(\d+) of (\d+)$/, '$1 de $2'], [/^arrived (.+)$/, 'llegó $1'], [/^departed (.+)$/, 'salió $1'],
    [/^(\d+) of (\d+) (.+)$/, '$1 de $2 $3'], [/^Photo (\d+) · (.+)$/, 'Foto $1 · $2'],
    [/^ label(s?)$/, ' etiqueta$1'], [/ · arrived /, ' · llegó '], [/ · departed /, ' · salió '],
    [/^New stop added by dispatch(.*)$/, 'Parada nueva agregada por despacho$1'],
    [/^Remove (.+)$/, 'Quitar $1'], [/^(\d+) missing$/, '$1 faltan'], [/^(\d+) not on the list$/, '$1 no están en la lista'],
    [/^You're leaving (\d+) pieces? short\.$/, 'Sale con $1 piezas de menos.'],
    [/^I understand — start with these missing$/, 'Entiendo — empezar sin estas'], [/^I understand — start with this load$/, 'Entiendo — empezar con esta carga'],
    [/^so far (.+)$/, 'hasta ahora $1'], [/^Worked (.+)$/, 'Trabajó $1']
  ];
  var UNITS = { photos: 'fotos', photo: 'foto', labels: 'etiquetas', label: 'etiqueta', pallets: 'tarimas', pallet: 'tarima', cases: 'cajas', case: 'caja', pieces: 'piezas', piece: 'pieza', totes: 'contenedores', tote: 'contenedor', cages: 'jaulas', cage: 'jaula', boxes: 'cajas', box: 'caja' };
  function tr(s) {
    if (!s) return s;
    var lead = s.match(/^[\s·]*/)[0], tail = s.match(/[\s·]*$/)[0], core = s.slice(lead.length, s.length - tail.length);
    if (!core) return s;
    if (Object.prototype.hasOwnProperty.call(T, core)) return lead + T[core] + tail;
    for (var i = 0; i < P.length; i++) if (P[i][0].test(core)) return lead + core.replace(P[i][0], P[i][1]) + tail;
    var u = core.match(/^(\d+) ([a-z]+)$/); if (u && UNITS[u[2]]) return lead + u[1] + ' ' + UNITS[u[2]] + tail;
    if (UNITS[core]) return lead + UNITS[core] + tail;
    if (core.indexOf(' · ') > 0) { var parts = core.split(' · '), out = parts.map(function (x) { return tr(x); });
      if (out.join(' · ') !== core) return lead + out.join(' · ') + tail; }
    return s;
  }
  window.RC_TR = tr;
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1 };
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { var p = root.parentNode; if (p && !SKIP[p.nodeName] && !(p.closest && p.closest('.meta.addr, [data-notr]'))) { var t = tr(root.nodeValue); if (t !== root.nodeValue) root.nodeValue = t; } return; }
    if (root.nodeType !== 1 || SKIP[root.nodeName] && root.nodeName !== 'INPUT' && root.nodeName !== 'TEXTAREA') return;
    ['placeholder', 'title', 'aria-label'].forEach(function (a) { var v = root.getAttribute && root.getAttribute(a); if (v) { var t = tr(v); if (t !== v) root.setAttribute(a, t); } });
    if (root.nodeName === 'INPUT' || root.nodeName === 'TEXTAREA') return;
    for (var c = root.firstChild; c; c = c.nextSibling) walk(c);
  }
  var busy = false;
  var mo = new MutationObserver(function (list) {
    if (busy) return; busy = true;
    try { list.forEach(function (m) { if (m.type === 'characterData') walk(m.target); else m.addedNodes.forEach(walk); if (m.type === 'attributes') walk(m.target); }); } finally { busy = false; }
  });
  function go() { walk(document.body); mo.observe(document.body, { childList: true, subtree: true, characterData: true }); }
  if (document.body) go(); else document.addEventListener('DOMContentLoaded', go);
  var oc = window.confirm, oa = window.alert;
  window.confirm = function (m) { return oc.call(window, tr(String(m))); };
  window.alert = function (m) { return oa.call(window, tr(String(m))); };
})();

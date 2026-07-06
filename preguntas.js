// ─── LectorIA · preguntas de comprensión lectora ─────────────────────────────
// 3 preguntas tipo test por cada texto (clave = texto_id de index.html).
//
// CONVENIO DE REVISIÓN: en el código la PRIMERA opción (op[0]) es SIEMPRE la
// respuesta correcta, para que revisar el banco sea fácil (se lee la respuesta
// de un vistazo). El campo `r` marca el índice correcto por si algún día se
// reordenan a mano. En pantalla, index.html BARAJA las opciones, así que el
// niño nunca ve la correcta siempre en el mismo sitio.
//
// Las preguntas son literales/inferenciales sencillas, ancladas al pasaje. El
// usuario (orientador) es el experto pedagógico: puede reescribir cualquiera.
// UMD: global PREGUNTAS en el navegador, require en Node (para tests futuros).

const PREGUNTAS = {

// ══ 1º de Primaria ═══════════════════════════════════════════════════════════
"1p-01": [ // Los animales domésticos
  { p: "¿Cuáles son los animales domésticos más comunes?", op: ["El perro y el gato", "El león y el elefante", "La vaca y el caballo"], r: 0 },
  { p: "¿Qué necesitan cada día los animales domésticos?", op: ["Comida, agua y cariño", "Solo jugar", "Vivir en el bosque"], r: 0 },
  { p: "¿A quién acompaña el perro guía?", op: ["A personas con problemas de visión", "A los gatos", "A los veterinarios"], r: 0 },
],
"1p-02": [ // Mi familia
  { p: "¿Cuántas personas hay en la familia?", op: ["Cuatro", "Tres", "Cinco"], r: 0 },
  { p: "¿De qué trabaja la mamá?", op: ["Es maestra", "Es médica", "Es cocinera"], r: 0 },
  { p: "¿Adónde salen los fines de semana?", op: ["Al parque", "Al colegio", "A la playa"], r: 0 },
],
"1p-03": [ // Las frutas
  { p: "¿De qué color son los plátanos?", op: ["Amarillos", "Rojos", "Azules"], r: 0 },
  { p: "¿Qué tienen las frutas que nos ayudan a crecer?", op: ["Vitaminas", "Piedras", "Azúcar malo"], r: 0 },
  { p: "¿Cada cuánto debemos comer fruta?", op: ["Todos los días", "Una vez al año", "Nunca"], r: 0 },
],
"1p-04": [ // El sol y la luna
  { p: "¿Qué nos da el sol?", op: ["Luz y calor", "Frío", "Lluvia"], r: 0 },
  { p: "¿Cuándo sale la luna?", op: ["Por la noche", "Por la mañana", "Al mediodía"], r: 0 },
  { p: "¿Cómo se llama la luna cuando es redonda?", op: ["Luna llena", "Luna nueva", "Media luna"], r: 0 },
],
"1p-05": [ // Los colores
  { p: "¿Qué color sale al mezclar azul y amarillo?", op: ["Verde", "Morado", "Rosa"], r: 0 },
  { p: "¿Cuáles son los colores primarios?", op: ["Rojo, amarillo y azul", "Verde, naranja y morado", "Blanco y negro"], r: 0 },
  { p: "¿De qué color es la hierba?", op: ["Verde", "Azul", "Amarilla"], r: 0 },
],
"1p-06": [ // El cuerpo humano
  { p: "¿Para qué nos sirven los ojos?", op: ["Para ver", "Para andar", "Para escuchar"], r: 0 },
  { p: "¿Con qué andamos y corremos?", op: ["Con las piernas", "Con los brazos", "Con la cabeza"], r: 0 },
  { p: "¿Cómo debemos cuidar nuestro cuerpo?", op: ["Comiendo bien y haciendo ejercicio", "Comiendo solo dulces", "Sin dormir nunca"], r: 0 },
],
"1p-07": [ // Las estaciones
  { p: "¿Cuántas estaciones tiene el año?", op: ["Cuatro", "Dos", "Seis"], r: 0 },
  { p: "¿En qué estación caen las hojas de los árboles?", op: ["En otoño", "En verano", "En primavera"], r: 0 },
  { p: "¿Qué tiempo hace en invierno?", op: ["Hace mucho frío", "Mucho calor", "Siempre sol"], r: 0 },
],
"1p-08": [ // Mi cole
  { p: "¿Cómo se llama el colegio?", op: ["Rosaleda", "Primavera", "El Parque"], r: 0 },
  { p: "¿Qué aprenden en clase?", op: ["A leer, escribir y sumar", "A cocinar", "A conducir"], r: 0 },
  { p: "¿Qué hacen en el recreo?", op: ["Juegan y meriendan", "Duermen", "Estudian"], r: 0 },
],
"1p-09": [ // Los medios de transporte
  { p: "¿Por dónde vuela el avión?", op: ["Por el cielo", "Por el mar", "Por las vías"], r: 0 },
  { p: "¿Por dónde navega el barco?", op: ["Por el mar", "Por la carretera", "Por el cielo"], r: 0 },
  { p: "¿Por qué va andando al colegio?", op: ["Porque vive cerca", "Porque no hay coches", "Porque le da miedo"], r: 0 },
],
"1p-10": [ // El agua en casa
  { p: "¿Para qué usamos el agua en casa?", op: ["Para beber, cocinar y ducharnos", "Solo para jugar", "Para pintar"], r: 0 },
  { p: "¿Qué debemos hacer al lavarnos los dientes?", op: ["Cerrar el grifo", "Dejar el grifo abierto", "Usar más agua"], r: 0 },
  { p: "¿Quién no podría vivir sin agua?", op: ["Las personas, los animales y las plantas", "Solo las plantas", "Nadie la necesita"], r: 0 },
],
"1p-11": [ // Los animales salvajes
  { p: "¿Dónde vive el león?", op: ["En la sabana africana", "En el mar", "En una casa"], r: 0 },
  { p: "¿Cuál es el animal terrestre más grande?", op: ["El elefante", "El león", "El delfín"], r: 0 },
  { p: "¿Dónde viven los delfines?", op: ["En el mar", "En la selva", "En el desierto"], r: 0 },
],
"1p-12": [ // El tiempo atmosférico
  { p: "¿Qué puede haber cuando hay nubes oscuras?", op: ["Una tormenta", "Mucho sol", "Un arcoíris"], r: 0 },
  { p: "¿Quién estudia el tiempo?", op: ["Los meteorólogos", "Los médicos", "Los cocineros"], r: 0 },
  { p: "¿Por qué conviene mirar el tiempo antes de salir?", op: ["Para saber cómo vestirnos", "Para no comer", "Para dormir"], r: 0 },
],
"1p-13": [ // Los números
  { p: "¿Para qué nos ayudan los números?", op: ["Para contar y medir", "Para dibujar", "Para cantar"], r: 0 },
  { p: "¿En qué terminan los números pares?", op: ["En 0, 2, 4, 6 u 8", "En 1, 3 o 5", "Siempre en 9"], r: 0 },
  { p: "¿Cada cuánto usamos las matemáticas?", op: ["Todos los días", "Una vez al mes", "Nunca"], r: 0 },
],
"1p-14": [ // La higiene personal
  { p: "¿Cuándo hay que lavarse las manos?", op: ["Antes de comer y después de ir al baño", "Solo los domingos", "Nunca"], r: 0 },
  { p: "¿Cuándo hay que lavarse los dientes?", op: ["Después de cada comida", "Una vez al año", "Solo en Navidad"], r: 0 },
  { p: "¿Por qué es importante la higiene personal?", op: ["Para no enfermarnos y estar sanos", "Para ensuciarnos", "Para no comer"], r: 0 },
],
"1p-15": [ // Los sentidos
  { p: "¿Cuántos sentidos tenemos las personas?", op: ["Cinco", "Tres", "Diez"], r: 0 },
  { p: "¿Con qué olemos las flores?", op: ["Con la nariz", "Con los ojos", "Con las manos"], r: 0 },
  { p: "¿Con qué saboreamos los alimentos?", op: ["Con la boca y la lengua", "Con los oídos", "Con la piel"], r: 0 },
],

// ══ 2º de Primaria ═══════════════════════════════════════════════════════════
"2p-01": [ // Las abejas
  { p: "¿Qué producen las abejas en la colmena?", op: ["Miel", "Leche", "Pan"], r: 0 },
  { p: "¿Qué hace la abeja reina?", op: ["Pone huevos", "Recoge el néctar", "Limpia la colmena"], r: 0 },
  { p: "¿De dónde recogen el néctar las abejas?", op: ["De las flores", "De los árboles", "Del agua"], r: 0 },
],
"2p-02": [ // El agua
  { p: "¿De dónde viene el agua que bebemos?", op: ["De los ríos y los embalses", "Del mar salado", "De las nubes directamente"], r: 0 },
  { p: "¿Dónde se limpia el agua antes de llegar a casa?", op: ["En las potabilizadoras", "En el río", "En la nevera"], r: 0 },
  { p: "¿Qué podemos hacer para ahorrar agua?", op: ["Cerrar el grifo al lavarnos los dientes", "Ducharnos mucho tiempo", "Dejar los grifos abiertos"], r: 0 },
],
"2p-03": [ // El mercado
  { p: "¿Con qué pesan los alimentos en el mercado?", op: ["Con una balanza", "Con una regla", "Con un reloj"], r: 0 },
  { p: "Si compras un kilo de manzanas y otro de peras, ¿cuántos kilos llevas?", op: ["Dos kilos", "Un kilo", "Tres kilos"], r: 0 },
  { p: "Si pagas cinco euros y la compra vale tres, ¿cuánto te devuelven?", op: ["Dos euros", "Cinco euros", "Nada"], r: 0 },
],
"2p-04": [ // Los dinosaurios
  { p: "¿Cuándo vivieron los dinosaurios?", op: ["Hace millones de años", "El año pasado", "Ahora mismo"], r: 0 },
  { p: "¿Por qué desaparecieron probablemente?", op: ["Por el impacto de un meteorito", "Por el frío del invierno", "Por falta de agua"], r: 0 },
  { p: "¿Gracias a qué podemos conocerlos hoy?", op: ["A los fósiles", "A las fotos", "A los vídeos"], r: 0 },
],
"2p-05": [ // La biblioteca
  { p: "¿Qué hay en una biblioteca?", op: ["Miles de libros", "Muchos juguetes", "Animales"], r: 0 },
  { p: "¿Cómo están ordenados los libros?", op: ["Por temas", "Por colores", "Por tamaño"], r: 0 },
  { p: "¿Qué hay que hacer en la biblioteca?", op: ["Guardar silencio", "Gritar", "Correr"], r: 0 },
],
"2p-06": [ // Las plantas
  { p: "¿Qué hacen las raíces de la planta?", op: ["Absorben el agua y los nutrientes", "Fabrican flores", "Vuelan"], r: 0 },
  { p: "¿Cómo fabrican las plantas su alimento?", op: ["Con la fotosíntesis", "Comiendo insectos", "Bebiendo leche"], r: 0 },
  { p: "¿Qué nos dan las plantas para poder respirar?", op: ["Oxígeno", "Humo", "Agua"], r: 0 },
],
"2p-07": [ // El sistema solar
  { p: "¿Cuántos planetas giran alrededor del Sol?", op: ["Ocho", "Cinco", "Diez"], r: 0 },
  { p: "¿Cuál es el planeta más grande?", op: ["Júpiter", "La Tierra", "Marte"], r: 0 },
  { p: "¿Qué planeta tiene anillos de hielo y roca?", op: ["Saturno", "Venus", "Mercurio"], r: 0 },
],
"2p-08": [ // La alimentación saludable
  { p: "¿Qué nos aportan las frutas y las verduras?", op: ["Vitaminas y minerales", "Solo grasa", "Nada útil"], r: 0 },
  { p: "¿Qué alimentos fortalecen nuestros huesos?", op: ["La leche y el queso", "Los dulces", "Los refrescos"], r: 0 },
  { p: "¿Qué debemos evitar tomar en exceso?", op: ["Dulces y refrescos", "Agua", "Fruta"], r: 0 },
],
"2p-09": [ // Los oficios
  { p: "¿Quién apaga los incendios?", op: ["Los bomberos", "Los médicos", "Los maestros"], r: 0 },
  { p: "¿Quién cultiva los alimentos que comemos?", op: ["Los agricultores", "Los ingenieros", "Los bomberos"], r: 0 },
  { p: "¿Qué se dice de todos los oficios?", op: ["Que son importantes y necesarios", "Que no sirven para nada", "Que son todos iguales"], r: 0 },
],
"2p-10": [ // El reciclaje
  { p: "¿A qué contenedor va el papel y el cartón?", op: ["Al azul", "Al amarillo", "Al verde"], r: 0 },
  { p: "¿Qué va al contenedor amarillo?", op: ["Los envases de plástico y las latas", "El vidrio", "El papel"], r: 0 },
  { p: "¿Para qué es importante reciclar?", op: ["Para cuidar el medio ambiente", "Para gastar más", "Para ensuciar"], r: 0 },
],
"2p-11": [ // Los volcanes
  { p: "¿Qué expulsa un volcán en erupción?", op: ["Lava, ceniza y gases", "Agua y hielo", "Arena"], r: 0 },
  { p: "¿Qué es la lava?", op: ["Roca líquida muy caliente", "Agua fría", "Nieve"], r: 0 },
  { p: "¿Qué islas se formaron por volcanes?", op: ["Las Islas Canarias", "Las Islas Baleares", "Ninguna isla"], r: 0 },
],
"2p-12": [ // El dinero y los precios
  { p: "¿Qué moneda usamos en España?", op: ["El euro", "El dólar", "La libra"], r: 0 },
  { p: "¿Cuántos céntimos tiene un euro?", op: ["Cien", "Diez", "Mil"], r: 0 },
  { p: "Si algo cuesta 2,50 € y das 5 €, ¿cuánto te devuelven?", op: ["2,50 €", "5 €", "Nada"], r: 0 },
],
"2p-13": [ // Los seres vivos
  { p: "¿Qué hacen todos los seres vivos?", op: ["Nacen, crecen, se reproducen y mueren", "Solo crecen", "Nunca cambian"], r: 0 },
  { p: "¿Cuál de estos NO es un ser vivo?", op: ["Una piedra", "Una planta", "Un animal"], r: 0 },
  { p: "¿Cómo se llaman los científicos que estudian los seres vivos?", op: ["Biólogos", "Astronautas", "Pintores"], r: 0 },
],
"2p-14": [ // Los medios de comunicación
  { p: "¿Para qué sirven los medios de comunicación?", op: ["Para estar informados", "Para dormir", "Para cocinar"], r: 0 },
  { p: "¿Cuál de estos es un medio de comunicación?", op: ["La televisión", "La silla", "El zapato"], r: 0 },
  { p: "¿Cómo debemos usar los medios de comunicación?", op: ["De forma responsable", "Sin pensar", "Solo de noche"], r: 0 },
],
"2p-15": [ // Las máquinas simples
  { p: "¿Para qué sirven las máquinas simples?", op: ["Para hacer trabajos con menos esfuerzo", "Para descansar", "Para jugar"], r: 0 },
  { p: "¿Qué máquina usa una cuerda y una rueda para levantar cargas?", op: ["La polea", "La palanca", "El plano inclinado"], r: 0 },
  { p: "¿Cuál es una de las invenciones más importantes de la historia?", op: ["La rueda", "El lápiz", "La silla"], r: 0 },
],

// ══ 3º de Primaria ═══════════════════════════════════════════════════════════
"3p-01": [ // La célula
  { p: "¿Qué es la célula?", op: ["La unidad más pequeña de los seres vivos", "Un animal muy pequeño", "Un tipo de planta"], r: 0 },
  { p: "¿Con qué se ven las células más pequeñas?", op: ["Con un microscopio", "Con gafas normales", "A simple vista"], r: 0 },
  { p: "¿Cómo se reproducen las células?", op: ["Dividiéndose en dos", "Poniendo huevos", "No se reproducen"], r: 0 },
],
"3p-02": [ // La Reconquista
  { p: "¿Cuánto duró la Reconquista?", op: ["Casi ocho siglos", "Un solo año", "Diez años"], r: 0 },
  { p: "¿Qué tres culturas convivieron en España?", op: ["La cristiana, la musulmana y la judía", "La romana, la griega y la egipcia", "La inglesa, la francesa y la alemana"], r: 0 },
  { p: "¿Qué ocurrió en 1492?", op: ["Los Reyes Católicos tomaron Granada", "Empezó la Reconquista", "Llegaron los romanos"], r: 0 },
],
"3p-03": [ // Las fracciones
  { p: "¿Para qué sirven las fracciones?", op: ["Para expresar partes de un todo", "Para restar", "Para contar animales"], r: 0 },
  { p: "¿Cómo se llama el número de abajo de una fracción?", op: ["Denominador", "Numerador", "Cociente"], r: 0 },
  { p: "¿A cuánto equivale un medio?", op: ["A dos cuartos", "A tres cuartos", "A un tercio"], r: 0 },
],
"3p-04": [ // El aparato digestivo
  { p: "¿Dónde empieza la digestión?", op: ["En la boca", "En el estómago", "En el intestino"], r: 0 },
  { p: "¿Dónde se absorben los nutrientes?", op: ["En el intestino delgado", "En la boca", "En el esófago"], r: 0 },
  { p: "¿Cuánto tarda en completarse la digestión?", op: ["Varias horas", "Unos segundos", "Varios días"], r: 0 },
],
"3p-05": [ // Los ecosistemas
  { p: "¿Qué es un ecosistema?", op: ["El conjunto de los seres vivos de un lugar y su medio", "Solo las plantas", "Solo el agua"], r: 0 },
  { p: "¿De qué se alimentan los carnívoros?", op: ["De otros animales", "De plantas", "De piedras"], r: 0 },
  { p: "¿Cuál es un ejemplo de ecosistema acuático?", op: ["Un río", "Un bosque", "Un desierto"], r: 0 },
],
"3p-06": [ // La atmósfera
  { p: "¿Qué es la atmósfera?", op: ["La capa de gases que rodea la Tierra", "Un océano", "Una montaña"], r: 0 },
  { p: "¿De qué nos protege la atmósfera?", op: ["De los rayos dañinos del sol y los meteoritos", "Del agua del mar", "De los animales"], r: 0 },
  { p: "¿Qué daña la atmósfera?", op: ["La contaminación", "La lluvia", "El viento"], r: 0 },
],
"3p-07": [ // Los romanos en Hispania
  { p: "¿Cómo llamaron los romanos a la península ibérica?", op: ["Hispania", "España", "Iberia"], r: 0 },
  { p: "¿Qué lengua nos dejaron los romanos?", op: ["El latín", "El inglés", "El griego"], r: 0 },
  { p: "¿Cuál es un ejemplo de arquitectura romana?", op: ["El acueducto de Segovia", "La Sagrada Familia", "La Alhambra"], r: 0 },
],
"3p-08": [ // La multiplicación
  { p: "¿Qué es multiplicar tres por cuatro?", op: ["Sumar tres cuatro veces", "Restar tres de cuatro", "Dividir cuatro entre tres"], r: 0 },
  { p: "¿Cómo se llama el resultado de una multiplicación?", op: ["Producto", "Suma", "Resto"], r: 0 },
  { p: "¿Cuánto da cualquier número multiplicado por cero?", op: ["Cero", "Uno", "El mismo número"], r: 0 },
],
"3p-09": [ // El sistema circulatorio
  { p: "¿Cuál es el órgano principal del sistema circulatorio?", op: ["El corazón", "El pulmón", "El estómago"], r: 0 },
  { p: "¿Qué llevan las arterias?", op: ["Sangre con oxígeno", "Aire", "Comida"], r: 0 },
  { p: "¿Qué fortalece el corazón?", op: ["Hacer ejercicio", "Dormir todo el día", "Comer dulces"], r: 0 },
],
"3p-10": [ // Los continentes
  { p: "¿Cuál es el continente más grande?", op: ["Asia", "Europa", "Oceanía"], r: 0 },
  { p: "¿En qué continente vivimos?", op: ["Europa", "Asia", "América"], r: 0 },
  { p: "¿Cómo se llamaba el supercontinente de hace millones de años?", op: ["Pangea", "Atlántida", "Oceanía"], r: 0 },
],
"3p-11": [ // La energía
  { p: "¿De dónde proviene la energía solar?", op: ["Del sol", "Del viento", "Del agua"], r: 0 },
  { p: "¿Cómo se obtiene la energía eólica?", op: ["Del viento", "Del sol", "Del carbón"], r: 0 },
  { p: "¿Qué ventaja tienen las energías renovables?", op: ["No se agotan y contaminan menos", "Se acaban pronto", "Ensucian mucho"], r: 0 },
],
"3p-12": [ // La división
  { p: "¿Para qué sirve la división?", op: ["Para repartir en partes iguales", "Para sumar", "Para multiplicar"], r: 0 },
  { p: "Si repartimos 24 caramelos entre 6 amigos, ¿cuántos recibe cada uno?", op: ["Cuatro", "Seis", "Dos"], r: 0 },
  { p: "¿Cómo se llama lo que sobra en una división no exacta?", op: ["El resto", "El cociente", "El divisor"], r: 0 },
],
"3p-13": [ // Las plantas con flores
  { p: "¿Cómo se llama cuando el polen llega al pistilo de otra flor?", op: ["Polinización", "Fotosíntesis", "Germinación"], r: 0 },
  { p: "¿Quién ayuda a llevar el polen de una flor a otra?", op: ["Los insectos o el viento", "Los peces", "La lluvia sola"], r: 0 },
  { p: "¿Qué contienen los frutos?", op: ["Las semillas", "Las raíces", "Las hojas"], r: 0 },
],
"3p-14": [ // La prehistoria
  { p: "¿Con qué terminó la prehistoria?", op: ["Con la invención de la escritura", "Con la llegada de los romanos", "Con el descubrimiento de América"], r: 0 },
  { p: "¿Dónde vivían los humanos en la prehistoria?", op: ["En cuevas", "En castillos", "En pisos"], r: 0 },
  { p: "¿Qué nos muestran las pinturas de Altamira?", op: ["Cómo vivían nuestros antepasados", "Cómo se cocina", "Cómo se lee"], r: 0 },
],
"3p-15": [ // El agua en la naturaleza
  { p: "¿En qué tres estados se presenta el agua?", op: ["Líquido, sólido y gaseoso", "Solo líquido", "Caliente y frío"], r: 0 },
  { p: "¿Qué describe el ciclo del agua?", op: ["Cómo el agua se evapora, forma nubes y vuelve al mar", "Cómo se bebe el agua", "Cómo se congela la comida"], r: 0 },
  { p: "¿Cuánta agua de la Tierra es dulce?", op: ["Solo el tres por ciento", "La mitad", "Toda"], r: 0 },
],

// ══ 4º de Primaria ═══════════════════════════════════════════════════════════
"4p-01": [ // La Tierra y sus movimientos
  { p: "¿Cuánto dura el movimiento de rotación?", op: ["Veinticuatro horas", "Un año", "Un mes"], r: 0 },
  { p: "¿Qué origina el movimiento de rotación?", op: ["El día y la noche", "Las estaciones", "Los años"], r: 0 },
  { p: "¿Cuánto dura el movimiento de traslación?", op: ["Trescientos sesenta y cinco días", "Un día", "Una hora"], r: 0 },
],
"4p-02": [ // La Edad Media
  { p: "¿Con qué acontecimiento terminó la Edad Media?", op: ["Con el descubrimiento de América en 1492", "Con la llegada de los romanos", "Con la Revolución Industrial"], r: 0 },
  { p: "¿Cómo estaba organizada Europa en la Edad Media?", op: ["En feudos", "En repúblicas", "En imperios coloniales"], r: 0 },
  { p: "¿Qué eran las Cruzadas?", op: ["Expediciones militares para recuperar los Santos Lugares", "Fiestas populares", "Escuelas de la época"], r: 0 },
],
"4p-03": [ // Las fracciones y los decimales
  { p: "¿Qué separa el punto o la coma en un número decimal?", op: ["La parte entera de la parte decimal", "Dos números enteros distintos", "Nada"], r: 0 },
  { p: "¿A cuánto equivale un medio en decimal?", op: ["Cero coma cinco", "Uno", "Dos"], r: 0 },
  { p: "¿Qué hay que hacer al operar con decimales?", op: ["Alinear correctamente las cifras", "Borrar la coma", "Empezar por la izquierda siempre"], r: 0 },
],
"4p-04": [ // El aparato respiratorio
  { p: "¿Para qué sirve el aparato respiratorio?", op: ["Para obtener el oxígeno del aire", "Para digerir la comida", "Para pensar"], r: 0 },
  { p: "¿Dónde pasa el oxígeno a la sangre?", op: ["En los alvéolos pulmonares", "En el estómago", "En el corazón"], r: 0 },
  { p: "¿Qué daña gravemente los pulmones?", op: ["El tabaco", "El deporte", "El agua"], r: 0 },
],
"4p-05": [ // Los polígonos
  { p: "¿Qué son los polígonos?", op: ["Figuras cerradas formadas por lados rectos", "Líneas curvas", "Puntos sueltos"], r: 0 },
  { p: "¿Cuántos lados tiene un pentágono?", op: ["Cinco", "Tres", "Seis"], r: 0 },
  { p: "¿Qué es el perímetro de un polígono?", op: ["La suma de todos sus lados", "Su color", "Su altura"], r: 0 },
],
"4p-06": [ // Los Reyes Católicos
  { p: "¿Quiénes fueron los Reyes Católicos?", op: ["Isabel de Castilla y Fernando de Aragón", "Carlos y Felipe", "Colón y Pinzón"], r: 0 },
  { p: "¿Qué dos hechos importantes ocurrieron en 1492?", op: ["La toma de Granada y el descubrimiento de América", "Dos guerras europeas", "La Revolución Industrial"], r: 0 },
  { p: "¿En qué convirtieron a España?", op: ["En una potencia mundial", "En una colonia", "En un pueblo pequeño"], r: 0 },
],
"4p-07": [ // La luz y el sonido
  { p: "¿Qué viaja más rápido?", op: ["La luz", "El sonido", "Los dos igual"], r: 0 },
  { p: "¿Por qué vemos el relámpago antes de oír el trueno?", op: ["Porque la luz viaja más rápido que el sonido", "Porque el trueno llega antes", "Por pura casualidad"], r: 0 },
  { p: "¿En qué se mide la intensidad del sonido?", op: ["En decibelios", "En metros", "En litros"], r: 0 },
],
"4p-08": [ // El sistema nervioso
  { p: "¿Qué controla el cerebro?", op: ["El pensamiento, la memoria y las emociones", "Solo la digestión", "Solo la respiración"], r: 0 },
  { p: "¿Qué coordina el cerebelo?", op: ["Los movimientos y el equilibrio", "La vista", "El oído"], r: 0 },
  { p: "¿Cómo se llaman las células del sistema nervioso?", op: ["Neuronas", "Glóbulos", "Músculos"], r: 0 },
],
"4p-09": [ // España en el mundo
  { p: "¿Dónde está situada España?", op: ["En el suroeste de Europa", "En el centro de Asia", "En América"], r: 0 },
  { p: "¿Cuál es la capital de España?", op: ["Madrid", "Barcelona", "Sevilla"], r: 0 },
  { p: "¿Con qué país limita España al oeste?", op: ["Portugal", "Francia", "Italia"], r: 0 },
],
"4p-10": [ // La materia y sus estados
  { p: "¿Qué es la materia?", op: ["Todo lo que tiene masa y ocupa un espacio", "Solo lo que podemos ver", "Solo el agua"], r: 0 },
  { p: "¿Qué forma tiene la materia en estado líquido?", op: ["La forma del recipiente que la contiene", "Una forma propia fija", "Ninguna, no ocupa espacio"], r: 0 },
  { p: "¿Qué hace cambiar los estados de la materia?", op: ["La temperatura", "El color", "El peso"], r: 0 },
],
"4p-11": [ // El descubrimiento de América
  { p: "¿Qué día llegó Colón a América?", op: ["El doce de octubre de 1492", "El uno de enero de 1500", "En el año 2000"], r: 0 },
  { p: "¿Qué creía Colón haber encontrado?", op: ["Una nueva ruta hacia Asia", "Un tesoro escondido", "Una isla vacía"], r: 0 },
  { p: "¿Qué productos llegaron a Europa desde América?", op: ["El tomate, la patata y el chocolate", "El trigo y la cebada", "El arroz y el té"], r: 0 },
],
"4p-12": [ // Las magnitudes y las medidas
  { p: "¿Qué es medir?", op: ["Comparar una magnitud con una unidad de medida", "Contar animales", "Dibujar figuras"], r: 0 },
  { p: "¿Cuál es la unidad de longitud del sistema métrico decimal?", op: ["El metro", "El kilo", "El litro"], r: 0 },
  { p: "¿A cuántos metros equivale un kilómetro?", op: ["Mil metros", "Cien metros", "Diez metros"], r: 0 },
],
"4p-13": [ // Los seres vivos y su clasificación
  { p: "¿En cuántos reinos se clasifican los seres vivos?", op: ["Cinco", "Tres", "Diez"], r: 0 },
  { p: "¿Qué tienen los vertebrados?", op: ["Esqueleto interno", "No tienen huesos", "Una concha"], r: 0 },
  { p: "¿Cómo se alimentan los hongos?", op: ["De materia orgánica en descomposición", "Por fotosíntesis", "Cazando animales"], r: 0 },
],
"4p-14": [ // La Revolución Industrial
  { p: "¿Dónde comenzó la Revolución Industrial?", op: ["En Inglaterra", "En España", "En China"], r: 0 },
  { p: "¿Qué invento permitió mecanizar las fábricas?", op: ["La máquina de vapor", "El ordenador", "El teléfono"], r: 0 },
  { p: "¿Por qué luchó el movimiento obrero?", op: ["Por mejorar las condiciones laborales", "Por construir más fábricas", "Por cobrar menos"], r: 0 },
],
"4p-15": [ // El medio ambiente
  { p: "¿Cuáles son los principales problemas medioambientales?", op: ["La contaminación del aire, el agua y el suelo", "La falta de coches", "El exceso de árboles"], r: 0 },
  { p: "¿Qué está provocando el cambio climático?", op: ["El aumento de temperaturas y la subida del nivel del mar", "Más nieve siempre", "No provoca nada"], r: 0 },
  { p: "¿Qué podemos hacer para proteger el medio ambiente?", op: ["Reciclar y ahorrar energía y agua", "Tirar más basura", "Gastar más recursos"], r: 0 },
],

// ══ 5º de Primaria ═══════════════════════════════════════════════════════════
"5p-01": [ // El universo
  { p: "¿Cómo se originó el universo?", op: ["En el Big Bang", "En una gran tormenta", "Nadie lo ha estudiado"], r: 0 },
  { p: "¿Cómo se llama nuestra galaxia?", op: ["La Vía Láctea", "Andrómeda", "El Sistema Solar"], r: 0 },
  { p: "¿Qué son las estrellas?", op: ["Enormes bolas de gas que generan luz y calor", "Piedras frías", "Planetas pequeños"], r: 0 },
],
"5p-02": [ // La España del siglo XVI
  { p: "¿Qué fue España durante el siglo XVI?", op: ["La mayor potencia mundial", "Un país muy pequeño", "Una colonia extranjera"], r: 0 },
  { p: "¿Quién trasladó la capital a Madrid?", op: ["Felipe II", "Cristóbal Colón", "Carlos I"], r: 0 },
  { p: "¿Cómo se conoce el florecimiento de las artes de esa época?", op: ["El Siglo de Oro español", "El Renacimiento italiano", "La Ilustración"], r: 0 },
],
"5p-03": [ // Los porcentajes
  { p: "¿Sobre qué número expresa una proporción el porcentaje?", op: ["Sobre cien", "Sobre diez", "Sobre mil"], r: 0 },
  { p: "En una clase de 25 alumnos, ¿cuántas chicas hay si son el 40 %?", op: ["Diez", "Veinte", "Cinco"], r: 0 },
  { p: "¿Cómo se calcula el porcentaje de una cantidad?", op: ["Multiplicando por el porcentaje y dividiendo entre cien", "Restando cien", "Sumando cien"], r: 0 },
],
"5p-04": [ // El aparato locomotor
  { p: "¿De qué dos sistemas está formado el aparato locomotor?", op: ["Del sistema óseo y el muscular", "Del digestivo y el respiratorio", "Solo del nervioso"], r: 0 },
  { p: "¿Qué unen las articulaciones?", op: ["Los huesos", "Dos músculos entre sí", "Los nervios"], r: 0 },
  { p: "¿Qué unen los tendones?", op: ["Los músculos a los huesos", "Dos huesos entre sí", "Dos venas"], r: 0 },
],
"5p-05": [ // La literatura española
  { p: "¿Cuál es considerado el primer texto literario en castellano?", op: ["El Cantar de Mío Cid", "Don Quijote de la Mancha", "La Celestina"], r: 0 },
  { p: "¿Quién escribió Don Quijote de la Mancha?", op: ["Miguel de Cervantes", "Lope de Vega", "Federico García Lorca"], r: 0 },
  { p: "¿Qué autor destacó en el siglo XX?", op: ["Federico García Lorca", "Francisco de Quevedo", "El Cid"], r: 0 },
],
"5p-06": [ // Las fuerzas y el movimiento
  { p: "¿Qué puede cambiar una fuerza?", op: ["El estado de movimiento o la forma de un objeto", "El color de un objeto", "El sabor de un objeto"], r: 0 },
  { p: "¿Qué es la gravedad?", op: ["La fuerza que atrae los objetos hacia el centro de la Tierra", "Una máquina", "Un planeta"], r: 0 },
  { p: "¿Quién formuló las leyes del movimiento?", op: ["Isaac Newton", "Cristóbal Colón", "Miguel de Cervantes"], r: 0 },
],
"5p-07": [ // La Ilustración y las revoluciones
  { p: "¿Qué defendía la Ilustración?", op: ["La razón y el conocimiento como base del progreso", "La guerra continua", "La monarquía absoluta"], r: 0 },
  { p: "¿Qué revolución inspiraron estas ideas en 1789?", op: ["La Revolución Francesa", "La Revolución Industrial", "La Revolución Rusa"], r: 0 },
  { p: "¿Cuál era el lema de la Revolución Francesa?", op: ["Libertad, igualdad y fraternidad", "Paz y trabajo", "Orden y progreso"], r: 0 },
],
"5p-08": [ // Las proporciones
  { p: "¿Qué expresa una proporción?", op: ["La igualdad entre dos razones", "Una simple resta", "Solo un porcentaje"], r: 0 },
  { p: "En proporcionalidad directa, si una cantidad aumenta, la otra…", op: ["También aumenta", "Disminuye", "No cambia"], r: 0 },
  { p: "Si un coche gasta 8 litros cada 100 km, ¿cuántos necesita para 200 km?", op: ["Dieciséis litros", "Ocho litros", "Cien litros"], r: 0 },
],
"5p-09": [ // Los ecosistemas españoles
  { p: "¿Por qué España tiene tantos ecosistemas distintos?", op: ["Por su variada geografía y clima", "Por ser un país pequeño", "Solo por el mar"], r: 0 },
  { p: "¿Qué árboles forman el bosque mediterráneo?", op: ["Encinas y alcornoques", "Solo palmeras", "Solo pinos nevados"], r: 0 },
  { p: "¿Qué es Doñana?", op: ["Un humedal refugio de aves migratorias", "Una montaña muy alta", "Una gran ciudad"], r: 0 },
],
"5p-10": [ // La célula y la genética
  { p: "¿Qué contiene el ADN?", op: ["Toda la información genética del organismo", "Solo agua", "Comida"], r: 0 },
  { p: "¿Cuántos cromosomas tenemos los humanos en cada célula?", op: ["Cuarenta y seis", "Diez", "Cien"], r: 0 },
  { p: "¿Quién describió las leyes de la herencia?", op: ["Gregor Mendel", "Isaac Newton", "Cristóbal Colón"], r: 0 },
],
"5p-11": [ // El siglo XIX en España
  { p: "¿Qué guerra provocó la invasión napoleónica?", op: ["La Guerra de la Independencia", "La Guerra Civil", "La Reconquista"], r: 0 },
  { p: "¿Qué territorios perdió España en 1898?", op: ["Cuba, Puerto Rico y Filipinas", "Cataluña y Aragón", "Andalucía"], r: 0 },
  { p: "¿Cómo se llama el movimiento de intelectuales tras 1898?", op: ["La Generación del 98", "El Siglo de Oro", "La Ilustración"], r: 0 },
],
"5p-12": [ // Estadística y probabilidad
  { p: "¿De qué se ocupa la estadística?", op: ["De recoger, organizar e interpretar datos", "De dibujar mapas", "De contar cuentos"], r: 0 },
  { p: "¿Cómo se calcula la media aritmética?", op: ["Sumando todos los valores y dividiendo entre el número de datos", "Buscando el valor mayor", "Restando el menor del mayor"], r: 0 },
  { p: "¿Qué es la moda?", op: ["El valor que aparece con más frecuencia", "El valor más alto", "El valor del medio"], r: 0 },
],
"5p-13": [ // La reproducción de los seres vivos
  { p: "¿Para qué se reproducen los seres vivos?", op: ["Para perpetuar su especie", "Para crecer más rápido", "Para alimentarse"], r: 0 },
  { p: "¿Cuántos individuos intervienen en la reproducción sexual?", op: ["Dos", "Uno", "Tres"], r: 0 },
  { p: "En la reproducción asexual, los nuevos seres son…", op: ["Idénticos al progenitor", "Muy diferentes", "De otra especie"], r: 0 },
],
"5p-14": [ // La Segunda Guerra Mundial
  { p: "¿Cuándo empezó la Segunda Guerra Mundial?", op: ["En 1939, con la invasión de Polonia", "En 1914", "En 1975"], r: 0 },
  { p: "¿En qué dos bandos se dividieron los países?", op: ["Los Aliados y el Eje", "El Norte y el Sur", "El Este y el Oeste"], r: 0 },
  { p: "¿Qué organización se creó tras la guerra para garantizar la paz?", op: ["La Organización de las Naciones Unidas", "La Unión Europea", "La OTAN"], r: 0 },
],
"5p-15": [ // La tecnología y la sociedad
  { p: "¿Qué ha conectado a personas de todo el mundo?", op: ["Internet", "La radio antigua", "El telégrafo"], r: 0 },
  { p: "¿Qué riesgos presentan las redes sociales?", op: ["La desinformación y la adicción", "Ningún riesgo", "Solo diversión"], r: 0 },
  { p: "¿Qué es fundamental desarrollar ante la tecnología?", op: ["Un pensamiento crítico", "Miedo a usarla", "Un rechazo total"], r: 0 },
],

// ══ 6º de Primaria ═══════════════════════════════════════════════════════════
"6p-01": [ // El sistema solar
  { p: "¿Qué mantiene a los planetas orbitando alrededor del Sol?", op: ["Su enorme fuerza gravitatoria", "El viento espacial", "Unas cuerdas invisibles"], r: 0 },
  { p: "¿Cómo son los planetas interiores?", op: ["Rocosos", "Gaseosos", "De hielo"], r: 0 },
  { p: "¿Qué es Plutón según el texto?", op: ["Un planeta enano", "Una estrella", "Una luna de la Tierra"], r: 0 },
],
"6p-02": [ // La España del siglo XX
  { p: "¿Qué se proclamó en España en 1931?", op: ["La Segunda República", "La monarquía absoluta", "El imperio"], r: 0 },
  { p: "¿Cuándo terminó la dictadura de Franco?", op: ["En 1975, con su muerte", "En 1936", "En 1986"], r: 0 },
  { p: "¿Qué se aprobó al final de la Transición?", op: ["La Constitución de 1978", "Una nueva colonia", "La Segunda República"], r: 0 },
],
"6p-03": [ // El álgebra
  { p: "¿Qué utiliza el álgebra para representar cantidades desconocidas?", op: ["Letras y símbolos", "Solo dibujos", "Solo números"], r: 0 },
  { p: "¿Qué es una ecuación?", op: ["Una igualdad con una o más incógnitas", "Una resta", "Un dibujo geométrico"], r: 0 },
  { p: "¿Qué hay que hacer para resolver una ecuación de primer grado?", op: ["Despejar la incógnita", "Borrar la incógnita", "Sumar cien"], r: 0 },
],
"6p-04": [ // La nutrición y la salud
  { p: "¿Qué nos proporcionan los hidratos de carbono?", op: ["Energía rápida", "Huesos fuertes", "Nada útil"], r: 0 },
  { p: "¿Para qué son necesarias las proteínas?", op: ["Para construir y reparar los tejidos", "Para ver mejor", "Para dormir"], r: 0 },
  { p: "¿Qué dieta está reconocida como una de las más saludables?", op: ["La dieta mediterránea", "La dieta de dulces", "La dieta sin agua"], r: 0 },
],
"6p-05": [ // El Renacimiento
  { p: "¿Dónde surgió el Renacimiento?", op: ["En Italia", "En Inglaterra", "En América"], r: 0 },
  { p: "¿Quién fue el prototipo del hombre renacentista?", op: ["Leonardo da Vinci", "Cristóbal Colón", "Napoleón"], r: 0 },
  { p: "¿Qué invento facilitó la difusión del conocimiento?", op: ["La imprenta", "El teléfono", "La televisión"], r: 0 },
],
"6p-06": [ // La electricidad
  { p: "¿Qué produce la electricidad?", op: ["El movimiento de los electrones", "Solo el calor del sol", "Solo el viento"], r: 0 },
  { p: "¿Cómo se llaman los materiales que permiten el paso de la corriente?", op: ["Conductores", "Aislantes", "Receptores"], r: 0 },
  { p: "¿Qué forma un circuito eléctrico básico?", op: ["Una fuente de energía, cables y un receptor", "Solo cables", "Solo una bombilla"], r: 0 },
],
"6p-07": [ // La globalización
  { p: "¿Qué es la globalización?", op: ["El proceso de integración que ha conectado a todos los países", "Una guerra mundial", "Un deporte"], r: 0 },
  { p: "¿Qué ha permitido que productos e ideas circulen rápido por el mundo?", op: ["Los avances en transporte y las telecomunicaciones", "El correo a caballo", "Nada en concreto"], r: 0 },
  { p: "¿Qué problema también ha generado la globalización?", op: ["Desigualdades entre países ricos y pobres", "Más bosques", "Menos comercio"], r: 0 },
],
"6p-08": [ // La geometría del espacio
  { p: "¿Cuántas caras tiene un cubo?", op: ["Seis", "Cuatro", "Ocho"], r: 0 },
  { p: "¿Cómo se llama el punto donde se unen las caras de una pirámide?", op: ["El ápice", "La base", "La arista"], r: 0 },
  { p: "¿Qué mide el volumen?", op: ["El espacio que ocupa un cuerpo", "Su color", "Su temperatura"], r: 0 },
],
"6p-09": [ // Los derechos humanos
  { p: "¿A quién corresponden los derechos humanos?", op: ["A todas las personas por el hecho de serlo", "Solo a los ricos", "Solo a los adultos"], r: 0 },
  { p: "¿Cuándo se adoptó la Declaración Universal de los Derechos Humanos?", op: ["En 1948", "En 1492", "En el año 2000"], r: 0 },
  { p: "¿Qué organización trabaja para proteger a las víctimas?", op: ["Amnistía Internacional", "La FIFA", "La NASA"], r: 0 },
],
"6p-10": [ // La materia y los cambios químicos
  { p: "¿Qué estudia la química?", op: ["La composición, estructura y transformación de la materia", "Los planetas lejanos", "La historia antigua"], r: 0 },
  { p: "¿Cuál es la partícula más pequeña de un elemento químico?", op: ["El átomo", "La célula", "La molécula gigante"], r: 0 },
  { p: "¿Cuál es un ejemplo de reacción química?", op: ["La combustión", "Cortar un papel", "Mover una silla"], r: 0 },
],
"6p-11": [ // La Unión Europea
  { p: "¿Cuántos países forman la Unión Europea?", op: ["Veintisiete", "Diez", "Cincuenta"], r: 0 },
  { p: "¿Cuál es la moneda común de muchos países miembros?", op: ["El euro", "El dólar", "La peseta"], r: 0 },
  { p: "¿Cuándo ingresó España en la Unión Europea?", op: ["En 1986", "En 1948", "En 1978"], r: 0 },
],
"6p-12": [ // Los números enteros y racionales
  { p: "¿Para qué se usan los números negativos?", op: ["Para expresar temperaturas bajo cero, deudas o posiciones bajo un punto", "Para contar árboles", "Para nada útil"], r: 0 },
  { p: "¿Dónde se sitúan los números negativos en la recta numérica?", op: ["A la izquierda del cero", "A la derecha del cero", "Encima del cero"], r: 0 },
  { p: "¿Cuál es un ejemplo de número irracional?", op: ["El número pi", "El número dos", "El cero"], r: 0 },
],
"6p-13": [ // La biodiversidad
  { p: "¿Qué es la biodiversidad?", op: ["La variedad de seres vivos que habitan la Tierra", "Un tipo de planta", "Una máquina"], r: 0 },
  { p: "¿Cuáles son los ecosistemas más ricos en biodiversidad?", op: ["Los bosques tropicales y los arrecifes de coral", "Los desiertos", "Los polos helados"], r: 0 },
  { p: "¿Qué está provocando la actividad humana?", op: ["Una extinción masiva de especies", "La aparición de especies nuevas", "Ningún efecto"], r: 0 },
],
"6p-14": [ // La Primera Guerra Mundial
  { p: "¿Entre qué años se desarrolló la Primera Guerra Mundial?", op: ["Entre 1914 y 1918", "Entre 1939 y 1945", "Entre 1800 y 1810"], r: 0 },
  { p: "¿Qué acontecimiento fue el detonante del conflicto?", op: ["El asesinato del archiduque Francisco Fernando", "Una gran inundación", "El descubrimiento de América"], r: 0 },
  { p: "¿Qué nuevas armas se introdujeron?", op: ["Los gases venenosos, los tanques y los aviones", "Las espadas", "Los cañones de piedra"], r: 0 },
],
"6p-15": [ // El cambio climático
  { p: "¿Qué provoca principalmente el cambio climático?", op: ["Las emisiones de gases de efecto invernadero de la actividad humana", "El frío del invierno", "Solo los volcanes"], r: 0 },
  { p: "¿Qué gas se acumula al quemar combustibles fósiles?", op: ["El dióxido de carbono", "El oxígeno", "El vapor de agua limpio"], r: 0 },
  { p: "¿Qué acuerdo comprometió a los países a reducir emisiones?", op: ["El Acuerdo de París de 2015", "El Tratado de Versalles", "La Declaración de 1948"], r: 0 },
],

};

// UMD: navegador (global) + Node (require), igual que motor.js / informe.js
if (typeof module !== "undefined" && module.exports) module.exports = { PREGUNTAS };
if (typeof window !== "undefined") window.PREGUNTAS = PREGUNTAS;

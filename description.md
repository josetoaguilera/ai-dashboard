- **README** claro:
  - Cómo arrancar (Docker)
  - Decisiones de arquitectura / modelos.
  - Herramientas de IA usadas
  - Mejora UX detectadas y justificación.
  - Alcance: Qué cosas se deben revisar y qué cosas no se lograron para el deadline.
  - Comentarios e indicaciones adicionales.

## 1. Contexto y Objetivo

### **Problema**

Las empresas necesitan monitorizar y analizar las interacciones que sus usuarios tienen con agentes de IA en distintos canales (chatbots web, WhatsApp, etc.), para medir calidad, uso y detectar áreas de mejora.

**Objetivo de la prueba**

Construir un dashboard avanzado de “Conversaciones de IA” que permita:

1. Conectarse a una API de IA (Cualquiera, no importa la calidad de las respuestas, asi que se puede buscar una free tier).
2. Registrar y visualizar chats reales o simulados.
3. Calcular métricas y mostrar gráficos con porcentajes clave.
4. Navegar entre varias vistas mediante una sidebar.
5. Detectar puntos de mejora de UX y documentarlos.

### Objetivo

La idea de esta prueba es que no la veas como una evaluación, aunque suene contra intuitivo. Se busca que la persona evaluada vea el deadline como la fecha límite impuesta por un cliente, que tiene la **necesidad** del producto. Por ende, entran a jugar factores importantísimos a nivel de negocio, como lo son la velocidad y priorización en base al entendimiento del cliente.

Imagínate que el entregable va dirigido a un **Customer Success / Operations Analyst** (o Product Ops Manager) de una plataforma SaaS de chatbots de IA para e-commerce.

- **Perfil del cliente**
  - Suele ser alguien con experiencia tanto en producto como en datos: por ejemplo, un Customer Success Manager o un Data Analyst en un equipo de operaciones de IA.
  - No es necesariamente desarrollador, pero entiende conceptos de métricas, dashboards y sabe interpretar gráficos para tomar decisiones.
  - Necesita herramientas visuales claras, interactivas y fiables para informar a los equipos de producto y a los sellers sobre la salud y calidad de los agentes de IA.
- **Necesidad que cubre**
  - **Monitorizar el rendimiento** de las conversaciones de IA (volumen, tiempos de respuesta, satisfacción de usuarios).
  - **Detectar rápidamente problemas**: conversaciones con baja puntuación, cuellos de botella en UX, anomalías en el flujo.
  - **Tomar decisiones basadas en datos**: ajustar prompts, reasignar recursos de soporte, priorizar mejoras en el agente.
  - **Comunicar resultados** internamente: generar informes periódicos para producto, ingeniería y ventas.

### Disclaimer

En la prueba se puede (se incentiva) utilizar todo tipo de herramientas IA (ChatGpt, Cursor, Copitot, etc).

---

## 2. Alcance y Requisitos Generales

- **Frontend**: React es el único requisito. Hay libertad para utilizar cualquier librería / framework necesario.
- **Backend**: Dockerized (Node.js, Django, lo que sea.) con Dockerfile y docker-compose.
- **Autenticación**: JWT o sesión básica; puede ser hardcodeada. Lo ideal sería JWT.
- **IA**: Conectar a cualquier API pública gratuita.

---

## 3. Vistas y Navegación (Sidebar)

En la UI, implementar una **sidebar fija** con estas secciones:

1. **Resumen**
2. **Conversaciones**
3. **Analytics**
4. **Configuración**

---

### 3.1 Resumen

- **KPI rápidos**:
  - Total de conversaciones (hoy / semana / mes)
  - % de conversaciones con “satisfactorias” (basado en rating)
  - Tiempo promedio de respuesta de la IA (segundos)
- **Gráfico de tendencia**: líneas de volumen de chats por día.

### 3.2 Conversaciones

- **Tabla paginada** con:
  - ID de conversación
  - Fecha inicio
  - Duración (segundos)
  - Estado (Abierta/Cerrada)
  - Rating promedio (1–5)
- Filtros: rango de fechas, estado, rating mínimo.
- Botón para crear una nueva conversación.

### 3.3 Chat

- Al hacer clic en una conversación de “Conversaciones”, abrir **detalle**:
  - Historial completo de mensajes (usuario ↔ IA).
  - Control para enviar un nuevo mensaje de prueba (input + botón “Enviar a IA”). El canal de esta conversación es “Web”.
  - Mostrar respuesta , guardando en backend. Se puede hacer refrescando la página o con websockets. Websockets sería lo ideal.
- Al abrir una nueva conversación (habiendo apretado el “botón para crear una nueva conversación”), crear una nueva conversación en el backend, y mostrar un panel similar al que se detalla en el punto anterior pero con el historial de mensajes vacío.

### 3.4 Analytics

- **Distribución de ratings**: histograma de 1 a 5 (porcentaje de cada puntuación).
- **Gráfico de pastel** con % de conversaciones por canal (web, WhatsApp, Instagram) - (canales son simulados / mockeados. La única consideración es que los chats que se respondan mediante la interfaz del frontend clasifican como “Web”).
- **Tabla Top 5 prompts** que generaron peor rating.

### 3.5 Configuración

- Ajustes de la conexión a la API de IA (clave, endpoint). → No editables. También debe mostrar qué prompts se han creado (tener 4 hardcodeados, y permitir seleccionar cual ocupar para que la IA responda los mensajes. Dejar uno cualquiera seleccionado por default. Esto permitirá que el agente vaya “cambiando de personalidad”… Por ejemplo, un prompt podría ser un joven simpático. Otro, un viejo tradicional. Otro, un gringo que casi no sabe español. En fin, lo que tu quieras.

En caso de que lo deseas o sientas que es necesario, puedes añadir un CRUD para añadir o eliminar prompts.

- Detalles del Usuario (Nombre, email, foto, etc).

### 3.6 Diseño UI/UX

Utiliza la siguiente URL para visualizar cómo debiese quedar la interfaz: https://conversa-insights-dashboard.lovable.app/

**IMPORTANTE**

Sonbre la interfaz provista: es un MockUp autogenerado, por lo que no debe seguirse exactamente al pie de la letra. La idea es que logres conseguir los mismos recursos y diseños (layout, tarjetas, sidebar, tablas, botones, labels, etc). Que te acerques lo más posible a esto (mientras más parecido, suma más puntos). Sin embargo, debes omitir las pequeñas imperfecciones que tiene el mockup (Al crear una nueva conversación, se abre una conversación - valga la redundancia - ya existente, las tablas no están paginadas, etc. Siempre tendrá mayor relevancia lo que sale en el enunciado por sobre el diseño, en cuanto a contenido). Además, como se detalla más abajo en el enunciado, se premia cualquier intervención o alteración que realices (con la debida justificación) para mejorar la UX / UI.

---

## 4. Consideraciones del backend.

- En el backend, implementar un servicio que reciba el mensaje de usuario y:
  1. Lo envie a la API externa (p. ej. `POST https://api.openai.com/v1/chat/completions`).
  2. Guarde el mensaje, prompt y la respuesta en la base de datos.
- Documentar en el README cómo configurar la clave/API key (archivo `.env`).

---

## 5. Requerimientos Funcionales

1. **Autenticación**
2. **Manejo de conversaciones y mensajes**
3. CRUDS necesarios
4. **Calificación de conversaciones** (1–5) en la vista de detalle
5. **Frontend**: consumo de todos los endpoints, sidebar, vistas responsivas en la medida de lo posible.
6. **Testing mínimo**: Sin testing :)

---

## 6. Requerimientos No Funcionales

- **Código limpio y comentarios donde sea complejo.**
- **Dockerizado**
- **README** claro:
  - Cómo arrancar (Docker)
  - Decisiones de arquitectura / modelos.
  - Herramientas de IA usadas
  - Mejora UX detectadas y justificación.
  - Alcance: Qué cosas se deben revisar y qué cosas no se lograron para el deadline.
  - Comentarios e indicaciones adicionales.
- **Performance básica**: paginación en tablas para evitar cargas masivas.

---

## 7. Criterios de Evaluación

- **Funcionalidad**
- **Calidad de código** y buenas prácticas.
- **UX/UI**: adherencia al diseño adjunto. Considerar el siguiente punto
- **IMPORTANTE - INNOVACIÓN:** Se premia cualquier mejora en UX / UI , accesibilidad o performance que se implemente, con su debida justificación en el README.

---

## 9. Entrega

- Repositorio público (GitHub/GitLab) con todo el código.
- README

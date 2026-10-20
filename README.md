# Menthum by Itaro — Landing Page

Landing institucional y de captación de lista de espera para **Menthum**, la plataforma deportiva y de psicología del rendimiento desarrollada por **Itaro**.

---

## 🚀 Tecnologías

- **Framework & Bundler:** [Vite](https://vitejs.dev/)
- **Frontend:** Vanilla HTML5, CSS3 y JavaScript moderno (ES Modules).
- **Design System:** Kinetic Youth Athletic System oficial de Menthum (tipografías *Lexend* y *Plus Jakarta Sans*, paleta de alto rendimiento esmeralda/cyan/navy).
- **Telemetría & Analítica:** [PostHog](https://posthog.com/) con session replay, autocapture de interacciones y seguimiento de embudos.
- **Notificaciones Inmediatas:** Bot de Telegram opcional para aviso en tiempo real de nuevos registros.

---

## 🛠️ Instalación y Desarrollo Local

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Variables de entorno:**
   Copia `.env.example` a `.env` y configura tus claves:
   ```bash
   cp .env.example .env
   ```
   ```env
   VITE_POSTHOG_KEY=phc_tu_clave_posthog
   VITE_POSTHOG_HOST=https://eu.i.posthog.com
   VITE_POSTHOG_ENV_TAG=landing_menthum
   VITE_POSTHOG_DEBUG=false

   # Opcional: Telegram Bot
   VITE_TELEGRAM_BOT_TOKEN=tu_token_de_bot
   VITE_TELEGRAM_CHAT_ID=tu_chat_id
   ```

3. **Iniciar servidor de desarrollo:**
   ```bash
   npm run dev
   ```

4. **Compilar para producción:**
   ```bash
   npm run build
   ```

---

## 🔒 Privacidad y Seguridad

- El archivo `.env` está estrictamente ignorado en `.gitignore`.
- Los datos de los usuarios se procesan conforme al RGPD y se registran en PostHog con fines exclusivos de lista de espera.

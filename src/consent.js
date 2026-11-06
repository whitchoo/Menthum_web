/**
 * Menthum Web — Gestor de Consentimiento de Cookies (CMP)
 * Conforme a la Guía de Cookies de la AEPD y Art. 22.2 LSSI-CE.
 * 
 * Reglas clave:
 * - Botones "Aceptar todas" y "Rechazar no necesarias" con igual prominencia visual.
 * - Bloqueo previo de telemetría analítica (PostHog) hasta obtener consentimiento explícito.
 * - Posibilidad de revocar o modificar preferencias en cualquier momento.
 */

import { initTelemetry } from './telemetry.js';

const STORAGE_KEY = 'menthum_cookie_consent_v1';

export function getConsentPreferences() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function saveConsentPreferences(prefs) {
  try {
    const data = {
      ...prefs,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    applyConsent(data);
  } catch (e) {
    console.error('[Consent] Error al guardar preferencias:', e);
  }
}

export function applyConsent(prefs) {
  if (prefs && prefs.analytics === true) {
    initTelemetry();
  }
}

export function initConsentManager() {
  const current = getConsentPreferences();

  // Si ya existía consentimiento y estaban permitidas las analíticas, inicializar
  if (current) {
    applyConsent(current);
  } else {
    // Si no hay decisión, mostrar el banner tras un breve retardo de render
    setTimeout(() => {
      showBanner();
    }, 400);
  }

  // Escuchar botones globales para reabrir preferencias (footer, enlaces en política de cookies, etc.)
  document.addEventListener('click', (e) => {
    const target = e.target.closest('#btnManageCookies, [data-open-cookie-settings]');
    if (target) {
      e.preventDefault();
      openPreferencesModal();
    }
  });
}

function showBanner() {
  if (document.getElementById('cookieBanner')) return;

  const banner = document.createElement('aside');
  banner.id = 'cookieBanner';
  banner.className = 'cookie-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Aviso sobre el uso de cookies');
  banner.innerHTML = `
    <div class="cookie-banner-container">
      <div class="cookie-banner-text">
        <h4 class="cookie-banner-title">Configuración de Privacidad y Cookies</h4>
        <p class="cookie-banner-desc">
          En Menthum utilizamos cookies técnicas necesarias para el funcionamiento del sitio y cookies analíticas para medir el rendimiento de la web y optimizar la experiencia de usuario. Puedes aceptarlas todas, rechazarlas o configurar tus preferencias. Más detalles en nuestra <a href="/cookies.html" class="cookie-link">Política de Cookies</a>.
        </p>
      </div>
      <div class="cookie-banner-actions">
        <button type="button" class="btn btn-cookie-reject" id="btnRejectCookies">Rechazar no necesarias</button>
        <button type="button" class="btn btn-cookie-settings" id="btnConfigCookies">Configurar</button>
        <button type="button" class="btn btn-cookie-accept" id="btnAcceptCookies">Aceptar todas</button>
      </div>
    </div>
  `;

  document.body.appendChild(banner);

  document.getElementById('btnAcceptCookies').addEventListener('click', () => {
    saveConsentPreferences({ necessary: true, analytics: true });
    dismissBanner();
  });

  document.getElementById('btnRejectCookies').addEventListener('click', () => {
    saveConsentPreferences({ necessary: true, analytics: false });
    dismissBanner();
  });

  document.getElementById('btnConfigCookies').addEventListener('click', () => {
    dismissBanner();
    openPreferencesModal();
  });
}

function dismissBanner() {
  const banner = document.getElementById('cookieBanner');
  if (banner) {
    banner.classList.add('cookie-banner-hidden');
    setTimeout(() => banner.remove(), 250);
  }
}

export function openPreferencesModal() {
  let modal = document.getElementById('cookieModal');
  if (modal) modal.remove();

  const current = getConsentPreferences() || { necessary: true, analytics: false };

  modal = document.createElement('div');
  modal.id = 'cookieModal';
  modal.className = 'cookie-modal-backdrop';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'cookieModalTitle');

  modal.innerHTML = `
    <div class="cookie-modal-card">
      <div class="cookie-modal-header">
        <h3 id="cookieModalTitle">Centro de Preferencias de Cookies</h3>
        <button type="button" class="cookie-modal-close" id="btnCloseCookieModal" aria-label="Cerrar modal">&times;</button>
      </div>
      <div class="cookie-modal-body">
        <p class="cookie-modal-intro">
          Gestiona tus opciones de consentimiento conforme al Reglamento General de Protección de Datos (RGPD) y la LSSI-CE. Puedes modificar estas elecciones en cualquier momento desde el pie de página.
        </p>

        <div class="cookie-category-item">
          <div class="cookie-category-header">
            <div>
              <strong>Cookies Técnicas y Estrictamente Necesarias</strong>
              <span class="cookie-badge-required">Siempre activas</span>
            </div>
            <input type="checkbox" checked disabled aria-label="Cookies técnicas obligatorias" />
          </div>
          <p class="cookie-category-desc">
            Imprescindibles para que la web funcione, mantener la seguridad y recordar tu configuración de cookies. No pueden desactivarse en nuestros sistemas.
          </p>
        </div>

        <div class="cookie-category-item">
          <div class="cookie-category-header">
            <div>
              <strong>Cookies Analíticas y de Rendimiento</strong>
              <span class="cookie-badge-optional">Opcionales</span>
            </div>
            <label class="switch-toggle" for="toggleAnalytics">
              <input type="checkbox" id="toggleAnalytics" ${current.analytics ? 'checked' : ''} />
              <span class="slider"></span>
            </label>
          </div>
          <p class="cookie-category-desc">
            Nos permiten contabilizar las visitas y fuentes de navegación mediante PostHog Cloud (servidores en la UE) para medir y mejorar el rendimiento de la plataforma. Ninguna información se comparte con redes sociales para publicidad cruzada.
          </p>
        </div>
      </div>
      <div class="cookie-modal-footer">
        <button type="button" class="btn btn-cookie-reject" id="btnModalRejectAll">Rechazar todas</button>
        <button type="button" class="btn btn-cookie-accept" id="btnModalSavePrefs">Guardar preferencias</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => {
    modal.classList.add('cookie-modal-hidden');
    setTimeout(() => modal.remove(), 200);
  };

  document.getElementById('btnCloseCookieModal').addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });

  document.getElementById('btnModalRejectAll').addEventListener('click', () => {
    saveConsentPreferences({ necessary: true, analytics: false });
    close();
  });

  document.getElementById('btnModalSavePrefs').addEventListener('click', () => {
    const analytics = document.getElementById('toggleAnalytics').checked;
    saveConsentPreferences({ necessary: true, analytics });
    close();
  });
}

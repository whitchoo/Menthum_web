/**
 * Menthum Web — Servicio de Telemetría (PostHog & Telegram Alert)
 * Integrado con el ecosistema de analítica de Menthum e Itaro.
 */
import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || 'phc_zRJGsijqd5op98kwcbkFb7CfhUtyjmjjrYBfzRdB57DR';
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com';
const POSTHOG_ENV_TAG = import.meta.env.VITE_POSTHOG_ENV_TAG || 'landing_menthum';
const POSTHOG_DEBUG = import.meta.env.VITE_POSTHOG_DEBUG === 'true';

const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID || '';

let isInitialized = false;

/**
 * Inicializa PostHog en la landing con session replay y autocapture.
 */
export function initTelemetry() {
  if (typeof window === 'undefined' || isInitialized) return;

  if (POSTHOG_KEY) {
    try {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        autocapture: true,
        capture_pageview: true,
        capture_pageleave: true,
        disable_session_recording: false,
        session_recording: {
          maskAllInputs: false,
          maskInputOptions: {
            password: true
          }
        },
        loaded: (ph) => {
          if (POSTHOG_DEBUG) {
            console.log('[Telemetry] PostHog inicializado con éxito en Menthum Web. Host:', POSTHOG_HOST);
          }
          ph.register({
            environment: POSTHOG_ENV_TAG,
            product: 'menthum_landing',
            brand: 'itaro'
          });
        }
      });
      isInitialized = true;
    } catch (err) {
      console.warn('[Telemetry] Error inicializando PostHog SDK:', err);
    }
  } else {
    console.warn('[Telemetry] No se encontró VITE_POSTHOG_KEY en entorno.');
  }
}

/**
 * Captura un evento personalizado en PostHog con contexto enriquecido.
 */
export function trackEvent(eventName, properties = {}) {
  const payload = {
    ...properties,
    landing_version: 'v1.0-prelaunch',
    timestamp: new Date().toISOString()
  };

  if (typeof posthog !== 'undefined' && posthog.__loaded) {
    posthog.capture(eventName, payload);
    if (POSTHOG_DEBUG) {
      console.log(`[Telemetry Event] ${eventName}:`, payload);
    }
  } else if (POSTHOG_DEBUG) {
    console.log(`[Telemetry Mock] ${eventName}:`, payload);
  }
}

/**
 * Identifica al usuario en PostHog tras completar la waitlist.
 */
export function identifyLead(email, traits = {}) {
  if (typeof posthog !== 'undefined' && posthog.__loaded) {
    posthog.identify(email, {
      ...traits,
      identified_at: new Date().toISOString()
    });
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Envío de notificación a Telegram (como respaldo / alerta en tiempo real).
 */
export async function notifyTelegram(lead) {
  const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
  const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('[Telegram] Bot token o chat ID no disponibles.');
    return false;
  }

  const roleLabels = {
    coach: 'Coach / Entrenador',
    psicologo: 'Psicólogo Deportivo',
    deportista: 'Deportista',
    padre_tutor: 'Padre / Madre / Tutor',
    club_institucion: 'Club / Academia',
    otro: 'Otro'
  };

  const roleName = roleLabels[lead.role] || lead.role || 'No especificado';

  let message = `🚀 <b>Nuevo Registro de Lanzamiento — Menthum</b>\n\n` +
    `👤 <b>Nombre:</b> ${escapeHtml(lead.name || 'Sin nombre')}\n` +
    `💼 <b>Rol:</b> ${escapeHtml(roleName)}\n` +
    `📧 <b>Email:</b> <code>${escapeHtml(lead.email)}</code>\n` +
    `📱 <b>Teléfono:</b> ${escapeHtml(lead.phone || 'No aportado')}\n` +
    `🕒 <b>Fecha:</b> ${new Date().toLocaleString('es-ES')}`;

  if (lead.message) {
    message += `\n\n📝 <b>Situación / Necesidad:</b>\n${escapeHtml(lead.message)}`;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });
    const result = await res.json();
    if (!res.ok) {
      console.error('[Telegram Alert API Error]', result);
    } else if (POSTHOG_DEBUG) {
      console.log('[Telegram Alert Sent Successfully]', result);
    }
    return res.ok;
  } catch (err) {
    console.error('[Telegram Network/CORS Error]', err);
    return false;
  }
}

/**
 * Persistencia de seguridad en LocalStorage (anti adblockers).
 */
export function saveLeadLocally(lead) {
  try {
    const storageKey = 'menthum_waitlist_leads';
    const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
    existing.push({
      ...lead,
      captured_at: new Date().toISOString()
    });
    localStorage.setItem(storageKey, JSON.stringify(existing));
    return true;
  } catch (err) {
    console.warn('[Storage Error] No se pudo guardar el lead localmente:', err);
    return false;
  }
}

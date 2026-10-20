/**
 * Menthum Web — Main Application Script
 * Telemetría PostHog, Video Hero Controls, y Formulario de Lista de Espera.
 */
import { initTelemetry, trackEvent, identifyLead, notifyTelegram, saveLeadLocally } from './telemetry.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Inicializar Telemetría PostHog
  initTelemetry();

  // 2. Configurar año actual en el footer
  const yearEl = document.getElementById('currentYear');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // 3. Control del Video Hero y Escenas de IA
  setupHeroVideo();

  // 4. Configurar Selector de Roles e Interacciones de Formulario
  setupRoleSelector();

  // 5. Configurar Envío de Formulario Waitlist con PostHog + Fallbacks
  setupWaitlistForm();

  // 6. Telemetría de Exploración (Scroll Depth, CTAs y Tiempo de Lectura)
  setupExplorationTelemetry();
});

/**
 * Control del Video Hero: Reproducción fluida en bucle automático y silencioso.
 */
function setupHeroVideo() {
  const video = document.getElementById('heroVideo');
  if (!video) return;

  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playbackRate = 1.0;

  const heroWrapper = document.querySelector('.hero-video-wrapper');
  if (heroWrapper) {
    heroWrapper.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  const markPlaying = () => {
    video.classList.add('is-playing');
  };

  video.addEventListener('playing', markPlaying, { once: true });
  const onTimeUpdate = () => {
    if (video.currentTime > 0.05) {
      markPlaying();
      video.removeEventListener('timeupdate', onTimeUpdate);
    }
  };
  video.addEventListener('timeupdate', onTimeUpdate);

  const playVideo = () => {
    video.play().then(markPlaying).catch((err) => {
      console.log('[Hero Video Autoplay Note] Esperando interacción para iniciar video:', err);
      const startOnInteraction = () => {
        video.play().then(markPlaying);
        window.removeEventListener('click', startOnInteraction);
        window.removeEventListener('touchstart', startOnInteraction);
        window.removeEventListener('scroll', startOnInteraction);
      };
      window.addEventListener('click', startOnInteraction, { passive: true });
      window.addEventListener('touchstart', startOnInteraction, { passive: true });
      window.addEventListener('scroll', startOnInteraction, { passive: true });
    });
  };

  if (video.readyState >= 3) {
    playVideo();
  } else {
    video.addEventListener('canplay', playVideo, { once: true });
    video.addEventListener('loadeddata', playVideo, { once: true });
  }

  // Si la pestaña vuelve al primer plano, reanudar si se pausó
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && video.paused) {
      video.play().then(markPlaying).catch(() => {});
    }
  });
}

/**
 * Configuración visual del selector de rol.
 */
function setupRoleSelector() {
  const radioLabels = document.querySelectorAll('.role-radio-label');
  radioLabels.forEach((label) => {
    const radio = label.querySelector('input[type="radio"]');
    if (radio) {
      radio.addEventListener('change', () => {
        radioLabels.forEach(l => l.classList.remove('active'));
        if (radio.checked) {
          label.classList.add('active');
          trackEvent('waitlist_role_selected', {
            selected_role: radio.value
          });
        }
      });
    }
  });
}

/**
 * Gestión del envío de formulario con registro completo a PostHog, Telegram y LocalStorage.
 */
function setupWaitlistForm() {
  const form = document.getElementById('waitlistForm');
  const submitBtn = document.getElementById('submitWaitlistBtn');
  const btnText = submitBtn?.querySelector('.btn-text');
  const btnSpinner = submitBtn?.querySelector('.btn-spinner');
  const successState = document.getElementById('waitlistSuccessState');
  const successLeadName = document.getElementById('successLeadName');
  const successTicketCode = document.getElementById('successTicketCode');

  if (!form) return;

  // Track cuando el usuario empieza a interactuar con los campos
  form.addEventListener('focusin', (e) => {
    if (e.target.name) {
      trackEvent('form_field_focused', { field: e.target.name });
    }
  }, { once: true });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validación básica de campos
    if (!form.checkValidity()) {
      form.reportValidity();
      trackEvent('waitlist_validation_failed');
      return;
    }

    const formData = new FormData(form);
    const leadData = {
      role: formData.get('role') || 'otro',
      name: (formData.get('name') || '').trim(),
      email: (formData.get('email') || '').trim().toLowerCase(),
      phone: (formData.get('phone') || '').trim(),
      message: (formData.get('message') || '').trim(),
      submitted_at: new Date().toISOString(),
      referrer: document.referrer || 'direct',
      user_agent: navigator.userAgent
    };

    // Estado visual de carga
    if (submitBtn) submitBtn.disabled = true;
    if (btnText) btnText.textContent = 'Guardando tus datos...';
    if (btnSpinner) btnSpinner.style.display = 'inline-block';

    try {
      // 1. Envío a PostHog Telemetría (Evento Central)
      trackEvent('waitlist_submitted', {
        role: leadData.role,
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone,
        message: leadData.message || null,
        has_message: Boolean(leadData.message),
        lead_priority: leadData.role === 'coach' || leadData.role === 'psicologo' ? 'high' : 'standard'
      });

      // 2. Identificar el usuario en PostHog con sus propiedades
      identifyLead(leadData.email, {
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone,
        role: leadData.role,
        situation_message: leadData.message || null,
        is_waitlist_lead: true
      });

      // 3. Respaldo secundario en LocalStorage (anti-adblockers)
      saveLeadLocally(leadData);

      // 4. Notificación instantánea opcional por Telegram Bot
      await notifyTelegram(leadData);

      // 5. Transición visual al estado de éxito honesto y claro
      form.style.display = 'none';
      if (successLeadName) successLeadName.textContent = leadData.name.split(' ')[0] || 'Deportista';
      if (successState) {
        successState.style.display = 'block';
        successState.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      trackEvent('waitlist_success_viewed');
    } catch (err) {
      console.error('[Waitlist Submission Error]', err);
      trackEvent('waitlist_submission_error', { error: err.message });
      alert('Hubo un inconveniente al procesar tu solicitud. Por favor inténtalo nuevamente.');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (btnText) btnText.textContent = 'Avisadme Cuando Esté Disponible';
      if (btnSpinner) btnSpinner.style.display = 'none';
    }
  });
}

/**
 * Telemetría completa de navegación y exploración del portal.
 */
function setupExplorationTelemetry() {
  // Tracking de Scroll Depth (25%, 50%, 75%, 100%)
  const scrollMilestones = { 25: false, 50: false, 75: false, 100: false };

  window.addEventListener('scroll', () => {
    const scrollPosition = window.scrollY + window.innerHeight;
    const totalHeight = document.documentElement.scrollHeight;
    const percentScrolled = Math.round((scrollPosition / totalHeight) * 100);

    [25, 50, 75, 100].forEach((milestone) => {
      if (percentScrolled >= milestone && !scrollMilestones[milestone]) {
        scrollMilestones[milestone] = true;
        trackEvent('scroll_depth_reached', { depth_percent: milestone });
      }
    });
  }, { passive: true });

  // Tracking de clics en todos los enlaces y CTAs
  document.querySelectorAll('a, button').forEach((el) => {
    el.addEventListener('click', () => {
      const targetId = el.id || el.getAttribute('href') || el.innerText.trim();
      trackEvent('interaction_click', {
        element_id: targetId,
        element_tag: el.tagName.toLowerCase(),
        element_text: (el.innerText || '').slice(0, 30).trim()
      });
    });
  });

  // Tracking de tiempo de permanencia (30s, 60s, 120s)
  const durations = [30, 60, 120];
  durations.forEach((secs) => {
    setTimeout(() => {
      trackEvent('time_on_page', { seconds: secs });
    }, secs * 1000);
  });
}

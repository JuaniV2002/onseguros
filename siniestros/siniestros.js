/**
 * Siniestro (Car Accident) Form Handler
 * Validates the form and opens WhatsApp with the report prefilled for Mariano.
 * Photos are attached by the client in the WhatsApp chat (no upload here).
 */

(function () {
    'use strict';

    const form = document.getElementById('siniestro-form');
    if (!form) return;

    const successEl = document.getElementById('form-success');
    const denunciaGroup = document.getElementById('numero-denuncia-group');
    const denunciaRadios = form.querySelectorAll('input[name="Denuncia_Policial"]');
    const fallbackLink = document.getElementById('whatsapp-fallback-link');

    const WHATSAPP_NUMBER = '543584921111';

    // ------------------------------------------------------------------
    // Toggle police report number field
    // ------------------------------------------------------------------
    denunciaRadios.forEach(function (radio) {
        radio.addEventListener('change', function () {
            const show = this.value === 'Sí';
            denunciaGroup.hidden = !show;
            const input = document.getElementById('numero-denuncia');
            if (show) {
                input.focus();
            } else {
                input.value = '';
            }
        });
    });

    // ------------------------------------------------------------------
    // Validation helpers
    // ------------------------------------------------------------------
    function setFieldError(inputId, errorId, message) {
        const input = document.getElementById(inputId);
        const errorDiv = document.getElementById(errorId);
        if (!input || !errorDiv) return;
        input.classList.add('error');
        errorDiv.textContent = message;
    }

    function clearFieldError(input) {
        input.classList.remove('error');
        const errorId = input.getAttribute('aria-describedby');
        if (errorId) {
            const errorDiv = document.getElementById(errorId);
            if (errorDiv) errorDiv.textContent = '';
        }
    }

    // Clear errors on input
    form.querySelectorAll('.form-input').forEach(function (input) {
        input.addEventListener('input', function () {
            clearFieldError(this);
        });
        input.addEventListener('change', function () {
            clearFieldError(this);
        });
    });

    function validateForm() {
        let valid = true;

        // Nombre
        const nombre = document.getElementById('nombre');
        if (!nombre.value.trim()) {
            setFieldError('nombre', 'nombre-error', 'Por favor ingresá tu nombre completo.');
            valid = false;
        }

        // Teléfono
        const telefono = document.getElementById('telefono');
        if (!telefono.value.trim()) {
            setFieldError('telefono', 'telefono-error', 'Por favor ingresá tu teléfono de contacto.');
            valid = false;
        }

        // Email (optional, but must be valid if filled)
        const email = document.getElementById('email');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email.value.trim() && !emailRegex.test(email.value.trim())) {
            setFieldError('email', 'email-error', 'Por favor ingresá un email válido.');
            valid = false;
        }

        // Patente
        const patente = document.getElementById('patente');
        if (!patente.value.trim()) {
            setFieldError('patente', 'patente-error', 'Por favor ingresá la patente del vehículo.');
            valid = false;
        }

        // Fecha del accidente
        const fechaSiniestro = document.getElementById('fecha-siniestro');
        if (!fechaSiniestro.value) {
            setFieldError('fecha-siniestro', 'fecha-siniestro-error', 'Por favor ingresá la fecha del accidente.');
            valid = false;
        } else {
            const selectedDate = new Date(fechaSiniestro.value);
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            if (selectedDate > today) {
                setFieldError('fecha-siniestro', 'fecha-siniestro-error', 'La fecha no puede ser futura.');
                valid = false;
            }
        }

        // Descripción
        const descripcion = document.getElementById('descripcion');
        if (!descripcion.value.trim() || descripcion.value.trim().length < 20) {
            setFieldError('descripcion', 'descripcion-error', 'Por favor describí el accidente (mínimo 20 caracteres).');
            valid = false;
        }

        return valid;
    }

    // ------------------------------------------------------------------
    // WhatsApp message
    // ------------------------------------------------------------------
    function fieldValue(id) {
        const el = document.getElementById(id);
        return el ? el.value.trim() : '';
    }

    // "2026-10-12" -> "12/10/2026"
    function formatDate(isoDate) {
        const parts = isoDate.split('-');
        return parts.length === 3 ? parts[2] + '/' + parts[1] + '/' + parts[0] : isoDate;
    }

    // Builds one "*Title*" block with only the filled lines; '' if all empty
    function buildGroup(title, rows) {
        const lines = rows
            .filter(function (row) { return row[1]; })
            .map(function (row) { return row[0] + ': ' + row[1]; });
        return lines.length ? '*' + title + '*\n' + lines.join('\n') : '';
    }

    function buildWhatsAppMessage() {
        const denuncia = (form.querySelector('input[name="Denuncia_Policial"]:checked') || {}).value || 'No';
        const numeroDenuncia = fieldValue('numero-denuncia');
        const fecha = fieldValue('fecha-siniestro');

        const groups = [
            buildGroup('Datos personales', [
                ['Nombre', fieldValue('nombre')],
                ['Teléfono', fieldValue('telefono')],
                ['Email', fieldValue('email')],
                ['DNI', fieldValue('dni')],
            ]),
            buildGroup('Vehículo', [
                ['Patente', fieldValue('patente').toUpperCase()],
                ['Marca y modelo', fieldValue('marca-modelo')],
                ['Aseguradora', fieldValue('aseguradora')],
                ['N° de póliza', fieldValue('numero-poliza')],
            ]),
            buildGroup('Siniestro', [
                ['Fecha', fecha ? formatDate(fecha) : ''],
                ['Hora', fieldValue('hora-siniestro')],
                ['Lugar', fieldValue('lugar-siniestro')],
                ['Denuncia policial', denuncia === 'Sí' && numeroDenuncia ? 'Sí (N° ' + numeroDenuncia + ')' : denuncia],
                ['Descripción', fieldValue('descripcion')],
            ]),
            buildGroup('Tercero involucrado', [
                ['Nombre', fieldValue('tercero-nombre')],
                ['Teléfono', fieldValue('tercero-telefono')],
                ['Patente', fieldValue('tercero-patente').toUpperCase()],
                ['Aseguradora', fieldValue('tercero-aseguradora')],
            ]),
        ].filter(Boolean);

        return '¡Hola Mariano! Quiero denunciar un siniestro.\n\n' + groups.join('\n\n');
    }

    // ------------------------------------------------------------------
    // Form submission
    // ------------------------------------------------------------------
    form.addEventListener('submit', function (e) {
        e.preventDefault();

        // Hide previous confirmation
        successEl.hidden = true;

        if (!validateForm()) {
            // Scroll to first error
            const firstError = form.querySelector('.error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstError.focus();
            }
            return;
        }

        const url = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(buildWhatsAppMessage());

        // Open synchronously inside the submit handler so mobile browsers and
        // popup blockers treat it as a user gesture.
        window.open(url, '_blank', 'noopener');

        if (fallbackLink) fallbackLink.href = url;
        successEl.hidden = false;
        successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    // ------------------------------------------------------------------
    // Set max date for date input (today)
    // ------------------------------------------------------------------
    const fechaInput = document.getElementById('fecha-siniestro');
    if (fechaInput) {
        const today = new Date().toISOString().split('T')[0];
        fechaInput.setAttribute('max', today);
    }
})();


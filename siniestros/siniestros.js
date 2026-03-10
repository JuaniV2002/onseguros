/**
 * Siniestro (Car Accident) Form Handler
 * Validates, submits to the Supabase Edge Function, and manages UI state.
 * Includes direct-to-Supabase-Storage photo upload before form submission.
 */

(function () {
    'use strict';

    const form = document.getElementById('siniestro-form');
    if (!form) return;

    const submitBtn = document.getElementById('submit-btn');
    const successEl = document.getElementById('form-success');
    const errorEl = document.getElementById('form-error-msg');
    const denunciaGroup = document.getElementById('numero-denuncia-group');
    const denunciaRadios = form.querySelectorAll('input[name="Denuncia_Policial"]');

    // ------------------------------------------------------------------
    // Photo upload state
    // ------------------------------------------------------------------
    const MAX_PHOTOS = 5;
    const MAX_SIZE_MB = 5;

    let selectedFiles = []; // Array of File objects

    const dropZone      = document.getElementById('photo-drop-zone');
    const fileInput     = document.getElementById('fotos-input');
    const previewGrid   = document.getElementById('photo-preview-grid');
    const photoError    = document.getElementById('photo-error');
    const uploadStatus  = document.getElementById('photo-upload-status');

    function setPhotoError(msg) {
        if (!photoError) return;
        photoError.textContent = msg;
    }

    function clearPhotoError() {
        if (photoError) photoError.textContent = '';
    }

    function showUploadStatus(msg) {
        if (!uploadStatus) return;
        uploadStatus.textContent = msg;
        uploadStatus.hidden = false;
    }

    function hideUploadStatus() {
        if (uploadStatus) uploadStatus.hidden = true;
    }

    function addFiles(newFiles) {
        clearPhotoError();
        const combined = [...selectedFiles];

        for (const file of newFiles) {
            if (combined.length >= MAX_PHOTOS) {
                setPhotoError('Máximo ' + MAX_PHOTOS + ' fotos permitidas.');
                break;
            }
            if (!file.type.startsWith('image/')) {
                setPhotoError('Sólo se permiten imágenes.');
                continue;
            }
            if (file.size > MAX_SIZE_MB * 1024 * 1024) {
                setPhotoError('Cada foto debe pesar menos de ' + MAX_SIZE_MB + ' MB. "' + file.name + '" es demasiado grande.');
                continue;
            }
            // Avoid duplicates by name+size
            const isDupe = combined.some(function (f) { return f.name === file.name && f.size === file.size; });
            if (!isDupe) combined.push(file);
        }

        selectedFiles = combined;
        renderPreviews();
    }

    function removeFile(index) {
        selectedFiles.splice(index, 1);
        clearPhotoError();
        renderPreviews();
    }

    function renderPreviews() {
        if (!previewGrid) return;

        if (selectedFiles.length === 0) {
            previewGrid.hidden = true;
            previewGrid.innerHTML = '';
            if (dropZone) dropZone.classList.remove('is-has-files');
            return;
        }

        previewGrid.hidden = false;
        if (dropZone) dropZone.classList.add('is-has-files');
        previewGrid.innerHTML = '';

        selectedFiles.forEach(function (file, i) {
            const url = URL.createObjectURL(file);
            const item = document.createElement('div');
            item.className = 'photo-preview-item';
            item.innerHTML =
                '<img src="' + url + '" alt="Foto ' + (i + 1) + '" loading="lazy">' +
                '<button type="button" class="photo-preview-item__remove" aria-label="Eliminar foto ' + (i + 1) + '">&#x2715;</button>';

            item.querySelector('button').addEventListener('click', function (e) {
                e.stopPropagation();
                URL.revokeObjectURL(url);
                removeFile(i);
            });

            previewGrid.appendChild(item);
        });

        // Update drop zone to show "add more" info
        const idleEl = document.getElementById('photo-drop-idle');
        if (idleEl) {
            idleEl.innerHTML =
                '<span style="font-size:var(--font-size-sm);color:var(--text-secondary)">' +
                selectedFiles.length + ' / ' + MAX_PHOTOS + ' fotos seleccionadas</span>' +
                (selectedFiles.length < MAX_PHOTOS
                    ? '<span style="font-size:var(--font-size-sm);color:var(--primary-600);font-weight:500">+ Agregar más</span>'
                    : '');
        }
    }

    // Wire up file input
    if (fileInput) {
        fileInput.addEventListener('change', function () {
            if (this.files && this.files.length) addFiles(Array.from(this.files));
            this.value = ''; // reset so same file can be re-added after removal
        });
    }

    // Drag & drop
    if (dropZone) {
        dropZone.addEventListener('click', function (e) {
            if (e.target === dropZone || e.target.closest('.photo-drop-zone__idle') || e.target.closest('.photo-drop-zone__dragover')) {
                fileInput && fileInput.click();
            }
        });

        dropZone.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInput && fileInput.click();
            }
        });

        dropZone.addEventListener('dragover', function (e) {
            e.preventDefault();
            this.classList.add('is-dragover');
        });

        dropZone.addEventListener('dragleave', function (e) {
            if (!this.contains(e.relatedTarget)) this.classList.remove('is-dragover');
        });

        dropZone.addEventListener('drop', function (e) {
            e.preventDefault();
            this.classList.remove('is-dragover');
            if (e.dataTransfer.files && e.dataTransfer.files.length) {
                addFiles(Array.from(e.dataTransfer.files));
            }
        });
    }

    // ------------------------------------------------------------------
    // Upload photos to Supabase Storage, return array of public URLs
    // ------------------------------------------------------------------
    async function uploadPhotos(supabaseUrl, anonKey) {
        if (selectedFiles.length === 0) return [];

        const uploadedUrls = [];
        // Use a unique folder per submission to avoid conflicts
        const folder = Date.now() + '-' + Math.random().toString(36).slice(2, 8);

        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            const ext = file.name.split('.').pop() || 'jpg';
            const path = folder + '/' + (i + 1) + '-' + Date.now() + '.' + ext;
            const uploadUrl = supabaseUrl + '/storage/v1/object/siniestros-fotos/' + path;

            showUploadStatus('Subiendo foto ' + (i + 1) + ' de ' + selectedFiles.length + '…');

            // Mark thumbnail as uploading
            const thumbs = previewGrid ? previewGrid.querySelectorAll('.photo-preview-item') : [];
            if (thumbs[i]) {
                const overlay = document.createElement('div');
                overlay.className = 'photo-preview-item__uploading';
                thumbs[i].appendChild(overlay);
            }

            const res = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + anonKey,
                    'Content-Type': file.type || 'image/jpeg',
                    'x-upsert': 'false',
                },
                body: file,
            });

            // Remove overlay
            if (thumbs[i]) {
                const overlay = thumbs[i].querySelector('.photo-preview-item__uploading');
                if (overlay) overlay.remove();
            }

            if (!res.ok) {
                const errData = await res.json().catch(function () { return {}; });
                throw new Error('Error al subir foto ' + (i + 1) + ': ' + (errData.error || res.status));
            }

            const publicUrl = supabaseUrl + '/storage/v1/object/public/siniestros-fotos/' + path;
            uploadedUrls.push(publicUrl);
        }

        hideUploadStatus();
        return uploadedUrls;
    }

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

        // Email
        const email = document.getElementById('email');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.value.trim() || !emailRegex.test(email.value.trim())) {
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
    // Form submission
    // ------------------------------------------------------------------
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Hide previous messages
        successEl.hidden = true;
        errorEl.hidden = true;

        if (!validateForm()) {
            // Scroll to first error
            const firstError = form.querySelector('.error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstError.focus();
            }
            return;
        }

        // Loading state
        submitBtn.disabled = true;
        const originalHTML = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span>Enviando…</span>';
        form.classList.add('is-submitting');

        try {
            const config = await window.envConfig.load();
            const apiUrl = config.SUBMIT_SINIESTRO_API_URL;
            const supabaseUrl = config.SUPABASE_URL;
            const anonKey = config.SUPABASE_ANON_KEY;

            // 1. Upload photos first (if any)
            let fotosUrls = [];
            if (selectedFiles.length > 0) {
                submitBtn.innerHTML = '<span>Subiendo fotos…</span>';
                fotosUrls = await uploadPhotos(supabaseUrl, anonKey);
            }

            submitBtn.innerHTML = '<span>Enviando…</span>';

            // 2. Submit form data with photo URLs
            const payload = {
                nombre:           document.getElementById('nombre').value.trim(),
                telefono:         document.getElementById('telefono').value.trim(),
                email:            document.getElementById('email').value.trim(),
                dni:              document.getElementById('dni').value.trim() || null,
                patente:          document.getElementById('patente').value.trim(),
                marca_modelo:     document.getElementById('marca-modelo').value.trim() || null,
                aseguradora:      document.getElementById('aseguradora').value.trim() || null,
                numero_poliza:    document.getElementById('numero-poliza').value.trim() || null,
                fecha_siniestro:  document.getElementById('fecha-siniestro').value,
                hora_siniestro:   document.getElementById('hora-siniestro').value || null,
                lugar_siniestro:  document.getElementById('lugar-siniestro').value.trim() || null,
                denuncia_policial: (form.querySelector('input[name="Denuncia_Policial"]:checked') || {}).value || 'No',
                numero_denuncia:  document.getElementById('numero-denuncia').value.trim() || null,
                descripcion:      document.getElementById('descripcion').value.trim(),
                tercero_nombre:       document.getElementById('tercero-nombre').value.trim() || null,
                tercero_telefono:     document.getElementById('tercero-telefono').value.trim() || null,
                tercero_patente:      document.getElementById('tercero-patente').value.trim() || null,
                tercero_aseguradora:  document.getElementById('tercero-aseguradora').value.trim() || null,
                fotos:            fotosUrls,
            };

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + anonKey,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json().catch(function () { return {}; });

            if (response.ok && data.success) {
                successEl.hidden = false;
                successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

                form.querySelectorAll('input, select, textarea, button').forEach(function (el) {
                    el.disabled = true;
                });
                submitBtn.style.display = 'none';
            } else {
                const msg = data.error || 'Hubo un error al enviar la denuncia. Por favor intentá nuevamente o contactanos directamente.';
                errorEl.textContent = msg;
                errorEl.hidden = false;
                errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } catch (err) {
            hideUploadStatus();
            const msg = err.message && err.message.startsWith('Error al subir')
                ? err.message + '. Podés intentar con fotos más pequeñas o enviar la denuncia sin fotos.'
                : 'No se pudo enviar la denuncia. Verificá tu conexión e intentá nuevamente.';
            errorEl.textContent = msg;
            errorEl.hidden = false;
            errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHTML;
            form.classList.remove('is-submitting');
        }
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


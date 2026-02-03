/**
 * Accordion Component
 * Handles accordion expand/collapse functionality
 */

class Accordion {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        if (!this.container) return;
        
        this.init();
    }

    init() {
        // Add click listeners to all accordion questions
        const questions = this.container.querySelectorAll('.accordion-question');
        questions.forEach(question => {
            question.addEventListener('click', () => this.toggle(question));
        });
    }

    toggle(question) {
        const item = question.closest('.accordion-item');
        const wasActive = item.classList.contains('active');

        // Close all items
        this.container.querySelectorAll('.accordion-item').forEach(i => {
            i.classList.remove('active');
            const btn = i.querySelector('.accordion-question');
            if (btn) btn.setAttribute('aria-expanded', 'false');
        });

        // Open clicked item if it wasn't active
        if (!wasActive) {
            item.classList.add('active');
            question.setAttribute('aria-expanded', 'true');
        }
    }
}

// Expose Accordion class globally
window.Accordion = Accordion;

// Initialize accordion when DOM is ready (only if not FAQ page)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Don't auto-initialize on FAQ page - let the FAQ script handle it
        if (!document.querySelector('.faq-page')) {
            new Accordion('.accordion-list');
        }
    });
} else {
    // Don't auto-initialize on FAQ page - let the FAQ script handle it
    if (!document.querySelector('.faq-page')) {
        new Accordion('.accordion-list');
    }
}

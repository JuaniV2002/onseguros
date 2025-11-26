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

// Initialize accordion when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new Accordion('.accordion-list');
    });
} else {
    new Accordion('.accordion-list');
}

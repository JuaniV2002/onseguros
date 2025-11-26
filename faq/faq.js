/**
 * FAQ Page JavaScript
 * Handles search filtering for accordion items
 */

document.addEventListener('DOMContentLoaded', function() {
    const accordionItems = document.querySelectorAll('.accordion-item');
    const searchInput = document.getElementById('faq-search');
    const noResults = document.getElementById('no-results');

    // Search functionality
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        let hasResults = false;

        accordionItems.forEach(item => {
            const questionText = item.querySelector('.accordion-question span').textContent.toLowerCase();
            const answerText = item.querySelector('.accordion-answer__content').textContent.toLowerCase();
            
            if (questionText.includes(searchTerm) || answerText.includes(searchTerm)) {
                item.style.display = 'block';
                hasResults = true;
            } else {
                item.style.display = 'none';
                item.classList.remove('active');
            }
        });

        // Show/hide no results message
        if (searchTerm && !hasResults) {
            noResults.classList.add('visible');
        } else {
            noResults.classList.remove('visible');
        }
    });
});

/**
 * OnSeguros Insurance Website JavaScript
 * Modern, accessible, and performance-optimized code
 */

'use strict';

// ==========================================================================
// Theme Toggle Component
// ==========================================================================

class ThemeToggle {
    constructor() {
        this.toggle = document.getElementById('theme-toggle-checkbox');
        this.sunIcon = document.querySelector('.theme-toggle__icon--sun');
        this.moonIcon = document.querySelector('.theme-toggle__icon--moon');
        this.storageKey = 'onseguros-theme';
        
        if (!this.toggle) return;
        
        this.init();
    }

    init() {
        // Always use system preference
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (systemPrefersDark) {
            this.enableDarkMode(false); // false = don't save to localStorage
        } else {
            this.enableLightMode(false);
        }

        // Listen for toggle changes (optional - you can remove this if you don't want manual toggle)
        this.toggle.addEventListener('change', () => {
            if (this.toggle.checked) {
                this.enableDarkMode(false);
            } else {
                this.enableLightMode(false);
            }
        });

        // Listen for system theme changes and automatically switch
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (e.matches) {
                this.enableDarkMode(false);
            } else {
                this.enableLightMode(false);
            }
        });
    }

    enableDarkMode(saveToStorage = false) {
        document.documentElement.setAttribute('data-theme', 'dark');
        this.toggle.checked = true;
        if (saveToStorage) {
            localStorage.setItem(this.storageKey, 'dark');
        }
        this.updateIcons(true);
        
        // Update header background
        this.updateNavigationHeader();
        
        // Announce to screen readers
        this.announceThemeChange('Modo oscuro activado');
    }

    enableLightMode(saveToStorage = false) {
        document.documentElement.setAttribute('data-theme', 'light');
        this.toggle.checked = false;
        if (saveToStorage) {
            localStorage.setItem(this.storageKey, 'light');
        }
        this.updateIcons(false);
        
        // Update header background
        this.updateNavigationHeader();
        
        // Announce to screen readers
        this.announceThemeChange('Modo claro activado');
    }

    updateNavigationHeader() {
        // Trigger header background update after theme change
        setTimeout(() => {
            const event = new Event('scroll');
            window.dispatchEvent(event);
        }, 50);
    }

    updateIcons(isDark) {
        if (this.sunIcon && this.moonIcon) {
            if (isDark) {
                this.sunIcon.classList.remove('theme-toggle__icon--active');
                this.moonIcon.classList.add('theme-toggle__icon--active');
            } else {
                this.sunIcon.classList.add('theme-toggle__icon--active');
                this.moonIcon.classList.remove('theme-toggle__icon--active');
            }
        }
    }

    announceThemeChange(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }
}

// ==========================================================================
// Performance & Accessibility Utilities
// ==========================================================================

/**
 * Utility functions for performance and accessibility
 */
const Utils = {
    // Debounce function for performance optimization
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Throttle function for scroll events
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Intersection Observer for animations
    observeElements(elements, callback, options = {}) {
        const defaultOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver(callback, { ...defaultOptions, ...options });
        elements.forEach(element => observer.observe(element));
        return observer;
    },

    // Focus trap for modals and mobile menu
    trapFocus(element) {
        const focusableElements = element.querySelectorAll(
            'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        element.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        e.preventDefault();
                    }
                }
            }
        });
    },

    // Smooth scroll with reduced motion support
    smoothScroll(target, duration = 1000) {
        const targetElement = document.querySelector(target);
        if (!targetElement) return;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        if (prefersReducedMotion) {
            targetElement.scrollIntoView();
            return;
        }

        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - 120;
        const startPosition = window.pageYOffset;
        const distance = targetPosition - startPosition;
        let startTime = null;

        function animation(currentTime) {
            if (startTime === null) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const run = ease(timeElapsed, startPosition, distance, duration);
            window.scrollTo(0, run);
            if (timeElapsed < duration) requestAnimationFrame(animation);
        }

        function ease(t, b, c, d) {
            t /= d / 2;
            if (t < 1) return c / 2 * t * t + b;
            t--;
            return -c / 2 * (t * (t - 2) - 1) + b;
        }

        requestAnimationFrame(animation);
    }
};

// ==========================================================================
// Navigation Component
// ==========================================================================

class Navigation {
    constructor() {
        this.nav = document.querySelector('.nav');
        this.navToggle = document.querySelector('.nav__toggle');
        this.navMenu = document.querySelector('.nav__menu');
        this.navLinks = document.querySelectorAll('.nav__link');
        this.header = document.querySelector('.header');
        
        this.isMenuOpen = false;
        this.lastScrollY = window.scrollY;

        this.init();
    }

    init() {
        this.bindEvents();
        this.updateHeaderBackground();
        this.setupKeyboardNavigation();
    }

    bindEvents() {
        // Mobile menu toggle
        if (this.navToggle) {
            this.navToggle.addEventListener('click', () => this.toggleMobileMenu());
        }

        // Smooth scroll for navigation links
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => this.handleNavClick(e));
        });

        // Scroll behavior
        window.addEventListener('scroll', Utils.throttle(() => this.handleScroll(), 100));

        // Close mobile menu on window resize
        window.addEventListener('resize', Utils.debounce(() => this.handleResize(), 250));

        // Close mobile menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMenuOpen) {
                this.closeMobileMenu();
            }
        });
    }

    updateHeaderBackground() {
        const currentScrollY = window.scrollY;
        
        if (currentScrollY > 50) {
            this.header.style.boxShadow = 'var(--shadow-md)';
        } else {
            this.header.style.boxShadow = 'none';
        }
    }

    toggleMobileMenu() {
        this.isMenuOpen = !this.isMenuOpen;
        
        this.navToggle.setAttribute('aria-expanded', this.isMenuOpen);
        this.navMenu.setAttribute('aria-expanded', this.isMenuOpen);
        
        // Toggle hamburger to X animation
        if (this.isMenuOpen) {
            this.navToggle.classList.add('nav__toggle--active');
        } else {
            this.navToggle.classList.remove('nav__toggle--active');
        }
        
        if (this.isMenuOpen) {
            this.openMobileMenu();
        } else {
            this.closeMobileMenu();
        }
    }

    openMobileMenu() {
        this.navMenu.style.display = 'flex';
        // Force reflow
        this.navMenu.offsetHeight;
        this.navMenu.setAttribute('aria-expanded', 'true');
        
        // Trap focus in mobile menu
        Utils.trapFocus(this.navMenu);
        
        // Focus first menu item
        const firstLink = this.navMenu.querySelector('.nav__link');
        if (firstLink) firstLink.focus();
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    closeMobileMenu() {
        this.isMenuOpen = false;
        this.navToggle.setAttribute('aria-expanded', 'false');
        this.navMenu.setAttribute('aria-expanded', 'false');
        
        // Remove X animation class
        this.navToggle.classList.remove('nav__toggle--active');
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Return focus to toggle button
        this.navToggle.focus();
    }

    handleNavClick(e) {
        const href = e.target.getAttribute('href');
        
        if (href && href.startsWith('#')) {
            e.preventDefault();
            Utils.smoothScroll(href);
            
            // Close mobile menu if open
            if (this.isMenuOpen) {
                this.closeMobileMenu();
            }
            
            // Update URL without triggering scroll
            history.pushState(null, null, href);
        }
    }

    handleScroll() {
        this.updateHeaderBackground();
        this.lastScrollY = window.scrollY;
    }

    handleResize() {
        if (window.innerWidth > 1023 && this.isMenuOpen) {
            this.closeMobileMenu();
        }
    }

    setupKeyboardNavigation() {
        this.navLinks.forEach((link, index) => {
            link.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    const nextIndex = (index + 1) % this.navLinks.length;
                    this.navLinks[nextIndex].focus();
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    const prevIndex = (index - 1 + this.navLinks.length) % this.navLinks.length;
                    this.navLinks[prevIndex].focus();
                }
            });
        });
    }
}

// ==========================================================================
// Newsletter Form Validator
// ==========================================================================

class NewsletterFormValidator {
    constructor(formSelector) {
        this.form = document.querySelector(formSelector);
        if (!this.form) return;

        this.emailField = this.form.querySelector('#newsletter-email');
        this.errorElement = this.form.querySelector('#newsletter-error');
        this.successElement = this.form.querySelector('#newsletter-success');

        this.init();
    }

    init() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Real-time validation
        if (this.emailField) {
            this.emailField.addEventListener('blur', () => this.validateEmail());
            this.emailField.addEventListener('input', Utils.debounce(() => this.validateEmail(), 300));
        }
    }

    validateEmail() {
        if (!this.emailField || !this.errorElement) return true;

        this.clearError();

        const email = this.emailField.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email) {
            this.showError('La dirección de email es requerida');
            return false;
        }

        if (!emailRegex.test(email)) {
            this.showError('Por favor ingresa una dirección de email válida');
            return false;
        }

        return true;
    }

    showError(message) {
        if (this.emailField && this.errorElement) {
            this.emailField.classList.add('error');
            this.emailField.setAttribute('aria-invalid', 'true');
            this.errorElement.textContent = message;
            this.errorElement.style.display = 'block';
        }
    }

    clearError() {
        if (this.emailField && this.errorElement) {
            this.emailField.classList.remove('error');
            this.emailField.setAttribute('aria-invalid', 'false');
            this.errorElement.textContent = '';
            this.errorElement.style.display = 'none';
        }
    }

    showSuccess() {
        if (this.successElement) {
            this.successElement.textContent = '✓ ¡Gracias! Te has suscrito al newsletter exitosamente.';
            this.successElement.style.display = 'block';
            
            setTimeout(() => {
                this.successElement.style.display = 'none';
            }, 3000);
        }
    }

    async handleSubmit(e) {
        e.preventDefault();

        this.clearError();

        if (!this.validateEmail()) {
            this.emailField.focus();
            return;
        }

        // Show loading state
        const submitButton = this.form.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Enviando...';
        submitButton.disabled = true;

        try {
            // Load Supabase configuration
            const SUPABASE_URL = window.envConfig.get('SUPABASE_URL');
            const SUPABASE_ANON_KEY = window.envConfig.get('SUPABASE_ANON_KEY');

            if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
                throw new Error('Supabase configuration not found');
            }

            // Initialize Supabase client
            const { createClient } = window.supabase;
            const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

            // Get email from form
            const email = this.emailField.value.trim();

            // Insert subscriber into database
            const { error } = await supabaseClient
                .from('subscribers')
                .insert([
                    {
                        email: email,
                        subscribed_at: new Date().toISOString(),
                        confirmed: true
                    }
                ]);

            if (error) {
                // Handle duplicate email gracefully
                if (error.code === '23505') {
                    this.showSuccess();
                } else {
                    throw error;
                }
            } else {
                // Show success message
                this.showSuccess();
            }
            
            // Reset form
            setTimeout(() => {
                this.form.reset();
            }, 1000);
            
        } catch (error) {
            console.error('Newsletter subscription error:', error);
            this.showError('Hubo un error al suscribirte. Por favor intenta nuevamente.');
        } finally {
            // Reset button state
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    }
}

// ==========================================================================
// Scroll Animations Component
// ==========================================================================

class ScrollAnimations {
    constructor() {
        this.animatedElements = document.querySelectorAll('.stats__item, .service-card, .testimonial-card');
        this.init();
    }

    init() {
        // Check if user prefers reduced motion
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        if (prefersReducedMotion) {
            // Make all elements visible immediately
            this.animatedElements.forEach(element => {
                element.style.opacity = '1';
                element.style.transform = 'none';
            });
            return;
        }

        this.setupAnimations();
    }

    setupAnimations() {
        // Add initial state
        this.animatedElements.forEach(element => {
            element.classList.add('animate-on-scroll');
        });

        // Observe elements
        Utils.observeElements(this.animatedElements, (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                }
            });
        });
    }
}

// ==========================================================================
// Accessibility Enhancements
// ==========================================================================

class AccessibilityEnhancements {
    constructor() {
        this.init();
    }

    init() {
        this.setupKeyboardNavigation();
        this.setupFocusManagement();
        this.setupScreenReaderSupport();
        this.setupColorContrastToggle();
    }

    setupKeyboardNavigation() {
        // Enhanced keyboard navigation for cards
        const interactiveCards = document.querySelectorAll('.service-card, .testimonial-card');
        
        interactiveCards.forEach(card => {
            card.setAttribute('tabindex', '0');
            card.setAttribute('role', 'article');
            
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    const link = card.querySelector('a');
                    if (link) {
                        e.preventDefault();
                        link.click();
                    }
                }
            });
        });
    }

    setupFocusManagement() {
        // Ensure focus is visible
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
            }
        });

        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-navigation');
        });
    }

    setupScreenReaderSupport() {
        // Add live region for dynamic content updates
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.style.position = 'absolute';
        liveRegion.style.left = '-10000px';
        liveRegion.style.width = '1px';
        liveRegion.style.height = '1px';
        liveRegion.style.overflow = 'hidden';
        document.body.appendChild(liveRegion);

        // Announce page sections as they come into view
        const sections = document.querySelectorAll('section[id]');
        Utils.observeElements(sections, (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const sectionTitle = entry.target.querySelector('h2');
                    if (sectionTitle) {
                        liveRegion.textContent = `Now viewing: ${sectionTitle.textContent}`;
                    }
                }
            });
        }, { threshold: 0.5 });
    }

    setupColorContrastToggle() {
        // Add high contrast mode toggle (for users who need it)
        const toggleButton = document.createElement('button');
        toggleButton.textContent = 'Toggle High Contrast';
        toggleButton.style.position = 'fixed';
        toggleButton.style.top = '10px';
        toggleButton.style.right = '10px';
        toggleButton.style.zIndex = '9999';
        toggleButton.style.padding = '8px 12px';
        toggleButton.style.backgroundColor = '#000';
        toggleButton.style.color = '#fff';
        toggleButton.style.border = 'none';
        toggleButton.style.borderRadius = '4px';
        toggleButton.style.fontSize = '12px';
        toggleButton.style.display = 'none';
        
        // Only show for users who might need it
        const mediaQuery = window.matchMedia('(prefers-contrast: high)');
        if (mediaQuery.matches) {
            toggleButton.style.display = 'block';
        }

        toggleButton.addEventListener('click', () => {
            document.body.classList.toggle('high-contrast');
        });

        document.body.appendChild(toggleButton);
    }
}

// ==========================================================================
// Lazy Loading for Performance
// ==========================================================================

class LazyLoader {
    constructor() {
        this.images = document.querySelectorAll('img[data-src]');
        this.init();
    }

    init() {
        if ('IntersectionObserver' in window) {
            this.setupIntersectionObserver();
        } else {
            // Fallback for older browsers
            this.loadAllImages();
        }
    }

    setupIntersectionObserver() {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadImage(entry.target);
                    imageObserver.unobserve(entry.target);
                }
            });
        });

        this.images.forEach(img => imageObserver.observe(img));
    }

    loadImage(img) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        img.classList.add('loaded');
    }

    loadAllImages() {
        this.images.forEach(img => this.loadImage(img));
    }
}

// ==========================================================================
// Service Worker Registration
// ==========================================================================

class ServiceWorkerManager {
    constructor() {
        this.init();
    }

    init() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                this.registerServiceWorker();
            });
        }
    }

    async registerServiceWorker() {
        try {
            // Note: You would need to create a service-worker.js file
            // const registration = await navigator.serviceWorker.register('/service-worker.js');
            // console.log('ServiceWorker registration successful:', registration);
        } catch (error) {
            console.log('ServiceWorker registration failed:', error);
        }
    }
}

// ==========================================================================
// Application Initialization
// ==========================================================================

class HeroAnimations {
    constructor() {
        this.hero = document.querySelector('.hero');
        this.heroBackground = document.querySelector('.hero__background');
        this.visualCards = document.querySelectorAll('.hero__visual-card');
        
        if (!this.hero) return;
        
        this.init();
    }

    init() {
        // Add parallax effect on mouse move for desktop
        if (window.innerWidth >= 1024) {
            this.hero.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        }

        // Add scroll-based parallax for background
        window.addEventListener('scroll', Utils.throttle(() => this.handleScroll(), 50));
        
        // Pause/resume animations based on visibility
        this.setupIntersectionObserver();
    }

    handleMouseMove(e) {
        const rect = this.hero.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        
        // Move visual cards with parallax effect
        this.visualCards.forEach((card, index) => {
            const cardRect = card.getBoundingClientRect();
            const cardCenterX = cardRect.left + cardRect.width / 2;
            const cardCenterY = cardRect.top + cardRect.height / 2;
            
            // Calculate distance from mouse to card center
            const deltaX = e.clientX - cardCenterX;
            const deltaY = e.clientY - cardCenterY;
            
            // Base depth for general parallax
            const depth = (index + 1) * 10;
            const baseX = x * depth;
            const baseY = y * depth;
            
            // Add magnetic effect when hovering near the card
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const maxDistance = 300; // pixels within which the effect is active
            
            if (distance < maxDistance) {
                const strength = 1 - (distance / maxDistance); // 1 at center, 0 at maxDistance
                const magneticX = (deltaX / distance) * strength * 20; // 20px max movement
                const magneticY = (deltaY / distance) * strength * 20;
                
                card.style.transform = `translate(${baseX + magneticX}px, ${baseY + magneticY}px)`;
            } else {
                card.style.transform = `translate(${baseX}px, ${baseY}px)`;
            }
        });
    }

    handleScroll() {
        if (!this.heroBackground) return;
        
        const scrolled = window.scrollY;
        const heroHeight = this.hero.offsetHeight;
        
        // Only apply parallax while hero is visible
        if (scrolled < heroHeight) {
            const parallaxAmount = scrolled * 0.5;
            this.heroBackground.style.transform = `translateY(${parallaxAmount}px)`;
        }
    }

    setupIntersectionObserver() {
        const options = {
            threshold: 0.1,
            rootMargin: '0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Resume animations when hero is visible
                    this.visualCards.forEach(card => {
                        card.style.animationPlayState = 'running';
                    });
                } else {
                    // Pause animations when hero is not visible (performance optimization)
                    this.visualCards.forEach(card => {
                        card.style.animationPlayState = 'paused';
                    });
                }
            });
        }, options);

        if (this.hero) {
            observer.observe(this.hero);
        }
    }
}

class SecureGuardApp {
    constructor() {
        this.components = [];
        this.init();
    }

    async init() {
        // Wait for components to be loaded (header and footer)
        if (document.querySelector('#header-placeholder')) {
            // We're using component loader, wait for components
            document.addEventListener('allComponentsLoaded', () => {
                this.initComponents();
            });
        } else {
            // No component loader, init normally
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initComponents());
            } else {
                this.initComponents();
            }
        }
    }

    initComponents() {
        try {
            // Initialize all components
            this.components.push(new ThemeToggle());
            this.components.push(new Navigation());
            this.components.push(new HeroAnimations());
            this.components.push(new NewsletterFormValidator('#newsletter-form'));
            this.components.push(new ScrollAnimations());
            this.components.push(new AccessibilityEnhancements());
            this.components.push(new LazyLoader());
            this.components.push(new ServiceWorkerManager());

            // Set up error boundaries
            this.setupErrorHandling();

        } catch (error) {
            console.error('Error initializing components:', error);
        }
    }

    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            // In production, you might want to send this to an error tracking service
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            // In production, you might want to send this to an error tracking service
        });
    }
}

// ==========================================================================
// Application Entry Point
// ==========================================================================

// Initialize the application
new SecureGuardApp();

// Export for potential testing or external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Utils,
        ThemeToggle,
        Navigation,
        FormValidator,
        ScrollAnimations,
        AccessibilityEnhancements,
        SecureGuardApp
    };
}
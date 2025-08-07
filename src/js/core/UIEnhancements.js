/**
 * Simple Theme Management for M3U Player
 * Lightweight implementation to avoid conflicts
 */

// Simple theme management
function initThemeManager() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;

    // Get stored theme or default to dark
    let currentTheme = localStorage.getItem('m3u-theme') || 'dark';
    
    // Apply initial theme
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    // Update button icon with improved styling
    function updateThemeButton() {
        if (currentTheme === 'dark') {
            // Sun icon for switching to light
            themeToggle.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/>
                    <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" stroke-width="2"/>
                    <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" stroke-width="2"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" stroke-width="2"/>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" stroke-width="2"/>
                    <line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" stroke-width="2"/>
                    <line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" stroke-width="2"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" stroke-width="2"/>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" stroke-width="2"/>
                </svg>
            `;
            themeToggle.title = 'Cambiar a tema claro ☀️';
            themeToggle.setAttribute('aria-label', 'Switch to light theme');
        } else {
            // Moon icon for switching to dark
            themeToggle.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2"/>
                </svg>
            `;
            themeToggle.title = 'Cambiar a tema oscuro 🌙';
            themeToggle.setAttribute('aria-label', 'Switch to dark theme');
        }
        
        // Add smooth transition effect
        themeToggle.style.transform = 'scale(0.9)';
        setTimeout(() => {
            themeToggle.style.transform = 'scale(1)';
        }, 100);
    }

    // Toggle theme function with enhanced feedback
    function toggleTheme() {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        // Add transition class for smooth switching
        document.body.classList.add('theme-transitioning');
        
        // Apply new theme
        document.documentElement.setAttribute('data-theme', currentTheme);
        localStorage.setItem('m3u-theme', currentTheme);
        
        // Update button
        updateThemeButton();
        
        // Add visual feedback
        showThemeChangeNotification(currentTheme);
        
        // Remove transition class after animation
        setTimeout(() => {
            document.body.classList.remove('theme-transitioning');
        }, 300);
        
        console.log(`🎨 Tema cambiado a: ${currentTheme}`);
    }
    
    // Show visual feedback when theme changes
    function showThemeChangeNotification(theme) {
        // Remove existing notification
        const existingNotification = document.querySelector('.theme-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create notification
        const notification = document.createElement('div');
        notification.className = 'theme-notification';
        notification.innerHTML = `
            <div class="theme-notification-content">
                <span class="theme-icon">${theme === 'light' ? '☀️' : '🌙'}</span>
                <span class="theme-text">Tema ${theme === 'light' ? 'claro' : 'oscuro'} activado</span>
            </div>
        `;
        
        // Add notification styles
        const notificationStyles = `
            .theme-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--bg-card);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-lg);
                padding: 12px 16px;
                box-shadow: var(--shadow-lg);
                z-index: var(--z-toast);
                opacity: 0;
                transform: translateX(100px);
                transition: all 0.3s ease;
                pointer-events: none;
            }
            
            .theme-notification.show {
                opacity: 1;
                transform: translateX(0);
            }
            
            .theme-notification-content {
                display: flex;
                align-items: center;
                gap: 8px;
                color: var(--text-primary);
                font-size: 0.875rem;
                font-weight: 500;
            }
            
            .theme-icon {
                font-size: 1rem;
            }
            
            body.theme-transitioning {
                transition: background-color 0.3s ease, color 0.3s ease;
            }
            
            body.theme-transitioning * {
                transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease !important;
            }
        `;
        
        // Add styles if not already present
        if (!document.querySelector('#theme-notification-styles')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'theme-notification-styles';
            styleSheet.textContent = notificationStyles;
            document.head.appendChild(styleSheet);
        }
        
        // Add notification to DOM
        document.body.appendChild(notification);
        
        // Show notification
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
        
        // Hide and remove notification after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 2500);
    }    // Initialize button
    updateThemeButton();
    
    // Add click listener
    themeToggle.addEventListener('click', toggleTheme);

    // Keyboard shortcut (Ctrl+Shift+T)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'T') {
            e.preventDefault();
            toggleTheme();
        }
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThemeManager);
} else {
    initThemeManager();
}

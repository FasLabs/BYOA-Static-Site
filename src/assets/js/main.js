document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    menuToggle.addEventListener('click', function() {
        navLinks.classList.toggle('active');
        
        // Optional: Add animation to hamburger icon
        const spans = this.getElementsByTagName('span');
        this.classList.toggle('active');
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.main-nav')) {
            navLinks.classList.remove('active');
            menuToggle.classList.remove('active');
        }
    });
}); 
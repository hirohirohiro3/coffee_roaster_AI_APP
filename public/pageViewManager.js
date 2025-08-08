import { eventBus } from './EventBus.js';

const pages = {};
let navListLink, navStatsLink;

function showPage(pageName) {
    const targetPageName = ['list', 'stats'].includes(pageName) ? pageName : 'list';
    Object.values(pages).forEach(p => p.classList.add('hidden'));
    if (pages[targetPageName]) {
        pages[targetPageName].classList.remove('hidden');
    }
    updateNavLinks(targetPageName);
    eventBus.emit('nav:page-shown', { pageName: targetPageName });
}

function updateNavLinks(activePageName) {
    if (!navListLink || !navStatsLink) return;
    if (activePageName === 'stats') {
        navStatsLink.classList.add('border-b-2', 'border-amber-500', 'text-gray-900');
        navStatsLink.classList.remove('text-gray-500');
        navListLink.classList.remove('border-b-2', 'border-amber-500', 'text-gray-900');
        navListLink.classList.add('text-gray-500');
    } else {
        navListLink.classList.add('border-b-2', 'border-amber-500', 'text-gray-900');
        navListLink.classList.remove('text-gray-500');
        navStatsLink.classList.remove('border-b-2', 'border-amber-500', 'text-gray-900');
        navStatsLink.classList.add('text-gray-500');
    }
}

export function registerPage(pageName, element) {
    if (element) pages[pageName] = element;
}

export function initializePageNavigation() {
    navListLink = document.getElementById('nav-list');
    navStatsLink = document.getElementById('nav-stats');
    if (!navListLink || !navStatsLink) {
        console.error("Page navigation links not found.");
        return;
    }
    navListLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = '/list';
        showPage('list');
    });
    navStatsLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = '/stats';
        showPage('stats');
    });
    window.addEventListener('popstate', () => {
        const pageName = window.location.hash.substring(2) || 'list';
        showPage(pageName);
    });
    const initialPage = window.location.hash.substring(2) || 'list';
    showPage(initialPage);
    console.log("✅ PageNavigation initialized.");
}
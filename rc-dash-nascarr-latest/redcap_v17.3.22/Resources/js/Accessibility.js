$(function() {
'use strict';

// Header (which includes the navigation menu) should be outside main section, not within it.
relocateHeaderBeforeMain();
});

function relocateHeaderBeforeMain() {
    // Check if current URL is a Home tab
    const paths = [
        'index.php',
        'index.php?action=myprojects',
        'index.php?action=create',
        'index.php?action=help',
        'index.php?action=training',
        'index.php?route=SendItController:upload',
        'ControlCenter/index.php'
    ];
    if (paths.some(path =>
        window.location.href.includes(app_path_webroot + path) ||
        window.location.href.includes(app_path_webroot_parent + path)
    ))
    {
        const header = document.querySelector("header");
        const main = document.querySelector('div[role="main"]');
        if (header && main) {
            main.parentNode.insertBefore(header, main);
        }
    }
}
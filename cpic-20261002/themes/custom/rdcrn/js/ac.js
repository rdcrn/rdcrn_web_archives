jQuery(document).ready(function () {
    jQuery('.rs-accordion .rs-accordion-item:first button').removeClass('collapsed');
    jQuery('.rs-accordion .rs-accordion-item:first button').attr('aria-expanded', true);
    jQuery('.rs-accordion .rs-accordion-item:first h3').attr('aria-expanded', true);
    jQuery('.rs-accordion .rs-accordion-item:first div').removeClass('collapse');
    jQuery('.rs-accordion .rs-accordion-item:first div').addClass('show');
    });
jQuery('button.navbar-toggler').click(function() {
    if (!jQuery('#superfish-main-accordion').hasClass('sf-expanded')) {
        jQuery('#superfish-main-toggle').click().hide();
    }
    });
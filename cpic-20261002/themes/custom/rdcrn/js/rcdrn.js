jQuery(document).ready(function () {
    jQuery(".accordion").on("click", function () {
        jQuery(this).toggleClass("active");
        jQuery(this).siblings().removeClass("active");
        jQuery(this).children(".description").slideToggle(100);
        jQuery(this).siblings().children(".description").slideUp(100);
    });
    jQuery('.carousel').carousel({
        interval: 2000
    })

    // add this rail gallery effect
    jQuery(document).on('click', '#socialShare .socialBox', function() {
        jQuery(this).toggleClass('open'); 
    });
  
    jQuery(document).click(function (e) {
        e.stopPropagation();
        var container = jQuery(".social_share");

        //check if the clicked area is dropDown or not
        if (container.has(e.target).length === 0) {
            jQuery("#socialShare .socialBox").removeClass('open');  
        }
    });


    








  // Impect survey table list
  jQuery(".sidebar-second-widgets .about-us .about-container .btn").removeAttr("href");
  jQuery(".sidebar-second-widgets .about-us .about-container .btn").on("click", function () {
    jQuery('.sidebar-second-widgets .about-us .about-container').css("height", "auto");
    jQuery('.sidebar-second-widgets .about-us').css("padding-bottom", "2rem");
    jQuery(this).remove();
  });

  jQuery(".filter-sidebar .nav-link").click(function() {
    jQuery('html, body').animate({
        scrollTop: jQuery(".filter-content").offset().top - 150
    }, 500);
});

jQuery('.categories-filter li a').each(function(){
    if( jQuery(this).attr('href') == window.location.pathname ) jQuery(this).addClass('active');
})

// Responsive menu
jQuery('.navigation ul.nav .dropdown-toggle').click(function(e) {
    e.stopPropagation();
    jQuery(this).next('.dropdown-menu').toggleClass('expanded');
}); 

 
// Remove social meida on click

jQuery('a').each(function() {
    var a = new RegExp('/' + window.location.host + '/');
    if(!a.test(this.href)) {
        jQuery(this).click(function(event) {
            event.preventDefault();
            event.stopPropagation();
            window.open(this.href, '_blank');
        });
    }
 });

});


//search auto complete
jQuery(document).on('click', '.ui-menu li a', function() { setTimeout(function() {
    jQuery("#rdcrn-publication-search").submit()
    console.log("clicked")
    }, 500);  });
"use strict";

// move into controller
function videoEnded(site) {

	if (location.href.split(location.host)[1] === '/#/mobile'){

		setTimeout(function() {

		    $('#video-container').fadeOut( 300 );
		    $('.'+site+'-background').fadeIn( 1000 );

		    //set the garge door container height automatically
		    $(".middle").css('height',$("#the_garage_door .img-responsive").height());

		}, 1000);

	} else {

	    $('#video-container').hide();
	    $('.'+site+'-background').show();

	}
}

// fires on mobile video start
function resizeVideo() {
    $("#video-container video").attr("style", "width: "+$(window).width()+"px !important;").apply;
}
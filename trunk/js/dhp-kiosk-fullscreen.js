jQuery(document).ready(function($) {

	$('html').css({'overflow-y':'hidden'});

	$('.make-fullscreen').height($(window).height()-65);
	$(document).on('webkitfullscreenchange mozfullscreenchange fullscreenchange', resizeIframe.bind(this) );

	$('.full-win').on('click', function() {
		$('#launchModal').foundation('reveal', 'close');
		var el = document.documentElement, 
		rfs =
		       el.requestFullScreen
		    || el.webkitRequestFullScreen
		    || el.mozRequestFullScreen;
		    rfs.call(el);
	});
	
	$(document).foundation();
	$(document).on('close', '#launchModal', function () {
  		// Block kiosk menu and load links in iframe
  		linkInIframe.call(this);
	});
	$('#launchModal').foundation('reveal', 'open');	
	
		// PURPOSE: Load links from navbar inside iframe
	function linkInIframe() {
		$('.kiosk-menu a').on('click', function(e){
			e.preventDefault();
			if(!$(e.target).hasClass('global-tip')) {
				$('.make-fullscreen').attr('src', $(e.target).attr('href'));
			}			
		});
	}

		// PURPOSE: Resize iframe after fullscreen mode is engaged
	function resizeIframe() {
		// Fullscreen has a slow transition. Resize just after change.
		setTimeout(function(){
			$('.make-fullscreen').height($(window).height()-65);
		}, 500);	
	}

});

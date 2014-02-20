jQuery(document).ready(function($) {

	$('html').css({'overflow-y':'hidden'});
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
	$('#launchModal').foundation('reveal', 'open');
	
	$(document).on('close', '#launchModal', function () {
  		// Block kiosk menu and load links in iframe
  		linkInIframe.call(this);
	});
	
	function linkInIframe() {
		$('.kiosk-menu a').on('click', function(e){
			$('.make-fullscreen').height($(window).height()-65);
			e.preventDefault();
			if(!$(e.target).hasClass('global-tip')) {
				$('.make-fullscreen').attr('src', $(e.target).attr('href'));
			}			
		});
	}

	$( window ).resize(function() {
  		$('.make-fullscreen').height($('.make-fullscreen').height()-65);
	});

});

// DH Press Global Settings -- deals with global settings for Kiosk mode
// NOTES:   Variables in dhpGlobals are set via wp_localize_script() in print_scripts() of dhp-class-settings.php
// ASSUMES: PHP code in dhp-class-settings has already embedded modal for tips in HTML

// USES:    JavaScript libraries jQuery, Zurb Foundation

jQuery(document).ready(function($) {
	var newDHPSettings = new dhpGlobalSettings($);
});


var dhpGlobalSettings = function($) {
    var userActivity = false, secondsInactive = 0, activeMonitorID, maxSecondsInactive, myMonitor;
    var kioskTablet = true;
    var blockLinks = [];
        //Detect user agent and determine if kiosk device
    var kioskRE = new RegExp(dhpGlobals.kiosk_useragent, "i");
    var kioskDevice = kioskRE.test(navigator.userAgent.toLowerCase());

        // Block links
    blockLinks = dhpGlobals.kiosk_blockurls.split(',');
    findAndBlockLinks.call(this,blockLinks);

		// Only execute if not loaded in iframe
	if(!inIframe()) {
        
            // Monitor user activity, only if setting given
        maxSecondsInactive = dhpGlobals.timeout_duration * 60;
        // console.log(maxSecondsInactive);
        if ((maxSecondsInactive !== null) && (maxSecondsInactive !== '') && (maxSecondsInactive !== '0') && (maxSecondsInactive !== 0)) {
            console.log('start activity monitor')
            if (typeof(maxSecondsInactive) === "string") {
                maxSecondsInactive = parseFloat(maxSecondsInactive);
            }
            activeMonitorID = window.setInterval(monitorActivity.bind(this,10) , 10000);    // 1000 milliseconds = 1 sec * 60 sec = 1 minute
            addSiteListeners.call(this);
        }

            // DH Press is in Kiosk mode -- modify DOM accordingly
        if(dhpGlobals.kiosk_mode && kioskDevice) {

                // Move help from top nav-bar to lower global bar
            if(dhpGlobals.global_tip) {
                $('.dhp-nav .top-bar-section .right .tips').remove();
                $('.main-navigation .nav-menu').append('<li><li><a href="#" class="global-tip" data-reveal-id="tipModal" data-reveal>User Tips</a></li>');

                    // This shouldn't be necessary, as a close binding is done in dhp-project-page already
                // $('.close-tip').click(function() {
                //     $('#tipModal').foundation('reveal', 'close');
                // });
            }

            $('body').addClass('kiosk-mode-non-iframe');
                // For kiosk mode
                // 65px is height of bottom menu
            $('#dhp-visual').css({ 'height': $('body').height() - 110, 'top' : 45 });
            if($('body').hasClass('logged-in')) {
                $('#dhp-visual').css({ 'height': $('body').height() - 140, 'top' : 45 });
            }

            $('body').append('<div class="kiosk-menu contain-to-grid"><nav class="top-bar" data-topbar><section class="top-bar-section"></section></nav></div>');

            $('.main-navigation .nav-menu').clone().appendTo( '.kiosk-menu .top-bar-section' );

            $(document).foundation();
            stretchKioskNav.call(this);
        }

        // This is just an iFrame within a larger Project view
	} else {
            // Take care of projects in iframes(dual)
        if(dhpGlobals.kiosk_mode && kioskDevice) {
            $('body').addClass('kiosk-mode');
                // Remove tips from inner iFrames nav-bars
            if(dhpGlobals.global_tip) {
                $('.dhp-nav .top-bar-section .right .tips').remove();
            }
        }
    }

        // Call function to add Credits text to footer
    if(dhpGlobals.dhp_love) {
        addDHPLove.call(this);
    }

        // PURPOSE: Block link, try a second time(map renders links after load)    
    function findAndBlockLinks(linksArray) {
        $.each(linksArray, function(index,val){
            blockLink(val.trim());
            blockLinks[val.trim()] = setTimeout(function()
            {
                blockLink(val.trim());
            }, 5000);
        });
    }

    function blockLink(link) {
        if(findLink(link)){
            clearTimeout(blockLinks[link]);
        }
    }

    function findLink(link) {
        if($('a[href*="'+link+'"]').length >= 1) {
            $('a[href*="'+link+'"]').on('click', function(e) {
                e.preventDefault();
                // $('#externalModal').foundation('reveal', 'open',  link, {'crossDomain':true});
            });
            console.log('blocked '+link);
            return true;
        }       
    }

        //PURPOSE: Make nav menu the width of the items
    function stretchKioskNav() {
        var windowWidth = $(window).width();
            //find the width of each item
        var navWidth = findKioskNavWidth.call(this);

        if(navWidth > windowWidth) {
            $('.kiosk-menu a').css({'font-size':'18px'});
            navWidth = findKioskNavWidth.call(this);
        }
            //set the width of the nav bar
        $('.kiosk-menu .top-bar').css({'max-width':navWidth});
    }

        // PURPOSE: Find width of nav items
        // RETURN: px width of nav items
    function findKioskNavWidth() {
        var barWidth = 0;
        $('.kiosk-menu ul li').each(function(){
            barWidth += $(this).width();
        });
        return barWidth + 1;
    }

        // PURPOSE: Add DH Press credits to footer
    function addDHPLove() {
        $('.site-info').addClass('dhp-love').append('<p>This project has been created with DH Press, a digital humanities toolkit developed by UNC\'s Digital Innovation Lab and the Renaissance Computing Institute</p>')
    }

        // PURPOSE: Takes a WordPress gallery and cycles images like a screen saver
    function screenSaver() {
    }

		// PURPOSE: assign listeners for user activity
		// ASSUMES: Using window assigns events above the document(2 iframes + main page == 3 document bodys)
	function addSiteListeners() 
	{
		myMonitor = new IframeActivityMonitor({trackingInterval : 5000});
			// Add iframe listeners
		window.addEventListener('mousePositionChanged', function() {
		    userActivity = true;
		}, false);
			// Toplevel mouse listeners
		$(document).on('mousemove',function() {
			userActivity = true;
		});
			// Toplevel keyboard listeners
		$(document).on('keypress', function() {
            userActivity = true;
        });
        	// Start iframe monitor
		myMonitor.start();
 
	} // addSiteListeners()

        // PURPOSE: Called once a minute to see if user has done anything in that interval
    function monitorActivity(incrementAmt)
    {
            // Either increase or rest minutesInactive, based on user activity in last minute
        if (userActivity) {
            secondsInactive = 0;
        } else {
            secondsInactive+= incrementAmt;
        }
        userActivity = false;

        if (secondsInactive >= maxSecondsInactive) {
        		// Redirect page to home
                // if running in locked kiosk page
            if(document.location.href == dhpGlobals.kiosk_launch_url ) {
                    // if iframe not on homepage redirect
                if($('.make-fullscreen').attr('src') !== dhpGlobals.redirect_url) {
                    $('.make-fullscreen').attr('src', dhpGlobals.redirect_url);
                } 
            }
                // normal site
            else {
                if(document.location.href !== dhpGlobals.redirect_url) {
                    document.location.href = dhpGlobals.redirect_url;
                }
                    // If on home url scroll to top instead of reload
                else {
                    $('#tipModal').foundation('reveal', 'close');
                    if ( $(window).scrollTop() > 0) {
                        $("html, body").animate({scrollTop:0}, '500', 'swing', function() {});
                    }       
                }   
            }
			
        }
    } // monitorActivity()

		// Test if script is loading in iframe. 
	function inIframe () 
	{
	    try {
	        return window.self !== window.top;
	    } catch(e) {
	        return true;
	    }
	} // inIframe()

};

///////tracking in IFRAME code////////////////

// https://github.com/aroder/IframeActivityMonitor
var IframeActivityMonitor = function(args) {
    args = args || {};
    
    // how often to compare current and old positions, in milliseconds
    var trackingInterval = args.trackingInterval || 1000;
    var oldPosition = {
        x: 0,
        y: 0
    };
    var trackingTimer;

    var eventHandlers = [];
    var start = function() {
        // add mouseover and mouseout listeners to every iframe
        var frames = document.getElementsByTagName('iframe');
        for (var i = 0; i < frames.length; i++) {

            // on mouseover, start tracking position within the iframe
            frames[i].addEventListener('mouseover', track, false);

            // on mouseout, stop tracking the mouse position within the iframe
            frames[i].addEventListener('mouseout', stopTracking, false);
        }
    };
    var stop = function() {
        var frames = document.getElementsByTagName('iframe');
        for (var i = 0; i < frames.length; i++) {
            frames[i].removeEventListener('mouseover', track, false);
            frames[i].removeEventListener('mouseout', stopTracking, false);
        }
    };
    var track = function(mouseEvent) {
        trackingTimer = setTimeout(function tracker() {
            //console.log('tracking');
            var frame = mouseEvent.target;
            var div = document.createElement('div');
            div.style.height = frame.clientHeight + 'px';
            div.style.width = frame.clientWidth + 'px';

            div.style.left = frame.offsetLeft + 'px';
            div.style.top = frame.offsetTop + 'px';
            div.style.position = 'absolute';
            //div.style.backgroundColor = '#000';
            div.innerHTML = '&nbsp;';
            document.body.appendChild(div);
            div.addEventListener('mouseover', function tracker2(mouseEvent) {
                var position = {
                    x: mouseEvent.clientX,
                    y: mouseEvent.clientY
                };
                
                // if the position is different than the old position, the
                // the mouse has moved within the iframe. Dispatch an event
                // on the window object
                if (position.x != oldPosition.x || position.y != oldPosition.y) {
                    dispatchEvent();
                }
                oldPosition = position;
                div.parentNode.removeChild(div);
            }, false);

        }, trackingInterval);
    };
    var stopTracking = function(mouseEvent) {
        clearTimeout(trackingTimer);
    };

    var dispatchEvent = function() {
        var evt = document.createEvent('Event');
        evt.initEvent('mousePositionChanged', true, true);
        window.dispatchEvent(evt);
    };

    return {
        start: start,
        stop: stop
    };
};
////////////////end tracking code///////////////
	

"use-strict";
if (window.ColorPicker) { throw "Module ColorPicker already exist."; }

//---------------------------------------------------------------------
(function() {

function _init_stylesheet(pickerSelector) {
	var style = document.head.querySelector('x-color-picker-stylesheet') || (function() {
		var obj  = document.createElement('style');
		obj.type = 'text/css';
		obj.id   = 'x-color-picker-stylesheet';
		return document.head.appendChild(obj), obj;
	})();
	var styleBody = 
" \
#color-picker { \
	  position: relative; \
    padding: 10px; \
    width: 360px; \
    height: 200px; \
    outline: none; \
    user-select: none; \
    -o-user-select: none; \
    -moz-user-select: none; \
    -webkit-user-select: none; \
} \
#color-picker .pick-point { \
    pointer-events: none; \
} \
#color-picker > .frame { \
    padding: 16px 16px; \
    width: 100%; \
    height: 100%; \
    background-color: white; \
    border: 1px solid silver; \
    border-radius: 2px; \
    box-shadow: 3px 2px 5px rgba(0,0,0,.5); \
    box-sizing: border-box; \
    font-size: 0; \
    white-space: nowrap; \
} \
#color-picker > .frame > .hue { \
    position: relative; \
    display: inline-block; \
    width: 30px; \
    height: calc(100% - 2px); \
    border: 1px solid silver; \
    box-sizing: border-box; \
    background-size: 100% 100%; \
} \
#color-picker > .frame > .hue > .pick-point { \
    position: absolute; \
    display: inline-block; \
    top: 0; \
    left: 0; \
    width: 100%; \
    border-style: solid; \
    border-width: 3px 5px 3px 0; \
    border-color: transparent black transparent transparent; \
    transform: translateY(-50%); \
} \
#color-picker > .frame > .hue > .pick-point::after { \
    content: ''; \
    display: block; \
    width: 100%; \
    height: 1px; \
    background-color: rgba(0,0,0,.4); \
} \
#color-picker > .frame > .main { \
    position: relative; \
    display: inline-block; \
    margin-left: 15px; \
    width: calc(100% - 50px); \
    height: 100%; \
    border: 1px solid silver; \
    box-sizing: border-box; \
} \
#color-picker > .frame > .main > canvas { \
    display: block; \
    width: 100%; \
    height: 100%; \
} \
#color-picker > .frame > .main > .pick-point { \
    position: absolute; \
    top: 0; \
    left: 100%; \
    width: 0; \
    height: 0; \
} \
#color-picker > .frame > .main > .pick-point::after { \
    content: ''; \
    display: block; \
    width: 15px; \
    height: 15px; \
    background-color: transparent; \
    border: 1px solid white; \
    border-radius: 50%; \
    box-sizing: border-box; \
    transform: translate(-50%, -50%); \
} \
#color-picker > .frame > button.cancel { \
	position: absolute; \
	top: 10px; \
	right: 10px; \
	\
	background-color: transparent; \
	border: none; \
	font-size: 20px; \
	color: #999999; \
	cursor: pointer; \
} \
#color-picker > .frame > button.cancel:hover { \
	color: red; \
} \
";
	if (pickerSelector != '#color-picker') {
		var reg = new RegExp('#color-picker'.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'g');
		style.innerHTML = styleBody.replace(reg, pickerSelector);
	} else {
		style.innerHTML = styleBody;
	}
};

//---------------------------------------------------------------------

var pickerId = 'color-picker';
(function() {
	if (document.currentScript) {
		if (!document.currentScript.getAttribute('no-css')) {
			 pickerId = document.currentScript.getAttribute('picker-id') || pickerId;
			_init_stylesheet('#'+pickerId);
		}
	} else {
		// IE support
		_init_stylesheet('#'+pickerId);
	}
})();

//---------------------------------------------------------------------

window.ColorPicker = (function() {
	function _i_create(opt)
	{
		// declare class fields
		var __ins       = null;
		var _tmp_color  = null;
		var _tmp_target = null;
		var $picker     = null;
		var $main       = null;
		var $hue        = null;

		// callback
		var colorSelected = null;

		// drawer
		var cvs		   = null;  // declare scope
		var ctx		   = null;


		// pre-initialization
		if (opt.destroyOld) {
			$(pickerId).each(function(e) { this.instance.destroy(); });
		}

		//--------------------------------------------------------------------
		// private functions
		function setColor(hex)
		{
			if (colorSelected) { colorSelected(hex); }
		}
		function hsvToRgb(h, s, v) {
			var C = v * s;
			var X = C * (1 - Math.abs((h / 60) % 2 - 1));
			var m = v - C;

			var rgb = (function() { var d; switch (d = Math.floor((h % 360) / 60))
			{
				case 0: return {r: C, g: X, b: 0};
				case 1: return {r: X, g: C, b: 0};
				case 2: return {r: 0, g: C, b: X};
				case 3: return {r: 0, g: X, b: C};
				case 4: return {r: X, g: 0, b: C};
				case 5: return {r: C, g: 0, b: X};
				default: throw d;
			} })();

			rgb.r = Math.round((rgb.r + m) * 255);
			rgb.g = Math.round((rgb.g + m) * 255);
			rgb.b = Math.round((rgb.b + m) * 255);
			return rgb;
		}
		function rgbToHsv(r, g, b) {
			r /= 255; g /= 255; b /= 255;

			var Cmax = Math.max(r, g, b);
			var Cmin = Math.min(r, g, b);
			var d = Cmax - Cmin;

			var H = (function() { switch (true)
			{
				case 0 == d: return 0;
				case r == Cmax: return 60 * ((g - b) / d % 6);
				case g == Cmax: return 60 * ((b - r) / d + 2);
				case b == Cmax: return 60 * ((r - g) / d + 4);
			} })();

			var S = (0 == Cmax ? 0 : d / Cmax);
			var V = Cmax;

			return { h: H, s: S, v: V };
		}
		function rgbToHex(r, g, b) {
			r = Math.max(0, Math.min(r, 255));
			g = Math.max(0, Math.min(g, 255));
			b = Math.max(0, Math.min(b, 255));
			return '#' + ('000000' + ((r << 16) | (g << 8) | b).toString(16)).slice(-6);
		}
		function getHue() {
			return Math.round(parseFloat($hue.data('value')) * 100) / 100;
		}
		//--------------------------------------------------------------------

		// initialization
		// init item
		(function initPicker() {
			$picker = $('<div id="'+pickerId+'" tabindex="0"><div class="frame"><span class="hue" value="0"><span class="pick-point"></span></span><div class="main"><canvas></canvas><span class="pick-point"></span></div><button type="button" title="cancel" class="cancel">&times;</button></div></div>');
			$picker
				.appendTo($('body'))
				// disable drag
				.on('dragstart', function(e) { e.preventDefault(); e.stopPropagation(); })
				// disable context menu
				.on('contextmenu', function (e) { e.preventDefault(); e.stopPropagation(); })
				.css({ position: 'relative', top: 0, left: 0, opacity: 0 });

			$main = $picker.find('>.frame>.main');
			$hue  = $picker.find('>.frame>.hue');
			$btnCancel = $picker.find('>.frame>.cancel');

			// set options
			if (opt) {
				if (opt.destroyOnBlur) {
					$picker.on('mousedown', '*', function(e) { e.preventDefault(); });
					$picker.mousedown(function(e){
						var parent = $(e.currentTarget)
						parent.focus();
					});
					$picker.on('blur', function(e) { __ins.destroy(); });
					setTimeout(function() { $picker.focus(); }, 0); 
				}
			}
		})();

		// canvas color init
		(function initCanvas() {
			cvs = $picker.find('>.frame>.main>canvas')[0];
			cvs.width   = $(cvs).width();
			cvs.height  = $(cvs).height();
			cvs.viewBox = '0 0 1 1';
			ctx = cvs.getContext('2d');
		})();

		// init hue color - support IE9
		(function initHueBackground() {
			var rainbow = ctx.createLinearGradient(0,0,0,cvs.height);
			rainbow.addColorStop(.01, "rgb(255,   0,   0)");
			rainbow.addColorStop(.15, "rgb(255, 255,   0)");
			rainbow.addColorStop(.33, "rgb(0,   255,   0)");
			rainbow.addColorStop(.49, "rgb(0,   255, 255)");
			rainbow.addColorStop(.67, "rgb(0,     0, 255)");
			rainbow.addColorStop(.84, "rgb(255,   0, 255)");
			rainbow.addColorStop(.99, "rgb(255,   0,   0)");
			ctx.fillStyle = rainbow;
			ctx.fillRect(0, 0, cvs.width, cvs.height);

			var rImgData = cvs.toDataURL('image/jpeg');
			$hue.css({ 'background-image': 'url(' + rImgData + ')' });
		})();

		// init cancel button
		(function initCancelButton() {
			$btnCancel.click(function(e) {
				__ins.destroy();
				_tmp_target.css({'background-color': _ori_color});
				setColor(_ori_color);
			});
		})();

		// features details
		function update_main_e(e)
		{
			e.stopPropagation();
			var tarRect = $hue[0].getBoundingClientRect();
			var offsetY = e.clientY - tarRect.top;
			var deg = 360 * offsetY / tarRect.height;
			if (deg <   0) { deg =   0; }
			if (deg > 360) { deg = 360; }
			setHue(deg);
			// pointer
			$hue.find('>.pick-point').css({top: Math.max(0, Math.min(offsetY, tarRect.height)) });
		};
		function update_main_t(e)
		{
			e.preventDefault();
			var fullHeight = $hue[0].getBoundingClientRect().height;
			var offsetY	= e.touches[0].clientY - e.target.getBoundingClientRect().top;

			var deg = 360 * offsetY / fullHeight;
			if (deg <   0) { deg =   0; }
			if (deg > 360) { deg = 360; }
			setHue(deg);
			// pointer
			$hue.find('>.pick-point').css({top: Math.max(0, Math.min(offsetY, fullHeight)) });
		};
		function setHue(deg)
		{
			$hue.data('value', deg);

			// background
			ctx.fillStyle = 'hsl('+ deg +',100%, 50%)';
			ctx.fillRect(0, 0, cvs.width, cvs.height);

			// mask x
			var grdX = ctx.createLinearGradient(0,0,cvs.width,0);
			grdX.addColorStop(0.005, 'white');
			grdX.addColorStop(0.999, 'rgba(255,255,255,0)');

			ctx.fillStyle = grdX;
			ctx.fillRect(0, 0, cvs.width, cvs.height);

			// mask y
			var grdY = ctx.createLinearGradient(0,0,0,cvs.height);
			grdY.addColorStop(0.05, 'rgba(0,0,0,0)');
			grdY.addColorStop(1.00, 'black');

			ctx.fillStyle = grdY;
			ctx.fillRect(0, 0, cvs.width, cvs.height);

			var trgPos = $main.find('>.pick-point').position();
			if (_tmp_target) {
				var hex = preview_color(trgPos.left, trgPos.top);
				setColor(_tmp_color = hex);
			}
		};
		var preview_color = function(offsetX, offsetY)
		{
			var h = getHue();
			var s = offsetX / $main.width();
			var v = 1 - offsetY / $main.height();

			var rgb = hsvToRgb(h, s, v);
			var hex = rgbToHex(rgb.r, rgb.g, rgb.b);

			_tmp_target.css({'background-color': hex});
			return hex;
		}
		setHue(0);

		// -------------------------------------------------------
		// inita interactions
		// set hue
		$hue
			.on('mouseup', update_main_e)
			.on('touchmove touchend', update_main_t)
			.on('mousemove', function(e) {
				if (1 == e.buttons) { update_main_e(e); }
			});

		// set color
		$main.find('>*')
			.on('mousemove touchmove', function(e) {
				e.preventDefault();
				var tarRect = cvs.getBoundingClientRect();

				var isTouch = !!e.touches;
				var offsetX = (isTouch
					? e.touches[0].clientX
					: e.clientX) - tarRect.left;
				var offsetY = (isTouch
					? e.touches[0].clientY 
					: e.clientY) - tarRect.top;

				offsetX = Math.max(0, Math.min(offsetX, cvs.width));
				offsetY = Math.max(0, Math.min(offsetY, cvs.height));

				var hex = preview_color(offsetX, offsetY);
				
				if(isTouch || 1 == e.buttons) {
					setColor(_tmp_color = hex);
					$(cvs).find('+.pick-point').css({ top: offsetY, left: offsetX });
				}

			})
			.on('click mouseup touchup', function(e) {
				e.preventDefault();
				var tarRect = cvs.getBoundingClientRect();
				var isTouch = !!e.touches;
				var offsetX = (isTouch
					? e.touches[0].clientX
					: e.clientX) - tarRect.left;
				var offsetY = (isTouch
					? e.touches[0].clientY 
					: e.clientY) - tarRect.top;

				offsetX = Math.max(0, Math.min(offsetX, cvs.width));
				offsetY = Math.max(0, Math.min(offsetY, cvs.height));

				var p = ctx.getImageData(offsetX, offsetY + 1, 1, 1).data;
				setColor(_tmp_color = rgbToHex(p[0], p[1], p[2]));
				$(cvs).find('+.pick-point').css({
					top:  offsetY,
					left: offsetX
				});
			})
			.on('mouseout', function(e) {
				_tmp_target.css({'background-color': _tmp_color});
				_tmp_target.attr('color', _tmp_color);
			});

		// -------------------------------------------------------
		$picker
			.hide() // ensure the picker is hidden at first, but need to be set at last for initializing size
			.detach();
		__ins = {
			show: function(target, selected_callback)
			{
				_tmp_target = $(target);
				$('body').append($picker);

				colorSelected = selected_callback.bind(target);
				$picker.show();

				// get HSV
				var oriColor = _ori_color = $(target).attr('color');
				var matches  = [];
				if (oriColor && (matches = oriColor.match(/#([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})/i)))
				{
					// set tmp
					setColor(_tmp_color = oriColor);
					// calculate HSV
					var r = parseInt(matches[1], 16);
					var g = parseInt(matches[2], 16);
					var b = parseInt(matches[3], 16);

					var hsv = rgbToHsv(r, g, b);

					// ---- set original color
					// set main location

					$main.find('>.pick-point').css({
						top:  (1 - hsv.v) * cvs.height,
						left: hsv.s * cvs.width
					});

					// set hue
					setHue(hsv.h);
					var hueHeight = $hue[0].getBoundingClientRect().height;
					var huePosY   = hsv.h / 360 * hueHeight;
					$hue.find('>.pick-point').css({ top: Math.max(0, Math.min(huePosY, hueHeight)) });

				}

				var pickerRect = $picker[0].getBoundingClientRect();
				var miLeft = pickerRect.left;
				var miTop  = pickerRect.top;

				var tarRect = target.getBoundingClientRect();
				var centerX = tarRect.left + tarRect.width / 2;
				var topY    = tarRect.top;

				var widgetHeight = $picker.height();
				var widgetLeft   = centerX - $picker.width() / 2;

				$picker.css({
					top: topY - widgetHeight - 20 - miTop,
					left: widgetLeft - miLeft,
					opacity: 1
				});

			},
			destroy: function()
			{
				$picker[0].instance = null;
				$picker.remove();
			}
		};

		// set back reference
		$picker[0].instance = __ins;
		return __ins; 

	};
	return { create: _i_create };
})();

})();
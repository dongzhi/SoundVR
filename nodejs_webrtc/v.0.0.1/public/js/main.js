(function($) {

$(document).ready(function() {
		var context = new AudioContext;

		/* VCO */
		var vco = context.createOscillator();
		vco.type = vco.SINE;
		//vco.frequency.value = this.frequency;
		vco.frequency.value = 120;
		vco.start(0);

		/* Volume */
		var volume = context.createGain(); //createGainNode is deprecated
		volume.gain.value = 0;

		/* Connections */
		vco.connect(volume);
		volume.connect(context.destination);



		// $('#trigger').on('mouseover',function(e){
    //     e.preventDefault();
    //     volume.gain.value = 1;
    // })
		//
		// $('#trigger').on('mouseout',function(e){
		// 		e.preventDefault();
		// 		volume.gain.value = 0;
		// })
});


})(jQuery);

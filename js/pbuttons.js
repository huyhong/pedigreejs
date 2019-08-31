// let d3 = require('d3')
// import $ from 'jquery';

// let io = require('./io')
// let pbuttons = require('./pbuttons')
import pedcache from './pedcache';
// let pedigree_form = require('./pedigree_form')
import pedigree_util from './pedigree_util';
import ptree from './ptree';
// let utils = require('./utils')
// let widgets = require('./widgets')


// undo, redo, reset buttons
let pbuttons = {};

pbuttons.add = function(options) {
	var opts = $.extend({
					// defaults
		btn_target: 'pedigree_history'
			}, options );

	var btns = [{"fa": "fa-undo", "title": "undo"},
				{"fa": "fa-repeat", "title": "redo"},
				{"fa": "fa-refresh", "title": "reset"},
				{"fa": "fa-arrows-alt", "title": "fullscreen"}];
	var lis = "";
	for(var i=0; i<btns.length; i++) {
		lis += '<li">';
		lis += '&nbsp;<i class="fa fa-lg ' + btns[i].fa + '" ' +
									 (btns[i].fa == "fa-arrows-alt" ? 'id="fullscreen" ' : '') +
									 ' aria-hidden="true" title="'+ btns[i].title +'"></i>';
		lis += '</li>';
	}
	$( "#"+opts.btn_target ).append(lis);
	click(opts);
};

pbuttons.is_fullscreen = function(){
	return (document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement);
};

function click(opts) {
	// fullscreen
		$(document).on('webkitfullscreenchange mozfullscreenchange fullscreenchange MSFullscreenChange', function(e)  {
		var local_dataset = pedcache.current(opts);
			if (local_dataset !== undefined && local_dataset !== null) {
				opts.dataset = local_dataset;
			}
		ptree.rebuild(opts);
		});

	$('#fullscreen').on('click', function(e) {
		if (!document.mozFullScreen && !document.webkitFullScreen) {
			var target = $("#"+opts.targetDiv)[0];
			if(target.mozRequestFullScreen)
				target.mozRequestFullScreen();
				else
					target.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
		} else {
			if(document.mozCancelFullScreen)
						document.mozCancelFullScreen();
				else
					document.webkitCancelFullScreen();
		}
	});

	// undo/redo/reset
	$( "#"+opts.btn_target ).on( "click", function(e) {
		e.stopPropagation();
		if($(e.target).hasClass("disabled"))
			return false;

		if($(e.target).hasClass('fa-undo')) {
			opts.dataset = pedcache.previous(opts);
			$("#"+opts.targetDiv).empty();
			ptree.build(opts);
		} else if ($(e.target).hasClass('fa-repeat')) {
			opts.dataset = pedcache.next(opts);
			$("#"+opts.targetDiv).empty();
			ptree.build(opts);
		} else if ($(e.target).hasClass('fa-refresh')) {
			pbuttons.reset(opts, opts.keep_proband_on_reset);
		}
		// trigger fhChange event
		$(document).trigger('fhChange', [opts]);
	});
}

// reset pedigree and clear the history
pbuttons.reset = function(opts, keep_proband) {
	if(keep_proband) {
		var local_dataset = pedcache.current(opts);
		var newdataset =  ptree.copy_dataset(local_dataset);
		var proband = newdataset[pedigree_util.getProbandIndex(newdataset)];
		//var children = pedigree_util.getChildren(newdataset, proband);
		proband.name = "ch1";
		proband.mother = "f21";
		proband.father = "m21";
		// clear pedigree data but keep proband data and risk factors
		pedcache.clear_pedigree_data(opts)
	} else {
		var proband = {
			"name":"ch1","sex":"F","mother":"f21","father":"m21","proband":true,"status":"0","display_name":"me"
		};
		pedcache.clear(opts); // clear all storage data
	}

	delete opts.dataset;

	var selected = $("input[name='default_fam']:checked");
	if(selected.length > 0 && selected.val() == 'extended2') {    // secondary relatives
				opts.dataset = [
					{"name":"wZA","sex":"M","top_level":true,"status":"0","display_name":"paternal grandfather"},
					{"name":"MAk","sex":"F","top_level":true,"status":"0","display_name":"paternal grandmother"},
					{"name":"zwB","sex":"M","top_level":true,"status":"0","display_name":"maternal grandfather"},
					{"name":"dOH","sex":"F","top_level":true,"status":"0","display_name":"maternal grandmother"},
					{"name":"MKg","sex":"F","mother":"MAk","father":"wZA","status":"0","display_name":"paternal aunt"},
					{"name":"xsm","sex":"M","mother":"MAk","father":"wZA","status":"0","display_name":"paternal uncle"},
					{"name":"m21","sex":"M","mother":"MAk","father":"wZA","status":"0","display_name":"father"},
					{"name":"f21","sex":"F","mother":"dOH","father":"zwB","status":"0","display_name":"mother"},
					{"name":"aOH","sex":"F","mother":"f21","father":"m21","status":"0","display_name":"sister"},
					{"name":"Vha","sex":"M","mother":"f21","father":"m21","status":"0","display_name":"brother"},
					{"name":"Spj","sex":"M","mother":"f21","father":"m21","noparents":true,"status":"0","display_name":"partner"},
					proband,
					//{"name":"ch1","sex":"F","mother":"f21","father":"m21","proband":true,"status":"0","display_name":"me"},
					{"name":"zhk","sex":"F","mother":"ch1","father":"Spj","status":"0","display_name":"daughter"},
					{"name":"Knx","display_name":"son","sex":"M","mother":"ch1","father":"Spj","status":"0"},
					{"name":"uuc","display_name":"maternal aunt","sex":"F","mother":"dOH","father":"zwB","status":"0"},
					{"name":"xIw","display_name":"maternal uncle","sex":"M","mother":"dOH","father":"zwB","status":"0"}];
	} else if(selected.length > 0 && selected.val() == 'extended1') {    // primary relatives
		opts.dataset = [
			{"name":"m21","sex":"M","mother":null,"father":null,"status":"0","display_name":"father","noparents":true},
			{"name":"f21","sex":"F","mother":null,"father":null,"status":"0","display_name":"mother","noparents":true},
			{"name":"aOH","sex":"F","mother":"f21","father":"m21","status":"0","display_name":"sister"},
			{"name":"Vha","sex":"M","mother":"f21","father":"m21","status":"0","display_name":"brother"},
			{"name":"Spj","sex":"M","mother":"f21","father":"m21","noparents":true,"status":"0","display_name":"partner"},
			proband,
			//{"name":"ch1","sex":"F","mother":"f21","father":"m21","proband":true,"status":"0","display_name":"me"},
			{"name":"zhk","sex":"F","mother":"ch1","father":"Spj","status":"0","display_name":"daughter"},
			{"name":"Knx","display_name":"son","sex":"M","mother":"ch1","father":"Spj","status":"0"}];
	} else {
		opts.dataset = [
			{"name": "m21", "display_name": "father", "sex": "M", "top_level": true},
					{"name": "f21", "display_name": "mother", "sex": "F", "top_level": true},
					proband];
				//{"name": "ch1", "display_name": "me", "sex": "F", "mother": "f21", "father": "m21", "proband": true}];
	}
	ptree.rebuild(opts);
}

pbuttons.updateButtons = function(opts) {
	var current = pedcache.get_count(opts);
	var nstore = pedcache.nstore(opts);
	var id = "#"+opts.btn_target;
	if(nstore <= current)
		$(id+" .fa-repeat").addClass('disabled');
	else
		$(id+" .fa-repeat").removeClass('disabled');

	if(current > 1)
		$(id+" .fa-undo").removeClass('disabled');
	else
		$(id+" .fa-undo").addClass('disabled');
};

export default pbuttons;

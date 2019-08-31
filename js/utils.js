// let d3 = require('d3')
// import $ from 'jquery';

// let io = require('./io')
// let pbuttons = require('./pbuttons')
// let pedcache = require('./pedcache')
// let pedigree_form = require('./pedigree_form')
// let pedigree_util = require('./pedigree_util')
// let ptree = require('./ptree')
// let utils = require('./utils')
// let widgets = require('./widgets')

// pedigree utils
let utils = {};

utils.isIE = function() {
	var ua = navigator.userAgent;
	/* MSIE used to detect old browsers and Trident used to newer ones*/
	return ua.indexOf("MSIE ") > -1 || ua.indexOf("Trident/") > -1;
}

utils.isEdge = function() {
	return navigator.userAgent.match(/Edge/g);
}

/**
*  Get formatted time or data & time
*/
utils.getFormattedDate = function(time){
	 var d = new Date();
	 if(time)
		 return ('0' + d.getHours()).slice(-2) + ":" + ('0' + d.getMinutes()).slice(-2) + ":" + ('0' + d.getSeconds()).slice(-2);
	 else
		 return d.getFullYear() + "-" + ('0' + (d.getMonth() + 1)).slice(-2) + "-" + ('0' + d.getDate()).slice(-2) + " " + ('0' + d.getHours()).slice(-2) + ":" + ('0' + d.getMinutes()).slice(-2) + ":" + ('0' + d.getSeconds()).slice(-2);
}

/**
* Show message or confirmation dialog.
* @param title     - dialog window title
* @param msg       - message to diasplay
* @param onConfirm - function to call in a confirmation dialog
* @param opts      - pedigreejs options
* @param dataset    - pedigree dataset
*/
utils.messages = function(title, msg, onConfirm, opts, dataset) {
 if(onConfirm) {
	 $('<div id="msgDialog">'+msg+'</div>').dialog({
					 modal: true,
					 title: title,
					 width: 350,
					 buttons: {
						 "Yes": function () {
									 $(this).dialog('close');
									 onConfirm(opts, dataset);
							 },
							 "No": function () {
									 $(this).dialog('close');
							 }
					 }
			 });
 } else {
	 $('<div id="msgDialog">'+msg+'</div>').dialog({
			 title: title,
			 width: 350,
			 buttons: [{
				 text: "OK",
				 click: function() { $( this ).dialog( "close" );}
			 }]
	 });
 }
}

/**
* Validate age and yob is consistent with current year. The sum of age and
* yob should not be greater than or equal to current year. If alive the
* absolute difference between the sum of age and year of birth and the
* current year should be <= 1.
* @param age    - age in years.
* @param yob    - year of birth.
* @param status - 0 = alive, 1 = dead.
* @return true if age and yob are consistent with current year otherwise false.
*/
utils.validate_age_yob = function(age, yob, status) {
 var year = new Date().getFullYear();
 var sum = parseInt(age) + parseInt(yob);
 if(status == 1) {   // deceased
	 return year >= sum;
 }
 return Math.abs(year - sum) <= 1 && year >= sum;
}

export default utils;
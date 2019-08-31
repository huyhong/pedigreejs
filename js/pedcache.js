// let d3 = require('d3')
// let $ = require('jquery')

// let io = require('./io')
// let pbuttons = require('./pbuttons')
// let pedcache = require('./pedcache')
// let pedigree_form = require('./pedigree_form')
// let pedigree_util = require('./pedigree_util')
// let ptree = require('./ptree')
// let utils = require('./utils')
// let widgets = require('./widgets')

//store a history of pedigree
	let pedcache = {};
	var count = 0;
	var max_limit = 25;
	var dict_cache = {};

	// test if browser storage is supported
	function has_browser_storage(opts) {
	    try {
	    	if(opts.store_type === 'array')
	    		return false;

	    	if(opts.store_type !== 'local' && opts.store_type !== 'session' && opts.store_type !== undefined)
	    		return false;

	    	var mod = 'test';
	        localStorage.setItem(mod, mod);
	        localStorage.removeItem(mod);
	        return true;
	    } catch(e) {
	        return false;
	    }
	}

	function get_prefix(opts) {
		return "PEDIGREE_"+opts.btn_target+"_";
	}

	// use dict_cache to store cache as an array
	function get_arr(opts) {
		return dict_cache[get_prefix(opts)];
	}

	function get_browser_store(opts, item) {
		if(opts.store_type === 'local')
			return localStorage.getItem(item);
		else
			return sessionStorage.getItem(item);
	}

	function set_browser_store(opts, name, item) {
		if(opts.store_type === 'local')
			return localStorage.setItem(name, item);
		else
			return sessionStorage.setItem(name, item);
	}

	// clear all storage items
	function clear_browser_store(opts) {
		if(opts.store_type === 'local')
			return localStorage.clear();
		else
			return sessionStorage.clear();
	}

	// remove all storage items with keys that have the pedigree history prefix
	pedcache.clear_pedigree_data = function(opts) {
		var prefix = get_prefix(opts);
		var store = (opts.store_type === 'local' ? localStorage : sessionStorage);
		var items = [];
		for(var i = 0; i < store.length; i++){
			if(store.key(i).indexOf(prefix) == 0)
				items.push(store.key(i));
		}
		for(var i = 0; i < items.length; i++)
			store.removeItem(items[i]);
	}

	pedcache.get_count = function(opts) {
		var count;
		if (has_browser_storage(opts))
			count = get_browser_store(opts, get_prefix(opts)+'COUNT');
		else
			count = dict_cache[get_prefix(opts)+'COUNT'];
		if(count !== null && count !== undefined)
			return count;
		return 0;
	};

	function set_count(opts, count) {
		if (has_browser_storage(opts))
			set_browser_store(opts, get_prefix(opts)+'COUNT', count);
		else
			dict_cache[get_prefix(opts)+'COUNT'] = count;
	}

	pedcache.add = function(opts) {
		if(!opts.dataset)
			return;
		var count = pedcache.get_count(opts);
		if (has_browser_storage(opts)) {   // local storage
			set_browser_store(opts, get_prefix(opts)+count, JSON.stringify(opts.dataset));
		} else {   // TODO :: array cache
			console.warn('Local storage not found/supported for this browser!', opts.store_type);
			max_limit = 500;
			if(get_arr(opts) === undefined)
				dict_cache[get_prefix(opts)] = [];
			get_arr(opts).push(JSON.stringify(opts.dataset));
		}
		if(count < max_limit)
			count++;
		else
			count = 0;
		set_count(opts, count);
	};

	pedcache.nstore = function(opts) {
		if(has_browser_storage(opts)) {
			for(var i=max_limit; i>0; i--) {
				if(get_browser_store(opts, get_prefix(opts)+(i-1)) !== null)
					return i;
			}
		} else {
			return (get_arr(opts) && get_arr(opts).length > 0 ? get_arr(opts).length : -1);
		}
		return -1;
	};

	pedcache.current = function(opts) {
		var current = pedcache.get_count(opts)-1;
		if(current == -1)
			current = max_limit-1;
		if(has_browser_storage(opts))
			return JSON.parse(get_browser_store(opts, get_prefix(opts)+current));
		else if(get_arr(opts))
			return JSON.parse(get_arr(opts)[current]);
	};

	pedcache.last = function(opts) {
		if(has_browser_storage(opts)) {
			for(var i=max_limit; i>0; i--) {
				var it = get_browser_store(opts, get_prefix(opts)+(i-1));
				if(it !== null) {
					set_count(opts, i);
					return JSON.parse(it);
				}
			}
		} else {
			var arr = get_arr(opts);
			if(arr)
				return JSON.parse(arr(arr.length-1));
		}
		return undefined;
	};

	pedcache.previous = function(opts, previous) {
		if(previous === undefined)
			previous = pedcache.get_count(opts) - 2;

		if(previous < 0) {
			var nstore = pedcache.nstore(opts);
			if(nstore < max_limit)
				previous = nstore - 1;
			else
				previous = max_limit - 1;
		}
		set_count(opts, previous + 1);
		if(has_browser_storage(opts))
			return JSON.parse(get_browser_store(opts, get_prefix(opts)+previous));
		else
			return JSON.parse(get_arr(opts)[previous]);
	};

	pedcache.next = function(opts, next) {
		if(next === undefined)
			next = pedcache.get_count(opts);
		if(next >= max_limit)
			next = 0;

		set_count(opts, parseInt(next) + 1);
		if(has_browser_storage(opts))
			return JSON.parse(get_browser_store(opts, get_prefix(opts)+next));
		else
			return JSON.parse(get_arr(opts)[next]);
	};

	pedcache.clear = function(opts) {
		if(has_browser_storage(opts))
			clear_browser_store(opts);
		dict_cache = {};
	};

	// zoom - store translation coords
	pedcache.setposition = function(opts, x, y, zoom) {
		if(has_browser_storage(opts)) {
			set_browser_store(opts, get_prefix(opts)+'_X', x);
			set_browser_store(opts, get_prefix(opts)+'_Y', y);
			if(zoom)
				set_browser_store(opts, get_prefix(opts)+'_ZOOM', zoom);
		} else {
			//TODO
		}
	};

	pedcache.getposition = function(opts) {
		if(!has_browser_storage(opts) ||
			(localStorage.getItem(get_prefix(opts)+'_X') === null &&
			 sessionStorage.getItem(get_prefix(opts)+'_X') === null))
			return [null, null];
		var pos = [parseInt(get_browser_store(opts, get_prefix(opts)+'_X')),
			   	   parseInt(get_browser_store(opts, get_prefix(opts)+'_Y'))];
		if(get_browser_store(get_prefix(opts)+'_ZOOM') !== null)
			pos.push(parseFloat(get_browser_store(opts, get_prefix(opts)+'_ZOOM')));
		return pos;
	};

export default pedcache;

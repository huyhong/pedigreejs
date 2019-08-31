// let d3 = require('d3')
// import $ from 'jquery';

// let io = require('./io')
// let pbuttons = require('./pbuttons')
import pedcache from './pedcache';
// let pedigree_form = require('./pedigree_form')
// let pedigree_util = require('./pedigree_util')
import ptree from './ptree';
// let utils = require('./utils')
// let widgets = require('./widgets')

// Pedigree Tree Utils
	let pedigree_util = {};
	pedigree_util.buildTree = function(opts, person, root, partnerLinks, id) {
		if (typeof person.children === typeof undefined)
			person.children = pedigree_util.getChildren(opts.dataset, person);

		if (typeof partnerLinks === typeof undefined) {
			partnerLinks = [];
			id = 1;
		}

		var nodes = pedigree_util.flatten(root);
		//console.log('NAME='+person.name+' NO. CHILDREN='+person.children.length);
		var partners = [];
		$.each(person.children, function(i, child) {
			$.each(opts.dataset, function(j, p) {
				if (((child.name === p.mother) || (child.name === p.father)) && child.id === undefined) {
					var m = pedigree_util.getNodeByName(nodes, p.mother);
					var f = pedigree_util.getNodeByName(nodes, p.father);
					m = (m !== undefined? m : pedigree_util.getNodeByName(opts.dataset, p.mother));
					f = (f !== undefined? f : pedigree_util.getNodeByName(opts.dataset, p.father));
					if(!contains_parent(partners, m, f))
						partners.push({'mother': m, 'father': f});
				}
			});
		});
		$.merge(partnerLinks, partners);

		$.each(partners, function(i, ptr) {
			var mother = ptr.mother;
			var father = ptr.father;
			mother.children = [];
			var parent = {
					name : ptree.makeid(4),
					hidden : true,
					parent : null,
					father : father,
					mother : mother,
					children : pedigree_util.getChildren(opts.dataset, mother, father)
			};

			var midx = pedigree_util.getIdxByName(opts.dataset, mother.name);
			var fidx = pedigree_util.getIdxByName(opts.dataset, father.name);
			if(!('id' in father) && !('id' in mother))
				id = setChildrenId(person.children, id);

			// look at grandparents index
			var gp = pedigree_util.get_grandparents_idx(opts.dataset, midx, fidx);
			if(gp.fidx < gp.midx) {
				father.id = id++;
				parent.id = id++;
				mother.id = id++;
			} else {
				mother.id = id++;
				parent.id = id++;
				father.id = id++;
			}
			id = updateParent(mother, parent, id, nodes, opts);
			id = updateParent(father, parent, id, nodes, opts);
			person.children.push(parent);
		});
		id = setChildrenId(person.children, id);

		$.each(person.children, function(i, p) {
			id = pedigree_util.buildTree(opts, p, root, partnerLinks, id)[1];
		});
		return [partnerLinks, id];
	};

	// update parent node and sort twins
	function updateParent(p, parent, id, nodes, opts) {
		// add to parent node
		if('parent_node' in p)
			p.parent_node.push(parent);
		else
			p.parent_node = [parent];

		// check twins lie next to each other
		if(p.mztwin || p.dztwins) {
			var twins = pedigree_util.getTwins(opts.dataset, p);
			for(var i=0; i<twins.length; i++) {
				var twin = pedigree_util.getNodeByName(nodes, twins[i].name);
				if(twin)
					twin.id = id++;
			}
		}
		return id;
	}

	function setChildrenId(children, id) {
		// sort twins to lie next to each other
		children.sort(function(a, b) {
			if(a.mztwin && b.mztwin && a.mztwin == b.mztwin)
				return 0;
			else if(a.dztwin && b.dztwin && a.dztwin == b.dztwin)
				return 0;
			else if(a.mztwin || b.mztwin || a.dztwin || b.dztwin)
				return 1;
			return 0;
		});

		$.each(children, function(i, p) {
			if(p.id === undefined) p.id = id++;
		});
		return id;
	}

	pedigree_util.isProband = function(obj) {
		return typeof $(obj).attr('proband') !== typeof undefined && $(obj).attr('proband') !== false;
	};

	pedigree_util.setProband = function(dataset, name, is_proband) {
		$.each(dataset, function(i, p) {
			if (name === p.name)
				p.proband = is_proband;
			else
				delete p.proband;
		});
	};

	pedigree_util.getProbandIndex = function(dataset) {
		var proband;
		$.each(dataset, function(i, val) {
			if (pedigree_util.isProband(val)) {
				proband = i;
				return proband;
			}
		});
		return proband;
	};

	pedigree_util.getChildren = function(dataset, mother, father) {
		var children = [];
		var names = [];
		if(mother.sex === 'F')
			$.each(dataset, function(i, p) {
				if(mother.name === p.mother)
					if(!father || father.name == p.father) {
						if($.inArray(p.name, names) === -1){
							children.push(p);
							names.push(p.name);
						}
					}
			});
		return children;
	};

	function contains_parent(arr, m, f) {
		for(var i=0; i<arr.length; i++)
			if(arr[i].mother === m && arr[i].father === f)
				return true;
		return false;
	}

	// get the siblings of a given individual - sex is an optional parameter
	// for only returning brothers or sisters
	pedigree_util.getSiblings = function(dataset, person, sex) {
		if(person === undefined || !person.mother || person.noparents)
			return [];

		return $.map(dataset, function(p, i){
			return  p.name !== person.name && !('noparents' in p) && p.mother &&
			       (p.mother === person.mother && p.father === person.father) &&
			       (!sex || p.sex == sex) ? p : null;
		});
	};

	// get the siblings + adopted siblings
	pedigree_util.getAllSiblings = function(dataset, person, sex) {
		return $.map(dataset, function(p, i){
			return  p.name !== person.name && !('noparents' in p) && p.mother &&
			       (p.mother === person.mother && p.father === person.father) &&
			       (!sex || p.sex == sex) ? p : null;
		});
	};

	// get the mono/di-zygotic twin(s)
	pedigree_util.getTwins = function(dataset, person) {
		var sibs = pedigree_util.getSiblings(dataset, person);
		var twin_type = (person.mztwin ? "mztwin" : "dztwin");
		return $.map(sibs, function(p, i){
			return p.name !== person.name && p[twin_type] == person[twin_type] ? p : null;
		});
	};

	// get the adopted siblings of a given individual
	pedigree_util.getAdoptedSiblings = function(dataset, person) {
		return $.map(dataset, function(p, i){
			return  p.name !== person.name && 'noparents' in p &&
			       (p.mother === person.mother && p.father === person.father) ? p : null;
		});
	};

	pedigree_util.getAllChildren = function(dataset, person, sex) {
		return $.map(dataset, function(p, i){
			return !('noparents' in p) &&
			       (p.mother === person.name || p.father === person.name) &&
			       (!sex || p.sex === sex) ? p : null;
		});
	};

	// get the depth of the given person from the root
	pedigree_util.getDepth = function(dataset, name) {
		var idx = pedigree_util.getIdxByName(dataset, name);
		var depth = 1;

		while(idx >= 0 && ('mother' in dataset[idx] || dataset[idx].top_level)){
			idx = pedigree_util.getIdxByName(dataset, dataset[idx].mother);
			depth++;
		}
		return depth;
	};

	// given an array of people get an index for a given person
	pedigree_util.getIdxByName = function(arr, name) {
		var idx = -1;
		$.each(arr, function(i, p) {
			if (name === p.name) {
				idx = i;
				return idx;
			}
		});
		return idx;
	};

	// get the nodes at a given depth sorted by their x position
	pedigree_util.getNodesAtDepth = function(fnodes, depth, exclude_names) {
		return $.map(fnodes, function(p, i){
			return p.depth == depth && !p.data.hidden && $.inArray(p.data.name, exclude_names) == -1 ? p : null;
		}).sort(function (a,b) {return a.x - b.x;});
	};

	// convert the partner names into corresponding tree nodes
	pedigree_util.linkNodes = function(flattenNodes, partners) {
		var links = [];
		for(var i=0; i< partners.length; i++)
			links.push({'mother': pedigree_util.getNodeByName(flattenNodes, partners[i].mother.name),
						'father': pedigree_util.getNodeByName(flattenNodes, partners[i].father.name)});
		return links;
	};

	// get ancestors of a node
	pedigree_util.ancestors = function(dataset, node) {
		var ancestors = [];
		function recurse(node) {
			if(node.data) node = node.data;
			if('mother' in node && 'father' in node && !('noparents' in node)){
				recurse(pedigree_util.getNodeByName(dataset, node.mother));
				recurse(pedigree_util.getNodeByName(dataset, node.father));
			}
			ancestors.push(node);
		}
		recurse(node);
		return ancestors;
	}

	// test if two nodes are consanguinous partners
	pedigree_util.consanguity = function(node1, node2, opts) {
		if(node1.depth !== node2.depth) // parents at different depths
			return true;
		var ancestors1 = pedigree_util.ancestors(opts.dataset, node1);
		var ancestors2 = pedigree_util.ancestors(opts.dataset, node2);
		var names1 = $.map(ancestors1, function(ancestor, i){return ancestor.name;});
		var names2 = $.map(ancestors2, function(ancestor, i){return ancestor.name;});
  		var consanguity = false;
  		$.each(names1, function( index, name ) {
  			if($.inArray(name, names2) !== -1){
  				consanguity = true;
  				return false;
  			}
  		});
  		return consanguity;
	}

	// return a flattened representation of the tree
	pedigree_util.flatten = function(root) {
		var flat = [];
		function recurse(node) {
			if(node.children)
				node.children.forEach(recurse);
			flat.push(node);
		}
		recurse(root);
		return flat;
	};

	// Adjust D3 layout positioning.
	// Position hidden parent node centring them between father and mother nodes. Remove kinks
	// from links - e.g. where there is a single child plus a hidden child
	pedigree_util.adjust_coords  = function(opts, root, flattenNodes) {
		function recurse(node) {
			if (node.children) {
				node.children.forEach(recurse);

				if(node.data.father !== undefined) { 	// hidden nodes
					var father = pedigree_util.getNodeByName(flattenNodes, node.data.father.name);
					var mother = pedigree_util.getNodeByName(flattenNodes, node.data.mother.name);
					var xmid = (father.x + mother.x) /2;
					if(!pedigree_util.overlap(opts, root.descendants(), xmid, node.depth, [node.data.name])) {
						node.x = xmid;   // centralise parent nodes
						var diff = node.x - xmid;
						if(node.children.length == 2 && (node.children[0].data.hidden || node.children[1].data.hidden)) {
							if(!(node.children[0].data.hidden && node.children[1].data.hidden)) {
								var child1 = (node.children[0].data.hidden ? node.children[1] : node.children[0]);
								var child2 = (node.children[0].data.hidden ? node.children[0] : node.children[1]);
								if( ((child1.x < child2.x && xmid < child2.x) || (child1.x > child2.x && xmid > child2.x)) &&
								    !pedigree_util.overlap(opts, root.descendants(), xmid, child1.depth, [child1.data.name])){
									child1.x = xmid;
								}
							}
						} else if(node.children.length == 1 && !node.children[0].data.hidden) {
							if(!pedigree_util.overlap(opts, root.descendants(), xmid, node.children[0].depth, [node.children[0].data.name]))
								node.children[0].x = xmid;
						} else {
							if(diff !== 0 && !nodesOverlap(opts, node, diff, root)){
								if(node.children.length == 1) {
									node.children[0].x = xmid;
								} else {
									var descendants = node.descendants();
									if(opts.DEBUG)
										console.log('ADJUSTING '+node.data.name+' NO. DESCENDANTS '+descendants.length+' diff='+diff);
									for(var i=0; i<descendants.length; i++) {
										if(node.data.name !== descendants[i].data.name)
											descendants[i].x -= diff;
									}
								}
							}
						}
					} else if((node.x < father.x && node.x < mother.x) || (node.x > father.x && node.x > mother.x)){
							node.x = xmid;   // centralise parent nodes if it doesn't lie between mother and father
					}
				}
			}
		}
		recurse(root);
		recurse(root);
	};

	// test if moving siblings by diff overlaps with other nodes
	function nodesOverlap(opts, node, diff, root) {
		var descendants = node.descendants();
		var descendantsNames = $.map(descendants, function(descendant, i){return descendant.data.name;});
		var nodes = root.descendants();
		for(var i=0; i<descendants.length; i++){
			var descendant = descendants[i];
			if(node.data.name !== descendant.data.name){
				var xnew = descendant.x - diff;
				if(pedigree_util.overlap(opts, nodes, xnew, descendant.depth, descendantsNames))
					return true;
			}
		}
		return false;
	}

	// test if x position overlaps a node at the same depth
	pedigree_util.overlap = function(opts, nodes, xnew, depth, exclude_names) {
		for(var n=0; n<nodes.length; n++) {
			if(depth == nodes[n].depth && $.inArray(nodes[n].data.name, exclude_names) == -1){
				if(Math.abs(xnew - nodes[n].x) < (opts.symbol_size*1.15))
					return true;
			}
		}
		return false;
	};

	// given a persons name return the corresponding d3 tree node
	pedigree_util.getNodeByName = function(nodes, name) {
		for (var i = 0; i < nodes.length; i++) {
			if(nodes[i].data && name === nodes[i].data.name)
				return nodes[i];
			else if (name === nodes[i].name)
				return nodes[i];
		}
	};

	// given the name of a url param get the value
	pedigree_util.urlParam = function(name){
	    var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
	    if (results===null)
	       return null;
	    else
	       return results[1] || 0;
	};

	// get grandparents index
	pedigree_util.get_grandparents_idx = function(dataset, midx, fidx) {
		var gmidx = midx;
		var gfidx = fidx;
		while(  'mother' in dataset[gmidx] && 'mother' in dataset[gfidx] &&
			  !('noparents' in dataset[gmidx]) && !('noparents' in dataset[gfidx])){
			gmidx = pedigree_util.getIdxByName(dataset, dataset[gmidx].mother);
			gfidx = pedigree_util.getIdxByName(dataset, dataset[gfidx].mother);
		}
		return {'midx': gmidx, 'fidx': gfidx};
	};

	// Set or remove proband attributes.
	// If a value is not provided the attribute is removed from the proband.
	// 'key' can be a list of keys or a single key.
	pedigree_util.proband_attr = function(opts, keys, value){
		var proband = opts.dataset[ pedigree_util.getProbandIndex(opts.dataset) ];
		pedigree_util.node_attr(opts, proband.name, keys, value);
	}

	// Set or remove node attributes.
	// If a value is not provided the attribute is removed.
	// 'key' can be a list of keys or a single key.
	pedigree_util.node_attr = function(opts, name, keys, value){
		var newdataset = ptree.copy_dataset(pedcache.current(opts));
		var node = pedigree_util.getNodeByName(newdataset, name);
		if(!node){
			console.warn("No person defined");
			return;
		}

		if(!$.isArray(keys)) {
			keys = [keys];
		}

		if(value) {
			for(var i=0; i<keys.length; i++) {
				var k = keys[i];
				//console.log('VALUE PROVIDED', k, value, (k in node));
				if(k in node && keys.length === 1) {
					if(node[k] === value)
						return;
					try{
					   if(JSON.stringify(node[k]) === JSON.stringify(value))
						   return;
					} catch(e){}
				}
				node[k] = value;
			}
		} else {
			var found = false;
			for(var i=0; i<keys.length; i++) {
				var k = keys[i];
				//console.log('NO VALUE PROVIDED', k, (k in node));
				if(k in node) {
					delete node[k];
					found = true;
				}
			}
			if(!found)
				return;
		}
        ptree.syncTwins(newdataset, node);
		opts.dataset = newdataset;
		ptree.rebuild(opts);
	}

	// add a child to the proband; giveb sex, age, yob and breastfeeding months (optional)
	pedigree_util.proband_add_child = function(opts, sex, age, yob, breastfeeding){
		var newdataset = ptree.copy_dataset(pedcache.current(opts));
		var proband = newdataset[ pedigree_util.getProbandIndex(newdataset) ];
		if(!proband){
			console.warn("No proband defined");
			return;
		}
		var newchild = ptree.addchild(newdataset, proband, sex, 1)[0];
	    newchild.age = age;
	    newchild.yob = yob;
	    if(breastfeeding !== undefined)
	    	newchild.breastfeeding = breastfeeding;
		opts.dataset = newdataset;
		ptree.rebuild(opts);
		return newchild.name;
	}

	// delete node using the name
	pedigree_util.delete_node_by_name = function(opts, name){
		function onDone(opts, dataset) {
			// assign new dataset and rebuild pedigree
			opts.dataset = dataset;
			ptree.rebuild(opts);
		}
		var newdataset = ptree.copy_dataset(pedcache.current(opts));
		var node = pedigree_util.getNodeByName(pedcache.current(opts), name);
		if(!node){
			console.warn("No node defined");
			return;
		}
		ptree.delete_node_dataset(newdataset, node, opts, onDone);
	}

	// check by name if the individual exists
	pedigree_util.exists = function(opts, name){
		return pedigree_util.getNodeByName(pedcache.current(opts), name) !== undefined;
	}

	// print options and dataset
	pedigree_util.print_opts = function(opts){
    	$("#pedigree_data").remove();
    	$("body").append("<div id='pedigree_data'></div>" );
    	var key;
    	for(var i=0; i<opts.dataset.length; i++) {
    		var person = "<div class='row'><strong class='col-md-1 text-right'>"+opts.dataset[i].name+"</strong><div class='col-md-11'>";
    		for(key in opts.dataset[i]) {
    			if(key === 'name') continue;
    			if(key === 'parent')
    				person += "<span>"+key + ":" + opts.dataset[i][key].name+"; </span>";
    			else if (key === 'children') {
    				if (opts.dataset[i][key][0] !== undefined)
    					person += "<span>"+key + ":" + opts.dataset[i][key][0].name+"; </span>";
    			} else
    				person += "<span>"+key + ":" + opts.dataset[i][key]+"; </span>";
    		}
    		$("#pedigree_data").append(person + "</div></div>");

    	}
    	$("#pedigree_data").append("<br /><br />");
    	for(key in opts) {
    		if(key === 'dataset') continue;
    		$("#pedigree_data").append("<span>"+key + ":" + opts[key]+"; </span>");
    	}
	};

export default pedigree_util;
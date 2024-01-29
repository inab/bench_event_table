import $ from 'jquery';
import 'jquery-ui/themes/base/core.css';
import 'jquery-ui/themes/base/theme.css';
import 'jquery-ui/themes/base/tabs.css';
import 'jquery-ui/ui/core';
import 'jquery-ui/ui/widgets/tabs';
import './app.css';
import urljoin from 'url-join';
import { createApolloFetch } from 'apollo-fetch';

let quartile_name_map = {
	1: 'Q1', 
	2: 'Q2', 
	3: 'Q3', 
	4: 'Q4'
};

let quartile_css_map = {
	1: 'Q1', 
	2: 'Q2', 
	3: 'Q3', 
	4: 'Q4'
};

function fill_in_table(divid, aggregations, mode, tool_elixir_ids, community_id, chunk_size) {
	// every time a new classification is compute the previous results table is deleted (if it exists)
	remove_table(divid);

	let known_tools = {};
	let ordered_tools = [];
	// Group by challenge
	let challenges = {};
	let challenges_list = [];
	let num_charts = 0;
	aggregations.forEach((aggregation, num) => {
		if("participants" in aggregation) {
			Object.keys(aggregation.participants).forEach((toolname, i) => {
				if(!(toolname in known_tools)) {
					known_tools[toolname] = true;
					ordered_tools.push(toolname);
				}
			});
			if(!(aggregation._id in challenges)) {
				challenges[aggregation._id] = [];
				challenges_list.push(challenges[aggregation._id]);
			}
			challenges[aggregation._id].push(aggregation);
			num_charts++;
		}
	});
	
	let aggregation_slices = challenges_list.reduce((aggregation_slices, aggregations) => {
		let lastidx = aggregation_slices.length - 1;
		if(lastidx == -1 || (aggregation_slices[lastidx].members.length + aggregations.length) >= chunk_size) {
			let aggregation_tab = {
				from: aggregations[0].challenge_acronym,
				to: aggregations[0].challenge_acronym,
				members: [...aggregations],	
			};
			aggregation_slices.push(aggregation_tab);
		} else {
			let aggregation_tab = aggregation_slices[lastidx];
			aggregation_tab.members.push(...aggregations);
			aggregation_tab.to = aggregations[0].challenge_acronym;
		}
		
		return aggregation_slices;
	}, []);

	let slicesdiv = document.createElement('div');
	let slicesdiv_id = divid + '_oeb-table-scroll'
	slicesdiv.id = slicesdiv_id;
	let parentDivTable = document.getElementById(divid);
	parentDivTable.appendChild(slicesdiv);
	
	let tablist = document.createElement("ul");
	slicesdiv.appendChild(tablist);

	// The report, disabled tab
	let challenge_report = document.createElement("li");
	let rep_a = document.createElement("a");
	rep_a.href = "#" + slicesdiv_id + "-summary";
	let rep_b = document.createElement("b");
	rep_b.appendChild(document.createTextNode(challenges_list.length.toString() + " Challenges, " + num_charts.toString() + " charts"))
	rep_a.appendChild(rep_b);
	challenge_report.appendChild(rep_a);
	tablist.appendChild(challenge_report);

	// Now, each slice
	aggregation_slices.forEach((aggregations_slice, slice_i) => {
		let tabheader = document.createElement("li");
		let tab_a = document.createElement("a");
		let shift_slice_id = slicesdiv_id + "-" + slice_i;
		tab_a.href = "#" + shift_slice_id;
		
		let span_from = document.createElement("span");
		span_from.appendChild(document.createTextNode(aggregations_slice.from));
		span_from.setAttribute("class", "tablimits");
		tab_a.appendChild(span_from);
		let tabtext;
		let tabtextnode;
		if(aggregations_slice.from === aggregations_slice.to) {
			tabtext = aggregations_slice.from;
		} else {
			tabtext = aggregations_slice.from + " to " + aggregations_slice.to;
			
			let span_to = document.createElement("span");
			span_to.appendChild(document.createTextNode("\u00A0to " + aggregations_slice.to));
			span_to.setAttribute("class", "tablimits");
			tab_a.appendChild(span_to);
		}
		tab_a.setAttribute("title", tabtext);
		
		tabheader.appendChild(tab_a);
		tablist.appendChild(tabheader);

		let scrollableDiv = fill_in_table_slice(aggregations_slice.members, mode, tool_elixir_ids, community_id, ordered_tools);
		scrollableDiv.id = shift_slice_id;
		slicesdiv.appendChild(scrollableDiv);
	});
	// This one disables the first tab, which is used to give a summary
	$(slicesdiv).tabs({ disabled: [0], active: 1 });
}

function fill_in_table_slice(aggregations, mode, tool_elixir_ids, community_id, ordered_tools) {
	let scrollableDiv = document.createElement('div');
	scrollableDiv.className = 'oeb-table-scroll';

	//create table dinamically
	let table = document.createElement('table');
	table.className = 'oeb-main-table';


	scrollableDiv.appendChild(table);

	let thead = document.createElement('thead');
	let tbody = document.createElement('tbody');
	table.appendChild(thead);
	table.appendChild(tbody);

	//add challenge and tool fixed top left
	let challenges_row = thead.insertRow();
	let ch_th = document.createElement('th');
	ch_th.innerHTML = '<b>Challenges&nbsp;&#8594</b>';
	challenges_row.appendChild(ch_th);

	let aggregations_row = thead.insertRow();
	let th = document.createElement('th');
	th.innerHTML = '<b>Charts&nbsp;&#8594  <br>Participants&nbsp;&#8595</b>';
	aggregations_row.appendChild(th);

	// append rows with all participants in the benchmark

	ordered_tools.forEach((toolname) => {
		let row = tbody.insertRow(-1);
		let th = document.createElement('th');
		let divpart = document.createElement('div');
		divpart.setAttribute("class", "aggregation_cell");
		th.appendChild(divpart);
		
		let a = document.createElement("a");
		if (tool_elixir_ids[toolname] != null) {
			let technical_url = urljoin('https://' + mode + '.bsc.es/tool/', tool_elixir_ids[toolname]);
			a.setAttribute("href", technical_url);
			a.setAttribute("target", "_blank");
		}
		a.appendChild(document.createTextNode(toolname));
		a.setAttribute("title", toolname);
		divpart.appendChild(a);
		th.dataset.toolname = toolname;
		row.appendChild(th);
	});	
	
	// It has to be done in two passes because the number of rows have to be "known" beforehand
	let drawn_challenge_headers = {};
	aggregations.forEach((aggregation, num) => {
		if("participants" in aggregation) {
			// append columns with aggregations and results
			let column_value_dict = {};
			Object.keys(aggregation.participants).forEach((toolname, j) => {
				column_value_dict[toolname] = aggregation.participants[toolname];
			});

			// Challenge specific cell
			let url = urljoin('https://' + mode + '.bsc.es/scientific/', community_id, aggregation._id);
			let the_colspan = 1;
			let ch_th = null;
			if(aggregation._id in drawn_challenge_headers) {
				// Increase the colspan
				ch_th = drawn_challenge_headers[aggregation._id];
				let colspanstr = ch_th.getAttribute("colspan");
				the_colspan = parseInt(colspanstr);
				the_colspan++;
			} else {
				ch_th = document.createElement('th');
				let aggdivcell = document.createElement("div");
				aggdivcell.setAttribute("class", "aggregation_cell");

				let a = document.createElement("a");
				a.setAttribute("href", url);
				a.setAttribute("target", "blank");
				let acronym = "challenge_acronym" in aggregation ? aggregation.challenge_acronym : aggregation.acronym;
				a.appendChild(document.createTextNode(acronym));
				a.setAttribute("title", acronym);
				aggdivcell.appendChild(a);
				ch_th.appendChild(aggdivcell);
				ch_th.id = aggregation._id;
				challenges_row.appendChild(ch_th);
				drawn_challenge_headers[aggregation._id] = ch_th;
			}
			ch_th.setAttribute("colspan", the_colspan.toString());

			// Aggregation specific cell
			let th = document.createElement('th');
			let divcell = document.createElement("div");
			divcell.setAttribute("class", "aggregation_cell");
			let a = document.createElement("a");
			//a.setAttribute("href", url);
			//a.setAttribute("target", "blank");
			aggregation.metrics.forEach((m_entry, m_entry_i) => {
				if(m_entry_i > 0) {
					a.appendChild(document.createElement('br'));
					let span = document.createElement("span");
					span.setAttribute("class", "notbold italic");
					span.appendChild(document.createTextNode('vs'));
					a.appendChild(span);
					a.appendChild(document.createElement('br'));
				}
				let content;
				if(m_entry == null) {
					console.log("FIXME: metrics label not in challenge", aggregation);
					content = document.createElement("i");
					content.appendChild(document.createTextNode("undefined"));
				} else {
					content = document.createTextNode(m_entry.title);
				}
				a.appendChild(content);
			});
			divcell.appendChild(a);
			th.appendChild(divcell);
			th.id = aggregation.aggregation_id;
			aggregations_row.appendChild(th);

			// open loop for each row and append cell
			ordered_tools.forEach((row_tool_name, i) => {
				//non headers
				let cell = tbody.rows[i].insertCell();
				let cellval = '-';
				if(row_tool_name in column_value_dict) {
					cellval = quartile_name_map[column_value_dict[row_tool_name]];
					cell.setAttribute("class", quartile_css_map[column_value_dict[row_tool_name]]);
				}
				cell.appendChild(document.createTextNode(cellval));
			});
		}
	});
	
	return scrollableDiv;
}

async function fetchUrl(url, http_method, challenge_list) {
	try {
		let request1;

		if (http_method == 'GET') {
			return await fetch(url);
		} else {
			return await fetch(url, {
				method: 'POST',
				body: JSON.stringify(challenge_list)
			});
		}
	} catch (err) {
		console.log(`Invalid Url Error: ${err.stack} `, url);
	}
}

function compute_classification(divid, selected_classifier, challenge_list, chunk_size) {
	show_loading_spinner(divid, true);

	//check for mode by default it is production if no param is given
	var mode = $('#' + divid).data('mode') ? $('#' + divid).data('mode') : 'openebench';

	const api_url = $('#' + divid).data("api-url")
	const bench_event_api_url = $('#' + divid).data("bench-event-api-url") ? $('#' + divid).data("bench-event-api-url") : 'https://openebench.bsc.es/rest/bench_event_api'

	var path_data = $('#' + divid).data('benchmarkingevent') + '/' + selected_classifier;
	path_data = urljoin(bench_event_api_url, path_data);
	let http_method;

	if (challenge_list.length === undefined || challenge_list.length == 0) {
		http_method = 'GET';
	} else {
		http_method = 'POST';
	}

	fetchUrl(path_data, http_method, challenge_list)
		.then(response => {
			if (!response.ok) {
				throw response;
			}
			return response.json();
		})
		.then(results => {
			if ((results.data !== undefined && results.data == null) || results.length == 0) {
				show_loading_spinner(divid, false);
				document.getElementById(divid).innerHTML = "";
				var para = document.createElement('div');
				para.className = 'alert alert-info';
				var err_txt = document.createTextNode(
					"No data available for the benchmarking event: '" + $('#' + divid).data('benchmarkingevent') + "'"
				);
				para.appendChild(err_txt);
				var element = document.getElementById(divid);
				element.appendChild(para);
			} else {
				var bench_id = $('#' + divid).data('benchmarkingevent');
				var community_id = 'OEBC' + bench_id.substring(4, 7);

				const fetch = createApolloFetch({
					//fallback to legacy if no api_url is defined
					uri: api_url ? api_url : urljoin('https://' + mode + '.bsc.es/', 'sciapi/graphql')
				});

				const fetchData = () =>
					fetch({
						query: `query getTools($community_id: String!){
                            getTools(toolFilters:{community_id: $community_id}) {
                                registry_tool_id
                                name
                            }
                        }`,
						variables: { community_id: community_id }
					});

				fetchData().then(response => {
					let tool_list = response.data.getTools;

					// iterate over the list of tools to generate a dictionary
					let tool_elixir_ids = {};
					tool_list.forEach(function(tool) {
						if (tool.registry_tool_id != null) {
							tool_elixir_ids[tool.name] = tool.registry_tool_id.split(':')[1].toLowerCase();
						} else {
							tool_elixir_ids[tool.name] = null;
						}
					});

					fill_in_table(divid, results, mode, tool_elixir_ids, community_id, chunk_size);
					show_loading_spinner(divid, false);
				});
			}
		})
		.catch(err => console.log(err));
}

function load_table(divid, challenge_list = [], classifier = 'diagonal', chunk_size = 10) {
	let element = document.getElementById(divid + '_bench_dropdown_list');
	if (element == null) {
		//add dropdown list
		let list = document.createElement('select');
		list.id = divid + '_bench_dropdown_list';
		list.className = 'classificator_list';
		let bench_table = document.getElementById(divid);

		let list_label = document.createElement('label');
		list_label.htmlFor = divid + '_bench_dropdown_list';
		list_label.innerText = 'Classification Method:';

		// add option group
		let group = document.createElement('OptGroup');
		group.label = 'Select a classification method:';
		list.add(group);

		// add list options
		let option1 = document.createElement('option');
		option1.class = 'selection_option';
		option1.id = divid + '_classificator__squares';
		option1.title = 'Apply square quartiles classification method (based on the 0.5 quartile of the X and Y metrics)';
		option1.data = ('toggle', 'list_tooltip');
		option1.data = ('container', '#tooltip_container');
		option1.value = 'squares';
		option1.innerHTML = 'SQUARE QUARTILES';

		let option2 = document.createElement('option');
		option2.class = 'selection_option';
		option2.id = divid + '_classificator__diagonals';
		option2.title =
			"Apply diagonal quartiles classifcation method (based on the assignment of a score to each participant proceeding from its distance to the 'optimal performance' corner)";
		option2.data = ('toggle', 'list_tooltip');
		option2.data = ('container', '#tooltip_container');
		option2.value = 'diagonals';
		option2.innerHTML = 'DIAGONAL QUARTILES';

		let option3 = document.createElement('option');
		option3.class = 'selection_option';
		option3.id = divid + 'classificator__clusters';
		option3.title = 'Apply k-means clustering algorithm to group the participants';
		option3.data = ('toggle', 'list_tooltip');
		option3.data = ('container', '#tooltip_container');
		option3.value = 'clusters';
		option3.innerHTML = 'K-MEANS CLUSTERING';

		group.appendChild(option1);
		group.appendChild(option2);
		group.appendChild(option3);

		let selected_classifier = classifier;

		if (selected_classifier) {
			switch (selected_classifier) {
				case 'squares':
					option1.selected = 'disabled';
					break;
				case 'diagonals':
					option2.selected = 'disabled';
					break;
				case 'clusters':
					option3.selected = 'disabled';
					break;
				default:
					option2.selected = 'disabled';
					break;
			}
		}

		bench_table.appendChild(list_label);
		bench_table.appendChild(list);
	}

	let droplist = document.getElementById(divid + '_bench_dropdown_list');
	$('#' + divid + '_bench_dropdown_list').off();
	$(droplist).on('change', function() {
		//compute_classification(divid, this.options[this.selectedIndex].id.split('__')[1], challenge_list, chunk_size);
		compute_classification(divid, this.options[this.selectedIndex].value, challenge_list, chunk_size);
	});

	//compute_classification(divid, droplist.options[droplist.selectedIndex].id.split('__')[1], challenge_list, chunk_size);
	compute_classification(divid, droplist.options[droplist.selectedIndex].value, challenge_list, chunk_size);
}

function run_summary_table(challenge_list = [], active_table = null) {
	if (challenge_list.length == 0 && active_table == null) {
		let tables = document.getElementsByClassName('oeb-table');
		let i = 0;
		let dataId;
		let y;

		// append ids to divs
		i = 0;
		for (y of tables) {
			// get benchmarking event id
			dataId = y.getAttribute('data-benchmarkingevent');

			//set chart id
			var divid = dataId.replace(':', '_');
			y.id = divid;
			remove_table(divid);
			load_table(divid, challenge_list);
			i++;
		}
	} else {
		remove_table(active_table);
		load_table(active_table, challenge_list);
	}
}

function remove_table(divid){
	let the_div = document.getElementById(divid + '_oeb-table-scroll');
	if (the_div != null) {
		the_div.remove();
	}
}

function show_loading_spinner(divid, loading){
	if (!document.getElementById('loading')){
		var loadingSpinner = document.createElement('div');
		loadingSpinner.id = 'loading';
		document.getElementById(divid).appendChild(loadingSpinner);
	}
	if (loading) {
		document.getElementById('loading').style.display = "inline-block";
	} else {
		document.getElementById('loading').style.display = "none";
	}
}

export { run_summary_table };

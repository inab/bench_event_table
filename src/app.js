import $ from 'jquery';
import './app.css';
import urljoin from 'url-join';
import { createApolloFetch } from 'apollo-fetch';

function fill_in_table(divid, challenges, mode, tool_elixir_ids, community_id) {
	// every time a new classification is compute the previous results table is deleted (if it exists)
	remove_table(divid)

	var scrollableDiv = document.createElement('div');
	scrollableDiv.id = divid + 'oeb-table-scroll';
	scrollableDiv.className = 'oeb-table-scroll';

	//create table dinamically
	var table = document.createElement('table');
	table.id = divid + '-oeb-main-table';
	table.className = 'oeb-main-table';

	var divTable = document.getElementById(divid);

	scrollableDiv.appendChild(table);
	divTable.appendChild(scrollableDiv);

	var thead = document.createElement('thead');
	var tbody = document.createElement('tbody');
	table.appendChild(thead);
	table.appendChild(tbody);

	//add challenge and tool fixed top left
	var row = thead.insertRow(-1);
	var th = document.createElement('th');
	th.innerHTML = '<b>CHALLENGE &#8594  <br> TOOL &#8595</b>';
	row.appendChild(th);

	// append rows with all participants in the benchmark

	var quartile_name_map = {
		1: 'Q1', 
		2: 'Q2', 
		3: 'Q3', 
		4: 'Q4'
	};

	Object.keys(challenges[0].participants).forEach(function(toolname, i) {
		var row = tbody.insertRow(-1);
		var th = document.createElement('th');
		if (tool_elixir_ids[toolname] != null) {
			var technical_url = urljoin('https://' + mode + '.bsc.es/tool/', tool_elixir_ids[toolname]);
			th.innerHTML = "<a href='" + technical_url + "'>" + toolname + '</a>';
		} else {
			th.innerHTML = '<a>' + toolname + '</a>';
		}
		th.dataset.toolname = toolname;
		row.appendChild(th);
	});

	// append columns with challenges and results
	for (var num = 0; num < challenges.length; num++) {
		var column_value_dict = {challengeName: challenges[num].acronym};
		Object.keys(challenges[num].participants).forEach(function(toolname, j) {
			column_value_dict[toolname] = challenges[num].participants[toolname];
		});
		// open loop for each row and append cell

		//first row with headers
		for (var i = 0; i < table.rows.length; i++) {
			if (i == 0) {
				var url = urljoin('https://' + mode + '.bsc.es/scientific/', community_id, challenges[num]._id);
				var th = document.createElement('th');
				th.innerHTML = "<a href='" + url + "'>" + column_value_dict['challengeName'] + '</a>';
				th.id = column_value_dict['challengeName'];
				thead.rows[i].appendChild(th);
			} else {
				//non headers
				var cell = tbody.rows[i - 1].insertCell(table.rows[i].cells.length);
				const row_tool_name = table.rows[i].cells[0].dataset.toolname;
				cell.innerHTML = quartile_name_map[column_value_dict[row_tool_name]];
			}
		}
	}
}

function set_cell_colors() {
	var cell = $('td');

	cell.each(function() {
		//loop through all td elements ie the cells

		var cell_value = $(this).html(); //get the value

		if (cell_value == 'Q1') {
			//if then for if value is 1
			$(this).css({ background: '#238b45', color: '#ffffff' });
		} else if (cell_value == 'Q2') {
			$(this).css({ background: '#74c575' });
		} else if (cell_value == 'Q3') {
			$(this).css({ background: '#bbe4b3' });
		} else if (cell_value == 'Q4') {
			$(this).css({ background: '#edf8e9' });
		} else {
			$(this).css({ background: '#ffffff' });
		}
	});
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

function compute_classification(divid, selected_classifier, challenge_list) {
	show_loading_spinner(divid, true);

	//check for mode by default it is production if no param is given
	var mode = $('#' + divid).data('mode') ? $('#' + divid).data('mode') : 'openebench';

	const api_url = $('#' + divid).data("api-url")

	var path_data = $('#' + divid).data('benchmarkingevent') + '/' + selected_classifier;
	path_data = urljoin('https://openebench.bsc.es/rest/bench_event_api/', path_data);
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

					fill_in_table(divid, results, mode, tool_elixir_ids, community_id);
					set_cell_colors();
					show_loading_spinner(divid, false);
				});
			}
		})
		.catch(err => console.log(err));
}

function load_table(divid, challenge_list = [], classifier = 'diagonal') {
	var element = document.getElementById(divid + '_bench_dropdown_list');
	if (element == null) {
		//add dropdown list
		var list = document.createElement('select');
		list.id = divid + '_bench_dropdown_list';
		list.className = 'classificator_list';
		var bench_table = document.getElementById(divid);

		var list_label = document.createElement('label');
		list_label.htmlFor = divid + '_bench_dropdown_list';
		list_label.innerText = 'Classification Method:';

		// add option group
		var group = document.createElement('OptGroup');
		group.label = 'Select a classification method:';
		list.add(group);

		// add list options
		var option1 = document.createElement('option');
		option1.class = 'selection_option';
		option1.id = divid + '_classificator__squares';
		option1.title = 'Apply square quartiles classification method (based on the 0.5 quartile of the X and Y metrics)';
		option1.data = ('toggle', 'list_tooltip');
		option1.data = ('container', '#tooltip_container');
		option1.value = 'squares';
		option1.innerHTML = 'SQUARE QUARTILES';

		var option2 = document.createElement('option');
		option2.class = 'selection_option';
		option2.id = divid + '_classificator__diagonals';
		option2.title =
			"Apply diagonal quartiles classifcation method (based on the assignment of a score to each participant proceeding from its distance to the 'optimal performance' corner)";
		option2.data = ('toggle', 'list_tooltip');
		option2.data = ('container', '#tooltip_container');
		option2.value = 'diagonals';
		option2.innerHTML = 'DIAGONAL QUARTILES';

		var option3 = document.createElement('option');
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

		var selected_classifier = classifier;

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

	var list = document.getElementById(divid + '_bench_dropdown_list');
	$('#' + divid + '_bench_dropdown_list').off();
	$(list).on('change', function() {
		compute_classification(divid, this.options[this.selectedIndex].id.split('__')[1], challenge_list);
	});

	compute_classification(divid, list.options[list.selectedIndex].id.split('__')[1], challenge_list);
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
	if (document.getElementById(divid + '-oeb-main-table') != null) {
		document.getElementById(divid + '-oeb-main-table').remove();
		document.getElementById(divid + 'oeb-table-scroll').remove();
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

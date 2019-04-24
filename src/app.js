import $ from "jquery";
import './app.css';
import urljoin from 'url-join';
import { type } from "os";

function fill_in_table(divid, data) {
    //create table dinamically
    var table = document.getElementById(divid);
    var row = table.insertRow(-1);
    row.insertCell(0).innerHTML = "<b>&#8595; TOOL / CHALLENGE &#8594; </b>";
    // append rows with all participants in the benchmark
    Object.keys(data[Object.keys(data)[0]])
        .sort()
        .forEach(function (toolname, i) {
            var row = table.insertRow(-1);
            var cell = row.insertCell(0);
            cell.innerHTML = toolname;
            cell.id = toolname;
            // row.insertCell(1).innerHTML = data[key]["MuSiC"];
        });
    // append columns with challenges and results
    Object.keys(data)
        .sort()
        .forEach(function (key, i) {
            var column_values = [key];
            Object.keys(data[key])
                .sort()
                .forEach(function (toolname, j) {
                    column_values.push(data[key][toolname])
                });
            // open loop for each row and append cell
            for (var i = 0; i < table.rows.length; i++) {
                var cell = table.rows[i].insertCell(table.rows[i].cells.length);
                cell.innerHTML = column_values[i];
                // cell.className = "sibling-highlight";
                if (i == 0) {
                    var url = "https://dev-openebench.bsc.es/html/scientific/";

                    var bench_id = $('#bench_summary_table').data("input");

                    // url = urljoin(url, bench_id + "_" + key);
                    cell.id = column_values[i];
                    cell.className = "rotate";
                    // cell.innerHTML = "<a href='" + url + "' >" + column_values[i] + "</a>";
                    cell.innerHTML = "<div ><a href='" + url + "'>" + column_values[i].split("_")[1] + "</a></div>";
                }
            };

        });



};

function set_cell_colors() {

    var cell = $('td');

    cell.each(function () { //loop through all td elements ie the cells

        var cell_value = $(this).html(); //get the value

        if (cell_value == "1") { //if then for if value is 1
            $(this).css({ 'background': '#238b45', 'color': '#ffffff' });
        } else {
            $(this).css({ 'background': '#ffffff' });
        };

    });

};

async function fetchUrl(url, http_method, challenge_list) {

    try {
        let request1;

        if (http_method == "GET") {
            return await fetch(url);
        } else {
            return await fetch(url, {
                method: "POST",
                body: JSON.stringify(challenge_list)
            })
        }
    }
    catch (err) {
        console.log(`Invalid Url Error: ${err.stack} `, url);
    }

};


function compute_classification(selected_classifier, challenge_list) {

    // every time a new classification is compute the previous results table is deleted (if it exists)
    if (document.getElementById("bench_summary_table") != null) {
        document.getElementById("bench_summary_table").innerHTML = '';
    };

    var path_data = $('#bench_summary_table').data("input") + "/" + selected_classifier;
    path_data = urljoin("https://dev-openebench.bsc.es/bench_event/api/", path_data);
    let http_method;

    if (challenge_list.length === undefined || challenge_list.length == 0) {
        http_method = "GET"
    } else {
        http_method = "POST"
    }

    fetchUrl(path_data, http_method, challenge_list)
        .then(response => {
            if (!response.ok) {
                throw response
            }
            return response.json();
        })
        .then(results => {
            if (results.data !== undefined && results.data == null) {
                document.getElementById("bench_dropdown_list").remove();
                var para = document.createElement("td");
                para.id = "no_benchmark_data"
                var err_txt = document.createTextNode("No data available for the selected benchmark");
                para.appendChild(err_txt);
                var element = document.getElementById("bench_summary_table");
                element.appendChild(para);

            } else {
                fill_in_table("bench_summary_table", results);
                set_cell_colors();
            }
        }
        )
        .catch(err => console.log(err))
};


function load_table(challenge_list = [], classifier = "diagonal") {

    var element = document.getElementById('bench_dropdown_list');
    if (typeof (element) != 'undefined' && element != null) {
        document.getElementById("bench_dropdown_list").remove();
    }

    //add dropdown list
    var list = document.createElement("select");
    list.id = "bench_dropdown_list";
    list.className = "classificators_list";
    var bench_table = document.getElementById("bench_summary_table");
    bench_table.parentNode.insertBefore(list, bench_table);

    list.addEventListener('change', function (d) {
        compute_classification(this.options[this.selectedIndex].id.split("__")[1], challenge_list);
    });

    // add option group
    var group = document.createElement("OptGroup");
    group.label = "Select a classification method:";
    list.add(group);

    // add list options

    var option1 = document.createElement("option");
    option1.class = "selection_option";
    option1.id = "classificator__squares";
    option1.title = "Apply square quartiles classification method (based on the 0.5 quartile of the X and Y metrics)";
    option1.data = ("toggle", "list_tooltip");
    option1.data = ("container", "#tooltip_container");
    option1.value = "squares";
    option1.innerHTML = "SQUARE QUARTILES";

    var option2 = document.createElement("option");
    option2.class = "selection_option";
    option2.id = "classificator__diagonals";
    option2.title = "Apply diagonal quartiles classifcation method (based on the assignment of a score to each participant proceeding from its distance to the 'optimal performance' corner)";
    option2.data = ("toggle", "list_tooltip");
    option2.data = ("container", "#tooltip_container");
    option2.value = "diagonals";
    option2.innerHTML = "DIAGONAL QUARTILES";

    var option3 = document.createElement("option");
    option3.class = "selection_option";
    option3.id = "classificator__clusters";
    option3.title = "Apply k-means clustering algorithm to group the participants";
    option3.data = ("toggle", "list_tooltip");
    option3.data = ("container", "#tooltip_container");
    option3.value = "clusters";
    option3.innerHTML = "K-MEANS CLUSTERING";

    group.appendChild(option1);
    group.appendChild(option2);
    group.appendChild(option3);
    
    

    var selected_classifier = classifier
    
    if (selected_classifier) {
        
        switch (selected_classifier) {
            case "squares":
                option1.selected = "disabled";
                break;
            case "diagonals":
                option2.selected = "disabled";
                break;
            case "clusters":
                option3.selected = "disabled";
                break;
            default:
                option2.selected = "disabled";
                break;
        }
    }
    compute_classification(selected_classifier, challenge_list);

};

export { load_table };


// var challenge_list = [];
// load_table(challenge_list);
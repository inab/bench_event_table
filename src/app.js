import $ from "jquery";
import './app.css';
import urljoin from 'url-join';

function fill_in_table(divid, data, mode) {

    //create table dinamically
    var table = document.createElement('table')
    table.id = "oeb-main-table";
    table.className = "oeb-main-table";


    var divTable = document.getElementById(divid);

    
    divTable.appendChild(table);
    var thead = document.createElement('thead');
    var tbody = document.createElement('tbody');
    table.appendChild(thead);
    table.appendChild(tbody);


    //add challenge and tool fixed top left
    var row = thead.insertRow(-1)
    var th = document.createElement('th');
    th.innerHTML = "<b>CHALLENGE &#8594  <br> TOOL &#8595</b>";
    row.appendChild(th);

    
    // append rows with all participants in the benchmark
    Object.keys(data[0].participants).forEach(function (toolname, i) {
        var row = tbody.insertRow(-1);
        var th = document.createElement('th');
        var technical_url = urljoin("https://"+mode+".bsc.es/html/tool/", toolname.toLowerCase());
        th.innerHTML = "<a href='" + technical_url + "'>" + toolname + "</a>";
        row.appendChild(th);
    });


    // append columns with challenges and results
    for (var num = 0; num < data.length; num++) {

        var column_values = [data[num].acronym];
        Object.keys(data[num].participants).forEach(function (toolname, j) {
            column_values.push(data[num].participants[toolname])
        });
        // open loop for each row and append cell


        //first row with headers
        for (var i = 0; i < table.rows.length; i++) {
            if (i == 0) {
                var bench_id = $('#' + divid).data("benchmarkingevent")
                var community_id = "OEBC" + bench_id.substring(4, 7);
                
                var url = urljoin("https://"+mode+".bsc.es/html/scientific/", community_id, data[num]._id);
                var th = document.createElement('th');
                th.innerHTML = "<a href='" + url + "'>" + column_values[i] + "</a>";
                th.id = column_values[i];
                thead.rows[i].appendChild(th);
            } else {
                //non headers
                var cell = tbody.rows[i - 1].insertCell(table.rows[i].cells.length);
                cell.innerHTML = column_values[i];
            }
        };

    };
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
    if (document.getElementById("oeb-table-scroll") != null) {
        document.getElementById("oeb-table-scroll").innerHTML = '';
    };

    //check for mode by default it is production if no param is given
    var mode = $('#oeb-table-scroll').data("mode")? "dev-openebench" : "openebench"

    var path_data = $('#oeb-table-scroll').data("benchmarkingevent") + "/" + selected_classifier;
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
                var err_txt = document.createTextNode("No data available for the benchmarking event: '" + $('#oeb-table-scroll').data("benchmarkingevent") + "'");
                para.appendChild(err_txt);
                var element = document.getElementById("oeb-table-scroll");
                element.appendChild(para);

            } else {
                fill_in_table("oeb-table-scroll", results, mode);
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
    var bench_table = document.getElementById("oeb-table-scroll");
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

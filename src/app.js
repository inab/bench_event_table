import $ from "jquery";
import './app.css';
import urljoin from 'url-join';

function app_handle_listing_horisontal_scroll()
{
  //get table object   
  var table_obj = $('.summaryTable');
  
  //get count fixed collumns params
  var count_fixed_collumns = table_obj.attr('data-count-fixed-columns')
             
  if(count_fixed_collumns>0)
  {
    //get wrapper object
    var wrapper_obj = $('.table-scrollable');
    
    var wrapper_left_margin = 0;
    
    var table_collumns_width = new Array();    
    var table_collumns_margin = new Array();
    
    //calculate wrapper margin and fixed column width
    $('th',table_obj).each(function(index){
       if(index<count_fixed_collumns)
       {
         wrapper_left_margin += $(this).outerWidth();
         table_collumns_width[index] = $(this).outerWidth();
       }
    })
    
    //calcualte margin for each column  
    $.each( table_collumns_width, function( key, value ) {
      if(key==0)
      {
        table_collumns_margin[key] = wrapper_left_margin;
      }
      else
      {
        var next_margin = 0;
        $.each( table_collumns_width, function( key_next, value_next ) {
          if(key_next<key)
          {
            next_margin += value_next;
          }
        });
        
        table_collumns_margin[key] = wrapper_left_margin-next_margin;
      }
    });
     
    //set wrapper margin               
    if(wrapper_left_margin>0)
    {
      wrapper_obj.css('cssText','margin-left:'+wrapper_left_margin+'px !important; width: auto')
    }
    
    //set position for fixed columns
    $('tr',table_obj).each(function(){  
      
      //get current row height
      var current_row_height = $(this).outerHeight();
           
      $('th,td',$(this)).each(function(index){
         
         //set row height for all cells
         $(this).css('height',current_row_height)
         
         //set position 
         if(index<count_fixed_collumns)
         {                       
           $(this).css('position','absolute')
                  .css('margin-left','-'+table_collumns_margin[index]+'px')
                  .css('width',table_collumns_width[index])
                  
           $(this).addClass('table-fixed-cell')
         }
      })
    })    
  }
}  

function fill_in_table(divid, data){
    
    //create table dinamically
    var table = document.getElementById(divid);
    var row = table.insertRow(-1);
    var th = document.createElement('th');
    th.innerHTML = "<b>CHALLENGE &#8594 <br />&#8595; TOOL </b>";
    row.appendChild(th);

    // append rows with all participants in the benchmark
    Object.keys(data[0].participants).forEach(function (toolname, i) {
            var row = table.insertRow(-1);
            var th = document.createElement('th');
            var technical_url = urljoin("https://dev-openebench.bsc.es/html/tool/", toolname.toLowerCase());
            th.innerHTML = "<a href='" + technical_url + "'>" + toolname + "</a>";
            th.className = "row";
            row.appendChild(th);

        });
    // append columns with challenges and results
    for (var num = 0; num < data.length; num++) {

        var column_values = [data[num].acronym];
        Object.keys(data[num].participants).forEach(function (toolname, j) {
                column_values.push(data[num].participants[toolname])
        });
        // open loop for each row and append cell
        for (var i = 0; i < table.rows.length; i++) {
            

            if (i == 0) {
                
                var bench_id = $('#bench_summary_table').data("input");
                var community_id = "OEBC" + bench_id.substring(4, 7);
                var url = urljoin("https://dev-openebench.bsc.es/html/scientific/", community_id, data[num]._id);
                
                var th = document.createElement('th');
                th.innerHTML = "<a href='" + url + "'>" + column_values[i] + "</a>";
                th.className = "row";
                th.id = column_values[i];
                th.className = "col"
                table.rows[i].appendChild(th);

            } else {
                var cell = table.rows[i].insertCell(table.rows[i].cells.length);
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
                $(function(){
                    app_handle_listing_horisontal_scroll()
                })
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
    var bench_table = document.getElementById("table-scrollable");
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
import $ from "jquery";
import './app.css';

function fill_in_table (divid, data){
  //create table dinamically
  var table = document.getElementById(divid);
  
  var row = table.insertRow(-1);
  row.insertCell(0).innerHTML = "<b>&#8595; TOOL / CHALLENGE &#8594; </b>";

  // append rows with all participants in the benchmark
  Object.keys(data[Object.keys(data)[0]])
      .sort()
      .forEach(function(toolname, i) {
      var row = table.insertRow(-1);
      var cell = row.insertCell(0);
      cell.innerHTML = toolname;
      cell.id = toolname;
      // row.insertCell(1).innerHTML = data[key]["MuSiC"];
  });
  // append columns with challenges and results
  Object.keys(data)
      .sort()
      .forEach(function(key, i) {
        var column_values = [key];
        Object.keys(data[key])
        .sort()
        .forEach(function(toolname, j) {
            column_values.push(data[key][toolname])
        });
        // open loop for each row and append cell
        for ( var i = 0; i < table.rows.length; i++) {
            var cell = table.rows[i].insertCell(table.rows[i].cells.length);
            cell.innerHTML = column_values[i];
            if (i == 0) {
                var url = "https://dev-openebench.bsc.es/html/scientific/TCGA/TCGA:2018-04-05/TCGA:2018-04-05";

                url = url + "_" + key;

                cell.id = column_values[i];
                cell.innerHTML = "<a href='" + url + "' >"+column_values[i]+"</a>";
            }
        };

        });

  

};

function set_cell_colors(){

  var cell = $('td'); 

  cell.each(function() { //loop through all td elements ie the cells

      var cell_value = $(this).html(); //get the value

      if (cell_value == "1") { //if then for if value is 1
      $(this).css({'background' : '#238b45'});   
      } else {
      $(this).css({'background' : '#ffffff'});
      };

  });

  };

  async function fetchUrl(url) {

    try {
      let request1 = await fetch(url);
      let result = await request1.text();

        return JSON.parse(result);
      }
      catch (err) {
        console.log(`Invalid Url Error: ${err.stack} `);
      }
  
  };

  var path_data = $('#bench_summary_table').data("input");
  path_data = "http://127.0.0.1:5000/" + path_data;

  fetchUrl(path_data).then(results => {

    fill_in_table("bench_summary_table", results);
    set_cell_colors();
  })
  
  
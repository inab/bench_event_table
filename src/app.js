import $ from "jquery";
import "jquery-ui/themes/base/core.css";
import "jquery-ui/themes/base/theme.css";
import "jquery-ui/themes/base/tabs.css";
import "jquery-ui/ui/core";
import "jquery-ui/ui/widgets/tabs";
import "./app.css";
import urljoin from "url-join";
import { createApolloFetch } from "apollo-fetch";
import { loaderImage } from "./loaderImage.js";

let quartile_map = {
  1: {
    name: "Q1",
    css_class: "Q1",
  },
  2: {
    name: "Q2",
    css_class: "Q2",
  },
  3: {
    name: "Q3",
    css_class: "Q3",
  },
  4: {
    name: "Q4",
    css_class: "Q4",
  },
};

function fill_in_table(
  divid,
  aggregations,
  mode,
  tool_elixir_ids,
  community_id,
  benchmarking_event_id,
  chunk_size,
  api_url
) {
  let known_tools = {};
  let ordered_tools = [];
  let challenges = {};
  let challenges_list = [];
  let num_charts = 0;

  aggregations.forEach((aggregation, num) => {
    if ("participants" in aggregation) {
      Object.keys(aggregation.participants).forEach((toolname, i) => {
        if (!(toolname in known_tools)) {
          known_tools[toolname] = true;
          ordered_tools.push(toolname);
        }
      });
      if (!(aggregation._id in challenges)) {
        challenges[aggregation._id] = [];
        challenges_list.push(challenges[aggregation._id]);
      }
      challenges[aggregation._id].push(aggregation);
      if (Object.keys(aggregation.participants).length > 0) {
        num_charts++;
      }
    }
  });

  challenges_list.sort((a, b) => {
    const c_a = a[0].challenge_acronym.toUpperCase();
    const c_b = b[0].challenge_acronym.toUpperCase();

    return c_a < c_b ? -1 : c_a > c_b ? 1 : 0;
  });

  let empty_challenges_list = [];
  let used_challenges_list = [];
  challenges_list.forEach((aggregations) => {
    let challenge_num_charts = aggregations
      .map((aggregation) => Object.keys(aggregation.participants).length)
      .reduce((ps, a) => ps + a, 0);
    if (challenge_num_charts > 0) {
      used_challenges_list.push(aggregations);
    } else {
      empty_challenges_list.push(aggregations);
    }
  });

  let force_break = false;
  let reduce_lambda = (aggregation_slices, aggregations) => {
    let lastidx = aggregation_slices.length - 1;
    if (
      lastidx == -1 ||
      aggregation_slices[lastidx].members.length + aggregations.length >=
        chunk_size ||
      force_break
    ) {
      force_break = false;
      let aggregation_tab = {
        from: aggregations[0].challenge_acronym,
        to: aggregations[0].challenge_acronym,
        members: [...aggregations],
        empty_challenge: Object.keys(aggregations[0].participants).length === 0,
      };
      aggregation_slices.push(aggregation_tab);
    } else {
      let aggregation_tab = aggregation_slices[lastidx];
      aggregation_tab.members.push(...aggregations);
      aggregation_tab.to = aggregations[0].challenge_acronym;
    }

    return aggregation_slices;
  };

  let aggregation_slices = used_challenges_list.reduce(reduce_lambda, []);
  force_break = true;
  aggregation_slices = empty_challenges_list.reduce(
    reduce_lambda,
    aggregation_slices
  );

  let slicesdiv_id = remove_table(divid);
  let slicesdiv = document.createElement("div");
  slicesdiv.id = slicesdiv_id;
  let parentDivTable = document.getElementById(divid);
  parentDivTable.appendChild(slicesdiv);

  let tabcontainer = document.createElement("div");
  tabcontainer.setAttribute("class", "tabs-container");
  slicesdiv.appendChild(tabcontainer);

  let buttonleft = document.createElement("button");
  buttonleft.setAttribute("class", "arrow left-arrow");
  buttonleft.setAttribute("aria-label", "Previous tabs");
  buttonleft.innerHTML = "&lt;";
  tabcontainer.appendChild(buttonleft);

  let tabwrap = document.createElement("div");
  tabwrap.setAttribute("class", "tabs-wrapper");
  tabcontainer.appendChild(tabwrap);

  let tablist = document.createElement("ul");
  tablist.setAttribute(
    "title",
    `Community ${community_id} event ${benchmarking_event_id}`
  );
  tabwrap.appendChild(tablist);

  let buttonright = document.createElement("button");
  buttonright.setAttribute("class", "arrow right-arrow");
  buttonright.setAttribute("aria-label", "Next tabs");
  buttonright.innerHTML = "&gt;";
  tabcontainer.appendChild(buttonright);

  let currentIndex = 0;
  const maxVisibleTabs = 10;

  function updateArrowButtons() {
    buttonleft.disabled = currentIndex === 0;
    buttonright.disabled =
      currentIndex >= tablist.children.length - maxVisibleTabs;
  }

  function showVisibleTabs() {
    let tabHeight = tablist.children[0].offsetHeight; // Get the height of the first tab
    const totalTabs = tablist.children.length;

    for (let i = 0; i < totalTabs; i++) {
      if (i >= currentIndex && i < currentIndex + maxVisibleTabs) {
        tablist.children[i].style.display = "inline-block";
      } else {
        tablist.children[i].style.display = "none";
      }
    }

    // Update arrows visibility
    if (totalTabs <= maxVisibleTabs) {
      buttonleft.style.display = "none";
      buttonright.style.display = "none";
      tablist.style.width = "100%";
    } else {
      buttonleft.style.display = "block";
      buttonright.style.display = "block";
    }

    // Add empty tabs to maintain height if fewer tabs on the final page
    let tabsToShow = Math.min(totalTabs - currentIndex, maxVisibleTabs);
    let emptyTabs = maxVisibleTabs - tabsToShow;
    while (emptyTabs > 0) {
      let emptyTab = document.createElement("li");
      emptyTab.className = "empty-tab";
      emptyTab.style.height = `${tabHeight}px`; // Match the height of the visible tabs
      tablist.appendChild(emptyTab);
      emptyTabs--;
    }
  }

  function scrollTabs(direction) {
    if (direction === "right") {
      currentIndex += maxVisibleTabs;
    } else {
      currentIndex -= maxVisibleTabs;
    }

    showVisibleTabs();
    updateArrowButtons();
    updatePaginator(); // Update paginator when tabs are scrolled
  }

  buttonright.addEventListener("click", () => {
    scrollTabs("right");
  });
  buttonleft.addEventListener("click", () => {
    scrollTabs("left");
  });

  // Create the paginator
  let paginator = document.createElement("div");
  paginator.setAttribute("class", "tabs-footer");
  slicesdiv.appendChild(paginator);

  let challenge_report = document.createElement("p");
  challenge_report.appendChild(
    document.createTextNode(
      challenges_list.length.toString() +
        " Challenges, " +
        num_charts.toString() +
        " charts"
    )
  );
  challenge_report.setAttribute("class", "report");
  paginator.appendChild(challenge_report);

  function updatePaginator() {
    const totalTabs = Array.from(tablist.children).filter(
      (child) => !child.classList.contains("empty-tab")
    ).length;
    const totalPages = Math.ceil(totalTabs / maxVisibleTabs);
    const currentPage = Math.floor(currentIndex / maxVisibleTabs) + 1;

    // Calculate the range of visible tabs
    const startTab = currentIndex + 1; // Start index for visible tabs (1-based)
    const endTab = Math.min(currentIndex + maxVisibleTabs, totalTabs); // End index for visible tabs (1-based)

    // Check if the paginator already contains a <p> element with class "pags"
    let counter = paginator.querySelector(".pags");

    if (!counter) {
      // If no <p> element exists, create it
      counter = document.createElement("p");
      counter.setAttribute("class", "pags");
      paginator.appendChild(counter);
    }

    // Update the content of the existing <p> element
    counter.innerHTML = `${startTab}-${endTab} tabs of ${totalTabs} tabs, ${currentPage}/${totalPages} pages`;
  }

  aggregation_slices.forEach((aggregations_slice, slice_i) => {
    if (
      !aggregations_slice.members ||
      aggregations_slice.members.length === 0
    ) {
      // Skip empty tabs
      return;
    }
    let tabheader = document.createElement("li");
    if (aggregations_slice.empty_challenge) {
      tabheader.setAttribute("class", "empty-challenge");
    }
    let tab_a = document.createElement("a");
    let shift_slice_id = slicesdiv_id + "-" + slice_i;
    tab_a.href = "#" + shift_slice_id;

    let tabtext;
    if (aggregations_slice.from == aggregations_slice.to) {
      tabtext = aggregations_slice.from;
    } else {
      tabtext = aggregations_slice.from + "\u00A0to " + aggregations_slice.to;
    }

    let span_limits = document.createElement("span");
    span_limits.appendChild(document.createTextNode(tabtext));
    span_limits.setAttribute("class", "tablimits");
    tab_a.appendChild(span_limits);

    tab_a.setAttribute("title", tabtext);
    tabheader.appendChild(tab_a);
    tablist.appendChild(tabheader);

    let scrollableDiv = fill_in_table_slice(
      aggregations_slice.members,
      mode,
      tool_elixir_ids,
      community_id,
      ordered_tools,
      api_url
    );
    scrollableDiv.id = shift_slice_id;
    slicesdiv.appendChild(scrollableDiv);
  });

  // Initial state: show only the first 10 tabs
  showVisibleTabs();
  updateArrowButtons();
  updatePaginator(); // Initialize paginator
  $(slicesdiv).tabs({ active: 0 });
}

function fill_in_table_slice(
  aggregations,
  mode,
  tool_elixir_ids,
  community_id,
  ordered_tools,
  api_url
) {
  let scrollableDiv = document.createElement("div");
  scrollableDiv.className = "oeb-table-scroll";

  // Create table dynamically
  let table = document.createElement("table");
  table.className = "oeb-main-table";
  scrollableDiv.appendChild(table);

  let thead = document.createElement("thead");
  let tbody = document.createElement("tbody");
  table.appendChild(thead);
  table.appendChild(tbody);

  // Add challenge and tool fixed top left
  let challenges_row = thead.insertRow();
  let ch_th = document.createElement("th");
  ch_th.innerHTML = "<b>Challenges&nbsp;&#8594</b>";
  challenges_row.appendChild(ch_th);

  let aggregations_row = thead.insertRow();
  let th = document.createElement("th");
  th.innerHTML = "<b>Charts&nbsp;&#8594  <br>Participants&nbsp;&#8595</b>";
  aggregations_row.appendChild(th);

  // Append rows with all participants in the benchmark
  ordered_tools.forEach((toolname) => {
    let row = tbody.insertRow(-1);
    let th = document.createElement("th");
    let divpart = document.createElement("div");
    divpart.setAttribute("class", "aggregation_cell");
    th.appendChild(divpart);

    let a = document.createElement("a");
    if (tool_elixir_ids[toolname] != null) {
      let technical_url = urljoin(
        "https://" + mode + ".bsc.es/tool/",
        tool_elixir_ids[toolname]
      );
      a.setAttribute("href", technical_url);
      a.setAttribute("target", "_blank");
      a.setAttribute("class", "aggregation_cell_2");
    }else{
      a.setAttribute("style", "color:black");
      a.setAttribute("style", "pointer:default");
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
    if ("participants" in aggregation) {
      // Append columns with aggregations and results
      let column_value_dict = {};
      Object.keys(aggregation.participants).forEach((toolname, j) => {
        column_value_dict[toolname] = aggregation.participants[toolname];
      });

      // Challenge specific cell
      let url = urljoin(
        "https://" + mode + ".bsc.es/scientific/",
        community_id,
        aggregation._id
      );
      let the_colspan = 1;
      let ch_th = null;
      if (aggregation._id in drawn_challenge_headers) {
        // Increase the colspan
        ch_th = drawn_challenge_headers[aggregation._id];
        let colspanstr = ch_th.getAttribute("colspan");
        the_colspan = parseInt(colspanstr);
        the_colspan++;
      } else {
        ch_th = document.createElement("th");
        let aggdivcell = document.createElement("div");
        aggdivcell.setAttribute("class", "aggregation_cell");

        let a = document.createElement("a");
        a.setAttribute("href", url);
        a.setAttribute("target", "blank");
        a.setAttribute("class", "aggregation_cell_2");
        let acronym =
          "challenge_acronym" in aggregation
            ? aggregation.challenge_acronym
            : aggregation.acronym;
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
      let th = document.createElement("th");
      let divcell = document.createElement("div");
      divcell.setAttribute("class", "aggregation_cell");
      let a = document.createElement("a");
      //a.setAttribute("href", url);
      //a.setAttribute("target", "blank");
      if (aggregation.aggregation_id !== undefined) {
        th.id = aggregation.aggregation_id;
        aggregation.metrics.forEach((m_entry, m_entry_i) => {
          if (m_entry_i > 0) {
            a.appendChild(document.createElement("br"));
            let span = document.createElement("span");
            span.setAttribute("class", "notbold italic");
            span.appendChild(document.createTextNode("vs"));
            a.appendChild(span);
            a.appendChild(document.createElement("br"));
          }
          let content;
          if (m_entry == null) {
            console.log("FIXME: metrics label not in challenge", aggregation);
            content = document.createElement("i");
            content.appendChild(document.createTextNode("undefined"));
          } else {
            content = document.createTextNode(m_entry.title);
          }
          a.appendChild(content);
        });
      } else {
        let content = document.createTextNode(
          "No chart based on " + aggregation.metrics_category_id
        );
        a.appendChild(content);
        a.setAttribute("target", "_blank");
        a.setAttribute(
          "href",
          urljoin(
            api_url,
            "../staged/Metrics/" + aggregation.metrics_category_id
          )
        );
      }
      divcell.appendChild(a);
      th.appendChild(divcell);
      aggregations_row.appendChild(th);

      // Open loop for each row and append cell
      ordered_tools.forEach((row_tool_name, i) => {
        // Non headers
        let cell = tbody.rows[i].insertCell();
        let cellval = "-";
        if (row_tool_name in column_value_dict) {
          cellval = quartile_map[column_value_dict[row_tool_name]].name;
          cell.setAttribute(
            "class",
            quartile_map[column_value_dict[row_tool_name]].css_class
          );
        }
        cell.appendChild(document.createTextNode(cellval));
      });
    }
  });

  // Function to recalculate and apply height in list of tabs
  function updateTableLayout() {
    setTimeout(() => {
      let firstRowHeight = challenges_row.offsetHeight;
      let secondRowHeaders = aggregations_row.querySelectorAll("th");
      let firstHeaderInSecondRow =
        aggregations_row.querySelector("th:first-child");

      secondRowHeaders.forEach(function (header) {
        header.style.top = firstRowHeight + "px";

        firstHeaderInSecondRow.style.zIndex = "99";
      });
    }, 0);
  }

  updateTableLayout();

  // Watch for changes to the table and recalculate height
  let observer = new MutationObserver(function (mutationsList) {
    for (let mutation of mutationsList) {
      if (mutation.type === "childList" || mutation.type === "attributes") {
        updateTableLayout();
      }
    }
  });

  // Start observing the table for changes
  observer.observe(scrollableDiv, {
    attributes: true, // For any changes to attributes
    childList: true, // For any changes to child nodes
    subtree: true, // Watch for changes in all descendants
  });
  return scrollableDiv;
}

async function fetchUrl(url, http_method, challenge_list) {
  try {
    let request1;

    if (http_method == "GET") {
      return await fetch(url);
    } else {
      return await fetch(url, {
        method: "POST",
        body: JSON.stringify(challenge_list),
      });
    }
  } catch (err) {
    console.log(`Invalid Url Error: ${err.stack} `, url);
  }
}

function compute_classification(
  divid,
  selected_classifier,
  challenge_list,
  chunk_size
) {
  show_loading_spinner(divid, true);

  //check for mode by default it is production if no param is given
  let tablediv = document.getElementById(divid);
  var mode = $(tablediv).data("mode") ? $(tablediv).data("mode") : "openebench";

  const api_url = $(tablediv).data("api-url");
  const bench_event_api_url = $(tablediv).data("bench-event-api-url")
    ? $(tablediv).data("bench-event-api-url")
    : "https://openebench.bsc.es/rest/bench_event_api";

  let path_data =
    $(tablediv).data("benchmarkingevent") + "/" + selected_classifier;
  path_data = urljoin(bench_event_api_url, path_data);
  let http_method;

  if (challenge_list.length === undefined || challenge_list.length == 0) {
    http_method = "GET";
  } else {
    http_method = "POST";
  }

  fetchUrl(path_data, http_method, challenge_list)
    .then((response) => {
      if (!response.ok) {
        let bench_id = $(tablediv).data("benchmarkingevent");
        if (response.status === 404) {
          show_loading_spinner(divid, false);
          tablediv.innerHTML = "";
          let para = document.createElement("div");
          para.className = "alert alert-info";
          let err_txt = document.createTextNode(
            "No data found for the benchmarking event: '" + bench_id + "'"
          );
          para.appendChild(err_txt);
          tablediv.appendChild(para);
        } else {
          show_loading_spinner(divid, false);
          tablediv.innerHTML = "";
          let para = document.createElement("div");
          para.className = "alert alert-info";
          let err_txt = document.createTextNode(
            "There is an error in the server. Please try again or contact with the support team"
          );
          para.appendChild(err_txt);
          tablediv.appendChild(para);
        }
        throw response;
      }

      return response.json();
    })
    .then((results) => {
      let bench_id = $(tablediv).data("benchmarkingevent");
      if (
        (results.data !== undefined && results.data == null) ||
        results.length == 0
      ) {
        show_loading_spinner(divid, false);
        tablediv.innerHTML = "";
        let para = document.createElement("div");
        para.className = "alert alert-info";
        let err_txt = document.createTextNode(
          "No data available for the benchmarking event: '" + bench_id + "'"
        );
        para.appendChild(err_txt);
        tablediv.appendChild(para);
      } else {
        // console.log(bench_id, results);
        let community_id = "OEBC" + bench_id.substring(4, 7);

        const fetch = createApolloFetch({
          //fallback to legacy if no api_url is defined
          uri: api_url
            ? api_url
            : urljoin("https://" + mode + ".bsc.es/", "sciapi/graphql"),
        });

        const fetchData = () =>
          fetch({
            query: `query getTools($community_id: String!){
                            getTools(toolFilters:{community_id: $community_id}) {
                                registry_tool_id
                                name
                            }
                        }`,
            variables: { community_id: community_id },
          });

        fetchData().then((response) => {
          let tool_list = response.data.getTools;

          // iterate over the list of tools to generate a dictionary
          let tool_elixir_ids = {};
          tool_list.forEach(function (tool) {
            if (tool.registry_tool_id != null) {
              tool_elixir_ids[tool.name] = tool.registry_tool_id
                .split(":")[1]
                .toLowerCase();
            } else {
              tool_elixir_ids[tool.name] = null;
            }
          });

          fill_in_table(
            divid,
            results,
            mode,
            tool_elixir_ids,
            community_id,
            bench_id,
            chunk_size,
            api_url
          );
          show_loading_spinner(divid, false);
        });
      }
    })
    .catch((err) => console.log(err));
}

function load_table(
  divid,
  challenge_list = [],
  classifier = "diagonal",
  chunk_size = 10
) {
  remove_table(divid);

  let droplist_id = divid + "_bench_dropdown_list";
  let droplist = document.getElementById(droplist_id);
  if (droplist == null) {
    //add dropdown list
    droplist = document.createElement("select");
    droplist.id = droplist_id;
    droplist.className = "classificator_list";

    let bench_table = document.getElementById(divid);

    let droplist_label = document.createElement("label");
    droplist_label.htmlFor = droplist_id;
    droplist_label.innerText = "Classification Method:";

    // add option group
    let group = document.createElement("OptGroup");
    group.label = "Select a classification method:";
    droplist.add(group);

    // add list options
    let option1 = document.createElement("option");
    option1.class = "selection_option";
    option1.id = divid + "_classificator__squares";
    option1.title =
      "Apply square quartiles classification method (based on the 0.5 quartile of the X and Y metrics)";
    option1.data = ("toggle", "list_tooltip");
    option1.data = ("container", "#tooltip_container");
    option1.value = "squares";
    option1.innerHTML = "SQUARE QUARTILES";

    let option2 = document.createElement("option");
    option2.class = "selection_option";
    option2.id = divid + "_classificator__diagonals";
    option2.title =
      "Apply diagonal quartiles classifcation method (based on the assignment of a score to each participant proceeding from its distance to the 'optimal performance' corner)";
    option2.data = ("toggle", "list_tooltip");
    option2.data = ("container", "#tooltip_container");
    option2.value = "diagonals";
    option2.innerHTML = "DIAGONAL QUARTILES";

    let option3 = document.createElement("option");
    option3.class = "selection_option";
    option3.id = divid + "_classificator__clusters";
    option3.title =
      "Apply k-means clustering algorithm to group the participants";
    option3.data = ("toggle", "list_tooltip");
    option3.data = ("container", "#tooltip_container");
    option3.value = "clusters";
    option3.innerHTML = "K-MEANS CLUSTERING";

    group.appendChild(option1);
    group.appendChild(option2);
    group.appendChild(option3);

    let selected_classifier = classifier;

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

    bench_table.appendChild(droplist_label);
    bench_table.appendChild(droplist);
  }

  $(droplist).off();
  $(droplist).on("change", function () {
    //compute_classification(divid, this.options[this.selectedIndex].id.split('__')[1], challenge_list, chunk_size);
    compute_classification(
      divid,
      this.options[this.selectedIndex].value,
      challenge_list,
      chunk_size
    );
  });

  //compute_classification(divid, droplist.options[droplist.selectedIndex].id.split('__')[1], challenge_list, chunk_size);
  compute_classification(
    divid,
    droplist.options[droplist.selectedIndex].value,
    challenge_list,
    chunk_size
  );
}

function run_summary_table(challenge_list = [], active_table = null) {
  if (challenge_list.length == 0 && active_table == null) {
    let tables = document.getElementsByClassName("oeb-table");
    let i = 0;
    let dataId;
    let y;

    // append ids to divs
    i = 0;
    for (y of tables) {
      // get benchmarking event id
      dataId = y.getAttribute("data-benchmarkingevent");

      //set chart id
      let divid = dataId.replace(":", "_");
      y.id = divid;
      load_table(divid, challenge_list);
      i++;
    }
  } else {
    load_table(active_table, challenge_list);
  }
}

function remove_table(divid) {
  let tablediv_id = divid + "_oeb-table-scroll";
  let tablediv = document.getElementById(tablediv_id);
  if (tablediv != null) {
    tablediv.remove();
  }

  return tablediv_id;
}

function show_loading_spinner(divid, loading) {
  let spinner_id = divid + "-loading";
  let spinner_div = document.getElementById(spinner_id);

  // Check if the table exists (divid + '_oeb-table-scroll')
  let table_div = document.getElementById(divid + "_oeb-table-scroll");

  if (!spinner_div) {
    spinner_div = document.createElement("div");
    spinner_div.id = spinner_id;
    spinner_div.className = "spinner-container";

    // Create the image element for the spinner
    let spinner_img = document.createElement("img");
    spinner_img.loading = "lazy";
    spinner_img.src = loaderImage;
    spinner_img.className = "spinner";

    spinner_div.appendChild(spinner_img);
    document.getElementById(divid).appendChild(spinner_div);
  }

  spinner_div.style.display = loading ? "flex" : "none";

  if (table_div) {
    table_div.style.display = loading ? "none" : "block";
  }
}

export { run_summary_table };

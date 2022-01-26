# OpenEBench Scientific Benchmarking results classification table

Repository that contains the table used in OpenEBench for the classification of benchmarking results

## Live Demo

See a demo of how this visualizer works [here](https://inab.github.io/bench_event_table/)

## NPM Package

NPM Package `@inb/oeb-classification-table` published to: <https://www.npmjs.com/package/@inb/oeb-classification-table>

## Data Input

Per default it consumes the [OpenEBench Sci-API](https://openebench.bsc.es/sciapi/) (deprecated) and [Bench-Event-API](https://openebench.bsc.es/rest/bench_event_api/).

It is also able to consume the new API [OpenEBench API Scientific](https://dev-openebench.bsc.es/api/scientific/).
The API can be set by supplying the following attribute: `data-api-url="{{ API_URL }}"` and `data-bench-event-api-url="{{ BENCH_EVENT_API_URL }}"`

## Classification methods

* Square quartiles - divide the plotting area in four squares by getting the 2nd quartile of the X and Y metrics.
![squares](pictures/sqr_example.png)
* Diagonal quartiles - divide the plotting area with diagonal lines by assigning a score to each participant based in the distance to the 'optimal performance'.
![diagonals](pictures/diag_example.png)
* Clustering - group the participants using the K-means clustering algorithm and sort the clusters according to the performance.
![clusters](pictures/clusters_example.png)

## How to use

The component can be imported in two way: As npm package (preferred), or via the build file from the git repository (see bottom).

### Use the npm package

`npm i @inb/oeb-classification-table`

In your frontend component:
`import { run_summary_table } from "@inb/oeb-classification-table";`

You can then call the `run_summary_table()` function.

The HTML file should look like [this](./index.html)

### Attributes that can be set on the _<div\>_ tag

* data-benchmarkingevent : the official OEB id of the benchmarking event you want to visualize
* class: should always be *'oeb-table'*
* data-api-url: Should always contain the full API URL e.g. <https://openebench.bsc.es/api/scientific/graphql>

Example:
` <div class="oeb-table" data-benchmarkingevent="OEBE0020000000" data-api-url="{{ API_URL }}"></div> `

### Alternative way: Clone from repository

Requirements:

-npm
-http server

Clone the repo to your document root :

```
git clone https://github.com/inab/bench_event_table.git
```

Install dependencies from package.json :

```
npm install 
```

Export node moodules :

```
export PATH="${PWD}/node_modules/.bin/:$PATH"
```

Compile with webpack and visualize sample results in your localhost :

```
./node_modules/.bin/webpack-cli src/app.js --output=build/build.js -d -w
```

Add the build file which you can download from build/build.js and tag it into your html. You can then call the `run_summary_table()` function.  

The HTML file should look like [this](./index.html)

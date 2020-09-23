import * as d3B from 'd3'
import * as d3Collection from 'd3-collection'
//import * as voronoiMap  from 'd3-voronoi-map';
//import { weightedVoronoi } from 'd3-weighted-voronoi';


import * as voronoiTreemap from 'd3-voronoi-treemap';

import * as seedrandom from 'seedrandom'

let d3 = Object.assign({}, d3B, d3Collection, /*voronoiMap,*/ voronoiTreemap);

const atomEl = d3.select('.interactive-wrapper-voronoi').node();

let isMobile = window.matchMedia('(max-width: 700px)').matches;

let margin = {top: 10, right: 10, bottom: 10, left: 10};

let width = atomEl.getBoundingClientRect().width;
let height =  width;

let selectedDate;

let svg = d3.select(".interactive-wrapper-voronoi")
.append('svg')
.attr("width", width)
.attr("height", height);


d3.json('https://interactive.guim.co.uk/docsdata-test/1YyNb9oLJOIgIUZcu-FpvCnluaBm0f_uu0f-YIHmI4tc.json')
.then( spreadsheet => {

	let rawData = spreadsheet.sheets.Graphic_Countries;

	let rawKeyDates = spreadsheet.sheets.Graphic_KeyDates;

	selectedDate = rawKeyDates[0].Date;
/*1/28/20
3/13/20
3/20/20
4/02/20
4/09/20
6/29/20
9/16/20*/

	let dataSelected = rawData.map(country => {


		console.log(country['4/02/20']);

		return {country:country['Country/Region'], continent:country.Continent, date: selectedDate, deaths: +country['3/13/20']}
	});

	let dataNested = { key:'data-nested', values:d3.nest()
	.key(d => d.continent)
	.entries(dataSelected.filter(d => d.deaths > 0)) }

	let dataHierarchy = d3.hierarchy(dataNested, d => d.values)
	.sum(d => d.deaths)

	update(dataHierarchy)

	rawKeyDates.map( k => {
		d3.select(".interactive-wrapper-voronoi")
		.append('button')
		.html(k.Date)
		.attr('class', k.Date)
		.on('click', event => {

			let dataSelected = rawData.map(country => {return {country:country['Country/Region'], continent:country.Continent, date: selectedDate, deaths: +country[event.target.className]}});

			let dataNested = { key:'data-nested', values:d3.nest()
			.key(d => d.continent)
			.entries(dataSelected.filter(d => d.deaths > 0)) }

			let dataHierarchy = d3.hierarchy(dataNested, d => d.values)
			.sum(d => d.deaths)

			update(dataHierarchy)
			
		})


	})

	

})



const update = (data) => {

	console.log(data)

	const voronoi = svg.append("g")

	let ellipse = d3
	.range(100)
	.map(i => [
		(width * (1 + 0.99 * Math.cos((i / 50) * Math.PI))) / 2,
		(width * (1 + 0.99 * Math.sin((i / 50) * Math.PI))) / 2
	])

	let seed = new Math.seedrandom(20);

	var voronoiTreemap = d3.voronoiTreemap()
	.clip(ellipse)
	.prng(seed);

	voronoiTreemap(data)
	
	let allNodes = data.descendants()
    .sort((a, b) => b.depth - a.depth)
    .map((d, i) => Object.assign({}, d, {id: i}));

    let chart = voronoi
    .selectAll('path')
    .data(allNodes);

    chart
    .enter()
    .append('path')
    //.merge(chart)
    .attr('d', d => "M" + d.polygon.join("L") + "Z")
    .attr('class', (d,i) => d.depth > 1 ? i + '-' + d.data.country : d.data.key)
    .attr("stroke", "#F5F5F2")
}

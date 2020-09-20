import * as d3 from 'd3'
import textures from 'textures'

let isMobile = window.matchMedia('(max-width: 700px)').matches;

const atomEl = d3.select('#interactive-slot-1').node();

let width = atomEl.getBoundingClientRect().width;
let height =  width * 2.5 / 4;

let data = [];

let dataWorld = [];

let getContinent = [];

const margin = {top:15,right:10,bottom:20,left:50}

const iniDate = new Date('2020-01-22');
const endDate = new Date('2020-09-14');

const timeParse = d3.timeParse('%m/%d/%y')

let xScale = d3.scaleTime()
.range([margin.left, width - margin.right])

let yScale = d3.scaleLinear()
.range([height - margin.bottom, margin.top])

let yAxis = (g) => {
	return g
	.attr("transform", `translate(${margin.left},0)`)
	.attr("class", 'y axis')
	.call(d3.axisLeft(yScale))
}

let xAxis = (g) => {
	return g
	.attr('transform', `translate(0, ${height - margin.bottom})`)
	.attr("class", 'x axis')
	.call(d3.axisBottom(xScale))
}

let area = (datum, boolean) => {
	return d3.area()
	.curve(d3.curveCardinal)
	.x(d => xScale(timeParse(d.data.date)))
	.y0(d => boolean ? yScale(d[0]) : height - margin.bottom)
	.y1(d => boolean ? yScale(d[1]) : height - margin.bottom)
	(datum);
}

d3.json('https://interactive.guim.co.uk/docsdata-test/1YyNb9oLJOIgIUZcu-FpvCnluaBm0f_uu0f-YIHmI4tc.json')
.then(response => {

	const rawData = response.sheets.Graphic_Countries;

	const dates = [... new Set(Object.entries(rawData[0]).map(entry => entry[0]))].slice(2);

	let lastDate = dates[dates.length-1];

	//sort data by date

	rawData.sort((a,b) => b[dates[lastDate]] - a[dates[lastDate]])

	let continents = [... new Set(rawData.map(d => d.Continent))];

	//sort country data by continent

	continents.map(continent => {

		let arrayContinent = rawData.filter(f => f.Continent === continent);

		arrayContinent.map(country => data.push(country))
		
	})

	dates.map(date => {
		dataWorld.push({
			date:date,
			world:d3.sum(rawData, s => s[date])
		});
	})


	response.sheets.Graphic_KeyDates.map((keydate,i) => {

		let dataContinents = [];

		let dataCountries = [];

		xScale.domain([iniDate, timeParse(keydate.Date)]);
		yScale.domain([0, +keydate.deaths]);

		let calculator = d3.select('#interactive-slot-' + (i + 1)).append('div')
		.attr('width', width)
		.html(keydate.Date)

		let svg = d3.select('#interactive-slot-' + (i + 1)).append('svg')
		.attr('width', width)
		.attr('height', height)
		.attr('class', 'gv-1m-deaths-' + keydate.Date + '-svg')

		svg.append("g")
      	.call(xAxis); 

      	svg.append("g")
      	.call(yAxis); 

      	yScale.domain([0, +keydate.deaths]);

      	svg.selectAll(".y.axis")
      	.transition()
      	.duration(2000)
      	.call(yAxis); 

		let datesFiltered = dates.filter(date => timeParse(date) <= timeParse(keydate.Date))

		datesFiltered.map(date => {

			let objCountry = {date:date};

			data.map(country => objCountry[country['Country/Region']] = +country[date])

			dataCountries.push(objCountry)

			dataContinents.push({date:date})

			continents.map(continent => {

				let con = rawData.filter(f => f.Continent === continent);

				let sum = d3.sum(con, s => s[date] )

				let filtered = dataContinents.filter(d => d.date === date)[0];

				filtered[con[0].Continent.replace(/\s/g, '-')] = sum

			})

		})

		rawData.map(entry => getContinent[entry['Country/Region']] = entry.Continent)

		//makeWorldChart(svg, dataWorld)
		makeContinentChart(svg, dataContinents)
		makeCountryChart(svg, dataCountries)
		makeCalculator(calculator, keydate.Date)
	})


})

const makeCalculator = (date) => {

}

const makeWorldChart = (svg, data) => {

	let texture = textures.lines()
		.size(6)
		.stroke("#bababa")
		.strokeWidth(1);

		svg.call(texture)

	let stacked = d3.stack()
  	.keys(['world']);

	let stackedSeries = stacked(data);

	let world = svg.append('g')
	.selectAll('path')
	.data(stackedSeries)
	.enter()
	.append('path')
	.attr('class', d => d.key)
	.attr('d', d => area(d,true))
	.style('fill', texture.url())
}

const makeContinentChart = (svg, data) => {

	 svg.selectAll(".y.axis")
     .transition().duration(500)
     .call(yAxis);

	let stacked = d3.stack()
  	.keys(Object.keys(data[0]).slice(1));

	let stackedSeries = stacked(data);

	svg.append('g')
	.selectAll('path')
	.data(stackedSeries)
	.enter()
	.append('path')
	.attr('class', d => d.key)
	.attr('d', d => area(d,false))
	.transition()
	.duration(2000)
	.attr('d', d => area(d,true))


	let continentsStroke = svg.append('g')
	.selectAll('path')
	.data(stackedSeries)
	.enter()
	.append('path')
	.attr('class', d => d.key)
	.attr('d', d => area(d,false))
	.style('pointer-events', 'none')
	.style('fill', 'none')
	.style('stroke', '#333333')
	.style('stroke-width', '2px')
	.transition()
	.duration(2000)
	.attr('d', d => area(d,true))
	
}

const makeCountryChart = (svg, data) => {

	let stack = d3.stack()
	.keys(Object.keys(data[0]).slice(1));

	let stackedSeries = stack(data);

	let countries = svg.append('g')
	.selectAll('path')
	.data(stackedSeries)
	.enter()
	.append('path')
	.attr('class', d => 'country ' + d.key.replace(/\s/g, '-'))
	.attr("d", d => area(d, true))
	.style('fill-opacity', 0)
	.style('fill', 'white')
	.on("mouseover", (event, d) => {

		svg.select('.' + d.key.replace(/\s/g, '-')).style('fill-opacity', .5)

		console.log(d.key)
	})
	.on("mouseout", event => {
		svg.selectAll('.country').style('fill-opacity', 0)
	})
	
}
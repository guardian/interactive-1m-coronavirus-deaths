import * as d3 from 'd3'
import textures from 'textures'

console.log('===>', d3.select('#top'))
d3.select('#top')
.append('div')
.attr('class','red-line')

d3.select('#top')
.append('div')
.attr('class','red-line-2')


const slots = d3.selectAll("div[id*='interactive-slot-']").nodes()

let isMobile = window.matchMedia('(max-width: 700px)').matches;

let data = [];

let dataContinents = [];

let dataCountries = [];

let keyDatesScales = [];

let getContinent = [];

const margin = {top:15,right:10,bottom:20,left:50}

const iniDate = new Date('2020-01-22');
const endDate = new Date('2020-09-14');

const timeParse = d3.timeParse('%m/%d/%y')

const atomEl = d3.select('#interactive-slot-1').node();

let width = atomEl.getBoundingClientRect().width;
let height =  isMobile ? window.innerHeight : width * 2.5 / 4;

let xScale = d3.scaleTime()
.range([margin.left, width - margin.right])
.domain([iniDate, endDate]);

let yScale = d3.scaleLinear()
.range([height - margin.bottom, margin.top])
.domain([0, 1010000]);

let area = d3.area()
.x(d => xScale(timeParse(d.data.date)))
.y0(d => yScale(d[0]))
.y1(d => yScale(d[1]))

let yAxis = (g) => {
	return g
	.attr("transform", `translate(${margin.left},0)`)
	.attr("class", 'y axis')
	.call(d3.axisLeft(yScale)
	.ticks(4))
}

let xAxis = (g) => {
	return g
	.attr('transform', `translate(0, ${height - margin.bottom})`)
	.attr("class", 'x axis')
	.call(d3.axisBottom(xScale)
	.ticks(4))

}

let stacked = (data) => {
	return d3.stack()
	.keys(Object.keys(data[0]).slice(1))
	(data)
}



d3.json('https://interactive.guim.co.uk/docsdata-test/1YyNb9oLJOIgIUZcu-FpvCnluaBm0f_uu0f-YIHmI4tc.json')
.then(response => {

	const rawData = response.sheets.Graphic_Countries;

	const dates = [... new Set(Object.entries(rawData[0]).map(entry => entry[0]))].slice(2);

	let lastDate = dates[dates.length-1];

	//sort data by deaths on the last date

	rawData.sort((a,b) => b[dates[lastDate]] - a[dates[lastDate]])

	let continents = [... new Set(rawData.map(d => d.Continent))];

	//sort country data by continent

	continents.map(continent => {

		let arrayContinent = rawData.filter(f => f.Continent === continent);

		arrayContinent.map(country => data.push(country))
		
	})

	//set data by date and value

	dates.map(date => {

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

	rawData.map(entry => getContinent[entry['Country/Region']] = entry.Continent);

	response.sheets.Graphic_KeyDates.map((keydate,i) => {

		let date = keydate.Date;

		let scale = keydate.Scale;

		keyDatesScales.push({date:date, scale:scale})

		let index = i == 0 ? 0 : i-1;

		makeSlot(i+1, response.sheets.Graphic_KeyDates[index].Date, response.sheets.Graphic_KeyDates[index].Scale, response.sheets.Graphic_KeyDates)
	})


})

const makeSlot = (id, date, scale) => {

	const atom = d3.select('#interactive-slot-' + id);

	let svg = atom.append('svg')
	.attr('width', width)
	.attr('height', height)
	.attr('class', 'gv-1m-deaths-svg-' + id)

	svg.append("g")
	.call(xAxis); 

	svg.append("g")
	.call(yAxis);

	makeContinentChart(svg,stacked(dataContinents))

	makeCountryChart(svg,stacked(dataCountries))

	update(svg, date, scale)
	
}

const update = (svg, date, scale) => {

	yScale.domain([0,scale]);
	xScale.domain([iniDate,timeParse(date)])

	makeContinentChart(svg);
	makeCountryChart(svg);

	svg.selectAll(".y.axis")
	.transition().duration(1000)
	.call(yAxis);

	svg.selectAll(".x.axis")
	.transition().duration(1000)
	.call(xAxis);
}


const makeContinentChart = (svg, data) => {


	if(data)
	{
		let continentsFill = svg.append('g')
		.attr('class', 'continent-fill-g')
		.selectAll('path')
		.data(data)
		.enter()
		.append('path')
		.attr('class', d => 'continent-fill ' + d.key)
		.attr('d', area)

		let continentsStroke = svg.append('g')
		.selectAll('path')
		.data(data)
		.enter()
		.append('path')
		.attr('class', d => 'continent-stroke ' + d.key)
		.attr('d', area)
	}
	else
	{
		svg.selectAll('.continent-fill')
		.transition()
		.duration(500)
		.attr('d',area)

		svg.selectAll('.continent-stroke')
		.transition()
		.duration(500)
		.attr('d',area)
	}
}

const makeCountryChart = (svg, data) => {

	if(data)
	{
		let countries = svg.append('g')
		.selectAll('path')
		.data(data)
		.enter()
		.append('path')
		.attr('class', d => 'country-fill ' + d.key.replace(/\s/g, '-'))
		.attr("d", d => area(d, true))
		.on("mouseover", (event, d) => {

			svg.select('.' + d.key.replace(/\s/g, '-')).style('fill-opacity', .5)

			console.log(d.key, getContinent[d.key])
		})
		.on("mouseout", event => {
			svg.selectAll('.country-fill').style('fill-opacity', 0)
		})
	}
	else
	{
		svg.selectAll('.country-fill')
		.attr('d',area)

	}
	
}

var lastScrollTop = 0;

window.onscroll = (ev) => {
	var st = window.pageYOffset || document.documentElement.scrollTop; // Credits: "https://github.com/qeremy/so/blob/master/so.dom.js#L426"
	   if (st > lastScrollTop){
	      console.log('downscroll code')

		    slots.map( (s,i) => {

		    	

		   

		    	//if(s.getBoundingClientRect().top >= window.innerHeight / 3 && s.getBoundingClientRect().top <= (window.innerHeight / 3) * 2){
		    	if(s.getBoundingClientRect().top <= (window.innerHeight / 2) + 100 && s.getBoundingClientRect().top >= (window.innerHeight / 2) - 100) {

		    		console.log('trigger' +i)

		    		update(d3.select('.gv-1m-deaths-svg-' + (i+1)), keyDatesScales[i].date, keyDatesScales[i].scale)
		    	}

			})
		} 

	lastScrollTop = st <= 0 ? 0 : st; // For Mobile or negative scrolling
};
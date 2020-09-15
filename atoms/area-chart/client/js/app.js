import * as d3 from 'd3'

let isMobile = window.matchMedia('(max-width: 700px)').matches;

const atomEl = d3.select('.interactive-wrapper').node();

let width = atomEl.getBoundingClientRect().width;
let height =  width * 2.5 / 4;

let svg = d3.select('.interactive-wrapper').append('svg')
.attr('width', width)
.attr('height', height)
.attr('class', 'gv-1m-deaths')

let data = [];

let colors = ['#FBB65B', '#513551', '#de3163', '#003366', '#bababa'];

const iniDate = new Date('2020-01-22');
const endDate = new Date('2020-09-14');

const timeParse = d3.timeParse('%m/%d/%y')

const nDays = d3.timeDays(iniDate, endDate);

let parseDate = d3.timeParse()

let xScale = d3.scaleTime()
.range([0, width])
.domain([iniDate, endDate]);

let yScale = d3.scaleLinear()
.range([height, 0])
.domain([0,1000000]);


let areaGenerator = d3.area()
.x(d => xScale(timeParse(d.data.date)))
.y0(d => yScale(d[0]))
.y1(d => yScale(d[1]));


d3.json('https://interactive.guim.co.uk/docsdata-test/1YyNb9oLJOIgIUZcu-FpvCnluaBm0f_uu0f-YIHmI4tc.json')
.then(response => {

	const rawData = response.sheets.Graphic_Countries;

	const continents = [... new Set(rawData.map(d => d.Continent))];

	const dates = [... new Set(Object.entries(rawData[0]).map(entry => entry[0]))].slice(2);

	dates.map(date => {

			data.push(
				{
					date:date,
					asia:null,
					africa:null,
					europe:null,
					northamerica:null,
					southamerica:null,
					oceania:null
				})


		continents.map(continent => {

			let con = rawData.filter(f => f.Continent === continent);

			let sum = d3.sum(con, s => s[date] )

			let filtered = data.filter(d => d.date === date)[0];

			if(continent == 'Asia')filtered.asia = sum
			if(continent == 'Africa')filtered.africa = sum
			if(continent == 'Europe')filtered.europe = sum
			if(continent == 'North America')filtered.northamerica = sum
			if(continent == 'South America')filtered.southamerica = sum
			if(continent == 'Oceania')filtered.oceania = sum
			
		})

	})

	makeAreaChart()
})


const makeAreaChart = () => {

	let stack = d3.stack()
  	.keys(['asia', 'africa', 'europe', 'northamerica', 'southamerica', 'oceania']);

	let stackedSeries = stack(data);

	console.log(stackedSeries)

	svg
	.selectAll('path')
	.data(stackedSeries)
	.enter()
	.append('path')
	.style('fill', function(d, i) {
		return colors[i];
	})
	.attr('d', areaGenerator)
}
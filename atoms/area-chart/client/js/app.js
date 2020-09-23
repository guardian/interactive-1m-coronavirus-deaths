import * as d3 from 'd3'
import textures from 'textures'
import {TweenMax} from "gsap";
import {numberWithCommas} from 'shared/js/util.js'

const slots = d3.selectAll("div[id*='interactive-slot-']").nodes();

let isMobile = window.matchMedia('(max-width: 700px)').matches;

let data = [];

let dataContinents = [];

const dataCountries = [];

let dictionary = [];

let keyDates = [];

let getContinent = [];

let used = [0];

const margin = {top:15,right:60,bottom:20,left:50}

let lastScrollTop = 0;

const iniDate = new Date('2020-01-22');
const endDate = new Date('2020-09-14');

const timeParse = d3.timeParse('%m/%d/%y')

const atomEl = d3.select('#interactive-slot-1').node();

let width = atomEl.getBoundingClientRect().width;
let height =  isMobile ? window.innerHeight - 100: width * 2.5 / 4;

let xScale = d3.scaleTime()
.range([0, width])
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
	.attr("class", 'y axis')
	.call(d3.axisLeft(yScale)
			.tickFormat(d => numberWithCommas(d))
			.tickSizeInner(-width)
			.ticks(3)
	)
	.selectAll("text")
	.style("text-anchor", "start")
	.attr('x', 0)
	.attr('y', -10);
}

let xAxis = (g) => {
	return g
	.attr('transform', `translate(0, ${height - margin.bottom})`)
	.attr("class", 'x axis')
	.call(d3.axisBottom(xScale)
		.tickFormat(d => d.getDate() == 1 ? d3.timeFormat("%b")(d) : d3.timeFormat("%d %b")(d))
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

			let sum = d3.sum(con, s => s[date] );

			let filtered = dataContinents.filter(d => d.date === date)[0];

			filtered[con[0].Continent.replace(/\s/g, '-')] = sum

		})

	})

	dictionary = toDict(dataCountries)

	rawData.map(entry => getContinent[entry['Country/Region']] = entry.Continent);

	response.sheets.Graphic_KeyDates.map((keydate,i) => {

		let date = keydate.Date;

		let deaths = keydate.Deaths;

		keyDates.push({date:date, deaths:deaths})

		let index = i == 0 ? 0 : i-1;

		makeSlot(i+1, response.sheets.Graphic_KeyDates[index].Date, response.sheets.Graphic_KeyDates[index].Deaths)
	})


})

const toDict = (arr) => {
	const out = {}
	arr.forEach(o => out[o["date"]] = o)

	return out
}

const makeSlot = (id, date, deaths) => {

	const atom = d3.select('#interactive-slot-' + id);

	let counter = atom.append('div')
	.attr('class', 'gv-1m-deaths-counter counter' + id)
	
	let dateTxt = counter.append('h3')
	.attr('class', 'counter-date');

	let deathsWrapper = counter.append('div')
	.attr('class', 'deaths-wrapper');

	let deathsNum = deathsWrapper.append('h3')
	.attr('class', 'counter-deaths')

	let deathsTxt = deathsWrapper.append('span')
	.attr('class', 'counter-deaths-txt')

	let key = counter.append('div')
	.attr('class','key-wrapper')

	let tooltipWrapper = atom.append('div')
	.attr('class', 'tooltip-wrapper');

	tooltipWrapper
	.append('text')
	.attr('class','tooltip tooltip-border');

	tooltipWrapper
	.append('span')
	.attr('class','tooltip tooltip-fill')

	let svg = atom.append('svg')
	.attr('width', width)
	.attr('height', height)
	.attr('class', 'gv-1m-deaths-svg-' + id)

	svg.append("g")
	.call(xAxis); 

	svg.append("g")
	.call(yAxis);

	d3.select('.y.axis .domain').remove()
	d3.selectAll('.x.axis .domain').remove()

	makeContinentChart(svg,stacked(dataContinents))

	makeCountryChart(svg,stacked(dataCountries))

	update(svg, date, counter, deaths)
	
}

const update = (svg, date, counter, deaths, continents) => {

	counter.select('.counter-date')
	.html(beautyDate(date))

	counter.select('.counter-deaths-txt')
	.html('deaths')

	if(continents)
	{

			let keys = Object.entries(continents[0])
			.slice(1)
			.filter(e => e[1] > 0)
			.sort((a,b) => b[1] - a[1]);

			keys.map( k => {

				let wrapper = counter.select('.key-wrapper')
				.append('div')
				.attr('class', 'key-color-wrapper')

				wrapper
				.append('div')
				.attr('class', 'key-color key-' + k[0])

				wrapper
				.append('p')
				.attr('class', 'key-text')
				.html(k[0].replace('-', ' ') + ' ' + numberWithCommas(k[1]))
			})
	}
	
	let deathsOld = parseInt(counter.node().innerHTML);

	var Cont={val:deathsOld} , NewVal = deaths ;

	let animation = TweenMax.to(Cont, 1, {
		  var: NewVal,
		  onUpdate: function() {

		  	counter.select('.counter-deaths')
			.html(numberWithCommas(Math.ceil(Cont.var)))
		  }
	});

	yScale.domain([0,deaths]);
	xScale.domain([iniDate,timeParse(date)])

	makeContinentChart(svg);
	makeCountryChart(svg);

	svg.selectAll(".y.axis")
	.transition().duration(1000)
	.call(yAxis);

	svg.selectAll(".x.axis")
	.transition().duration(1000)
	.call(xAxis);

	d3.select('.y.axis .domain').remove()
	d3.selectAll('.x.axis .domain').remove()
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

	}
	else
	{
		svg.selectAll('.continent-fill')
		.transition()
		.duration(500)
		.attr('d',area)
	}
}


let tt;
let posX;
let posY;
let events = false;

const makeCountryChart = (svg, data) => {

	if(data)
	{
		let key;
		let id;
		let enviroment;
		let date;
		let countryData;
		let bRect;

		let countries = svg.append('g')
		.selectAll('path')
		.data(data)
		.enter()
		.append('path')
		.attr('class', d => 'country-fill ' + d.key.replace(/\s/g, '-'))
		.attr("d", d => area(d, true))
		.on("mouseover", (event, d) => {

			events = true;

			id = event.target.parentNode.parentNode.parentNode.id;

			enviroment = +id.split('interactive-slot-')[1] -1;

			tt = d3.selectAll('#' + id + ' .tooltip')

			key = svg.select('.' + d.key.replace(/\s/g, '-'));

			date = keyDates[enviroment].date;

			countryData = dictionary[date]

			tt
			.classed('over', true)

			key
			.classed('fill-over', true)

			tt
			.html(  d.key + '<br>' + numberWithCommas(countryData[d.key]))

			bRect = d3.select('#' + event.target.parentNode.parentNode.parentNode.id + ' .tooltip').node().getBoundingClientRect()

		})
		.on("mouseout", event => {

			events = false;

			key
			.classed('fill-over', false)

			tt
			.classed('over', false)
		})
		.on("mousemove", (event, d) => {

			let here = d3.pointer(event);

		    let left = here[0];
		    let top = here[1];
		    let tWidth = bRect.width;
		    let tHeight = bRect.height;

		    posX = left - tWidth - 6;
		    posY = top - tHeight - 6;

		    tt.style('left',  posX + 'px')
		    tt.style('top', posY + 'px')

		})
	}
	else
	{
		svg.selectAll('.country-fill')
		.attr('d',area)

	}
}


if(events)
{
	d3.timer(function() {
	  	tt.stryle("top", posY + 'px');
	  	tt.stryle("left", posX + 'px');
	});
}

window.onscroll = (ev) => {

	let st = window.pageYOffset || document.documentElement.scrollTop; // Credits: "https://github.com/qeremy/so/blob/master/so.dom.js#L426"

	   if (st > lastScrollTop){

		    slots.map( (s,i) => {

		    	if(used.indexOf(i) == -1)
		    	{

		    		if(s.getBoundingClientRect().top <= (window.innerHeight / 2) + 100) {

		    			let continents = dataContinents.filter(c => c.date === keyDates[i].date);

		    			update(d3.select('.gv-1m-deaths-svg-' + (i+1)), keyDates[i].date, d3.select('.counter' + (i+1)), keyDates[i].deaths, continents);

		    			used.push(i)

		    		}

		    	}

			})
		} 

	lastScrollTop = st <= 0 ? 0 : st; // For Mobile or negative scrolling
};


const beautyDate = (dateRaw) => {

	let dayRaw = parseInt(dateRaw.split('/')[1]);
	let monthRaw = dateRaw.split('/')[0] - 1;

	let monthArray = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dec']

	return dayRaw + " " + monthArray[monthRaw] + " " + 2020

}
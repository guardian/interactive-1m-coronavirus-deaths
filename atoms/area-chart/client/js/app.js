import * as d3B from 'd3'
import * as d3Collection from 'd3-collection'
import {TweenMax} from "gsap";
import {numberWithCommas} from 'shared/js/util.js'

let d3 = Object.assign({}, d3B, d3Collection);
console.log('v-11')
const slots = d3.selectAll("div[id*='interactive-slot-']").nodes();

let isMobile = window.matchMedia('(max-width: 700px)').matches;

let data = [];

let dataContinents = [];

const dataCountries = [];

const countriesByDate = [];

let keyDates = [];

let svgUsed = [];

const margin = {top:15,right:1,bottom:20,left:50}

let lastScrollTop = 0;

const iniDate = new Date('2020-01-22');	

const timeParse = d3.timeParse('%m/%d/%y')

const atomEl = d3.select('#interactive-slot-1').node();

let width = atomEl.getBoundingClientRect().width;
let height =  isMobile ? window.innerHeight - 100: width * 2.5 / 4;

let xScale = d3.scaleTime()
.range([0, width + margin.right])
.domain([timeParse('1/01/20'), iniDate]);

let yScale = d3.scaleLinear()
.range([height - margin.bottom, margin.top])
.domain([0, 0]);

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

	let entriesRaw = Object.entries(data[data.length-1]).slice(1).filter(d => d[1] > 0)
	let entries = entriesRaw.map(d => d[0])

	return d3.stack()
	.keys(entries)
	(data)
}


d3.json('https://interactive.guim.co.uk/docsdata/1YyNb9oLJOIgIUZcu-FpvCnluaBm0f_uu0f-YIHmI4tc.json')
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

		countriesByDate[date] = objCountry;

		continents.map(continent => {

			let con = rawData.filter(f => f.Continent === continent);

			let sum = d3.sum(con, s => s[date] );

			let filtered = dataContinents.filter(d => d.date === date)[0];

			filtered[con[0].Continent.replace(/\s/g, '-')] = sum

		})

	})


	response.sheets.Graphic_KeyDates.map((keydate,i) => {

		let date = keydate.Date;

		let deaths = keydate.Deaths;

		keyDates.push({date:date, deaths:deaths})

	})

	keyDates.map((date,i) => {

		let index = i == 0 ? 0 : i-1;

		makeSlot(i+1, keyDates[index].date, keyDates[index].deaths)
	})


})

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
	.attr('id', 'gv-1m-deaths-svg-' + id)

	svg.append("g")
	.call(xAxis); 

	svg.append("g")
	.call(yAxis);

	d3.select('.y.axis .domain').remove()
	d3.selectAll('.x.axis .domain').remove()


	let index = keyDates.findIndex(d => d.date === date)

	let data;
	if(id > 1)data= dataContinents.filter(d => timeParse(d.date) <= timeParse(keyDates[index+1].date));
	else data = dataContinents.filter(d => timeParse(d.date) <= timeParse(keyDates[0].date));


	makeContinentChart(svg,stacked(data))

	updateScales(date, deaths)


	//FOR PRINT
/*
	keyDates.map(date => {

					console.log(date.date, xScale(timeParse(date.date)))
					svg.append('path')
					.attr('d', `M ${xScale(timeParse(date.date))} 0 v ${height}` )
					.attr('stroke', 'red')
					.attr('date-dummy')
				})*/
	
	
}

const updateScales = (date, deaths) => {

	yScale.domain([0,deaths]);
	
	xScale.domain([iniDate,timeParse(date)])
}

const update = (svg, date, counter, deaths, continents) => {

	updateScales(date, deaths)

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

	makeContinentChart(svg);

	svg.selectAll(".y.axis")
	.transition().duration(1000)
	.call(yAxis);

	svg.selectAll(".x.axis")
	.transition().duration(1000)
	.call(xAxis);

	d3.select('.y.axis .domain').remove()
	d3.selectAll('.x.axis .domain').remove()
}


const makeContinentChart = (svg, data = null) => {

	if(data != null)
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
		.duration(1000)
		.attr('d',area)
		.on('end', (d,i) => {

			if(d.length == 7){

				let data = dataCountries.filter(d => timeParse(d.date) <= timeParse(keyDates[0].date))

				makeCountryChart(svg,stacked(data))

			}

			
			if(i==5)
			{

				let date = d[d.length-1].data.date;
				let deaths = d[d.length-1][1];

				console.log(deaths)

				updateScales(date, deaths)

				let data = dataCountries.filter(d => timeParse(d.date) <= timeParse(date))

				makeCountryChart(svg,stacked(data))
			}
		})
	}
}

const makeCountryChart = (svg, data) => {

		let key;
		let tt;

		let countries = svg.append('g')
		.selectAll('path')
		.data(data)
		.enter()
		.append('path')
		.attr('class', d => 'country-fill ' + d.key.replace(/\s/g, '-'))
		.attr("d", area)
		.on("mouseover", (event, d) => {

			let id = event.target.parentNode.parentNode.parentNode.id;

			let enviroment = +id.split('interactive-slot-')[1] -1;

			tt = d3.selectAll('#' + id + ' .tooltip')

			key = svg.select('.' + d.key.replace(/\s/g, '-'));

			let date = keyDates[enviroment].date;

			let countryData = countriesByDate[date]

			manageHovering(tt,key,d.key, countryData, enviroment)	

		})
		.on("mouseout", event => {
			key
			.classed('fill-over', false)

			tt
			.classed('over', false)
		})
		.on("click", (event, d) => {
			svg
			.selectAll('path')
			.classed('fill-over', false)

			let id = event.target.parentNode.parentNode.parentNode.id;

			let enviroment = +id.split('interactive-slot-')[1] -1;

			tt = d3.selectAll('#' + id + ' .tooltip')

			key = svg.select('.' + d.key.replace(/\s/g, '-'));

			let date = keyDates[enviroment].date;

			let countryData = countriesByDate[date]

			manageHovering(tt,key,d.key, countryData, enviroment)
		})
}

const manageHovering = (tt,key,countryName, countryData, enviroment) => {

	tt.classed('over', true)

	key.classed('fill-over', true)

	tt.html(  countryName + '<br>' + numberWithCommas(countryData[countryName]))

	let bRect = tt.node().getBoundingClientRect();

	let tWidth = bRect.width;
	let tHeight = bRect.height;

	let posX = width - tWidth - 6;

	let acum = [];

	let localYScale = d3.scaleLinear()
	.range([height - margin.bottom, margin.top])
	.domain([0,keyDates[enviroment].deaths]);

	var BreakException = {};

	try{

		Object.entries(countryData).slice(1).forEach( o => {
			acum.push(o[1])
			if(o[0] == countryName)throw BreakException 
		})
	}
	catch (e){
		if (e !== BreakException) throw e;
	}

	let posY = (localYScale(d3.sum(acum))  - tHeight - 6);

	tt.style('left',  posX + 'px')
	tt.style('top', posY + 'px')
}

window.onscroll = (ev) => {

	let st = window.pageYOffset || document.documentElement.scrollTop; // Credits: "https://github.com/qeremy/so/blob/master/so.dom.js#L426"

	   if (st > lastScrollTop){

		    slots.map( (s,i) => {

		    	if(svgUsed.indexOf(i) == -1)
		    	{

		    		if(s.getBoundingClientRect().top <= (window.innerHeight / 2) + 100) {

		    			let continents = dataContinents.filter(c => c.date === keyDates[i].date);

		    			update(d3.select('.gv-1m-deaths-svg-' + (i+1)), keyDates[i].date, d3.select('.counter' + (i+1)), keyDates[i].deaths, continents);

		    			svgUsed.push(i)

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
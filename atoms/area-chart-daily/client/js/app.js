import * as d3B from 'd3'
import * as d3Collection from 'd3-collection'
import {TweenMax} from "gsap";
import {numberWithCommas} from 'shared/js/util.js'

let d3 = Object.assign({}, d3B, d3Collection);
console.log('v-13-c')
const slots = d3.selectAll("div[id*='interactive-slot-']").nodes();

let isMobile = window.matchMedia('(max-width: 700px)').matches;

let data = [];

let dataContinentsAcum = [];
let dataContinentsDaily = [];

const dataCountriesAcum = [];
let dataCountriesDaily = [];

let dataSelected = dataContinentsDaily;

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

	let entriesRaw = Object.entries(data[data.length-1]).slice(1)/*.filter(d => d[1] > 0)*/
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

	let prevDate;

	dates.map((date,i) => {

		prevDate = i > 0 ? dates[i-1] : date;

		let objCountry = {date:date};
		let objCountryDaily = {date:date};

		data.map(country => objCountry[country['Country/Region']] = +country[date])
		data.map((country,j) => {

			let prevDeaths = i < 1 ? 0 : +country[prevDate];

			objCountryDaily[country['Country/Region']] = +country[date] - prevDeaths;
		})
		

		dataCountriesAcum.push(objCountry)
		dataCountriesDaily.push(objCountryDaily)

		dataContinentsAcum.push({date:date})
		dataContinentsDaily.push({date:date})

		countriesByDate[date] = objCountry;

		continents.map(continent => {

			let con = rawData.filter(f => f.Continent === continent);

			let sumAcum = d3.sum(con, s => s[date]);
			let sumDaily = d3.sum(con, s => {

				let prevDeaths = i < 1 ? 0 : +s[prevDate];

				return s[date] - prevDeaths
			});

			let filteredAcum = dataContinentsAcum.filter(d => d.date === date)[0];
			let filteredDaily = dataContinentsDaily.filter(d => d.date === date)[0];

			filteredAcum[con[0].Continent.replace(/\s/g, '-')] = sumAcum;
			filteredDaily[con[0].Continent.replace(/\s/g, '-')] = sumDaily;

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

	svg.append('g')
	.attr('class', ('continent-fill-g'))

	svg.append('g')
	.attr('class', ('countries-buttons'))

	svg.append("g")
	.call(xAxis); 

	svg.append("g")
	.call(yAxis);

	d3.select('.y.axis .domain').remove()
	d3.selectAll('.x.axis .domain').remove()

	let slider = `<div class="no2-slider s-${id}">
           			 <div class="no2-slider__inner"></div>
        		</div>`

   counter.append('div').html(slider)

   d3.select(`.s-${id} .no2-slider__inner`)
   .on('click', (event,i) => {

   		d3.selectAll(".gv-1m-deaths-svg-" + id + ' .countries-buttons path').remove()

   		let selected = d3.select(event.target).attr('class').indexOf('no2-right') == -1 ? true : false;

   		let dataContinents = selected == true ? dataContinentsAcum : dataContinentsDaily;
   		let dataCountriesSelected = selected == true ? dataCountriesAcum : dataCountriesDaily;

   		console.log(dataContinents,id)

   		if(id > 1)dataSelected = dataContinents.filter(d => timeParse(d.date) <= timeParse(keyDates[id-1].date) )
   		else dataSelected = dataContinents.filter(d => timeParse(d.date) <= timeParse(keyDates[0].date) )

   		if(id > 1)dataCountriesSelected = dataCountriesSelected.filter(d => timeParse(d.date) <= timeParse(keyDates[id-1].date) )
   		else dataCountriesSelected = dataCountriesSelected.filter(d => timeParse(d.date) <= timeParse(keyDates[0].date) )

	   	d3.select(event.target)
	   	.classed('no2-right', selected);

		let max = d3.max(dataSelected.map(d => d3.sum(Object.values(d))));

		let localYScale = d3.scaleLinear()
		.range([height - margin.bottom, margin.top])

		let localXScale = d3.scaleTime()
		.range([0, width + margin.right])
		.domain([iniDate, timeParse(keyDates[id-1].date)]);

		selected == true ?
	   	localYScale
	   	.domain([0,keyDates[id-1].deaths])
	   	:
	   	localYScale
	   	.domain([0,max]);

	   	let localArea = d3.area()
		.x(d => localXScale(timeParse(d.data.date)))
		.y0(d => localYScale(d[0]))
		.y1(d => localYScale(d[1]))

		let localYAxis = (g) => {
			return g
			.attr("class", 'y axis')
			.call(d3.axisLeft(localYScale)
					.tickFormat(d => numberWithCommas(d))
					.tickSizeInner(-width)
					.ticks(3)
			)
			.selectAll("text")
			.style("text-anchor", "start")
			.attr('x', 0)
			.attr('y', -10);
		}

		d3.selectAll(".gv-1m-deaths-svg-" + id + " .y.axis")
		//.transition().duration(1000)
		.call(localYAxis);

		d3.select('.y.axis .domain').remove()

	   	let areas = d3.select('.gv-1m-deaths-svg-' + id + ' .continent-fill-g')
		.selectAll("path")
		.data(stacked(dataSelected));

		// enter selection
		areas
		.enter()
		.append("path")

		// update selection
		let fills = d3.selectAll(".gv-1m-deaths-svg-" + id + ' .continent-fill')

		areas
		  .transition()
		  .duration(300)
		  .attr('d', localArea)
		  .on('end', (d,i) => {

	
			if(i==fills.nodes().length-1)
			{

				let id = +d3.select(svg.node()).attr('id').split('-')[4] -1;

				let all = dataSelected.filter(d => timeParse(d.date) <= timeParse(keyDates[id].date));

				let max2 = d3.max(all.map(d => d3.sum(Object.values(d))));


				selected == true ?
			   	yScale
			   	.domain([0,keyDates[id].deaths])
			   	:
			   	yScale
			   	.domain([0,max2]);


				xScale.domain(localXScale.domain())
				yScale.domain(localYScale.domain())

				makeCountryChart(d3.select(".gv-1m-deaths-svg-" + (id + 1)), dataCountriesSelected)
			}
		})



		// exit selection
		areas
		.exit()
		.remove();

   		
   })

   console.log(id)

   let filtered;
   if(id > 1)filtered = dataSelected.filter(d => timeParse(d.date) <= timeParse(keyDates[id-1].date) )
   else filtered = dataSelected.filter(d => timeParse(d.date) <= timeParse(keyDates[0].date) )


	makeContinentChart(svg,stacked(filtered))

	updateScales(date)

}

const updateScales = (date) => {

	let all = dataContinentsDaily.filter(d => timeParse(d.date) <= timeParse(date));

	let max = d3.max(all.map(d => d3.sum(Object.values(d))));

	yScale.domain([0,max]);
	
	xScale.domain([iniDate,timeParse(date)])
}

const update = (svg, date, counter, deaths, continents) => {

	updateScales(date)

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

	var Cont={val:deathsOld} , NewVal = keyDates.find(d => d.date === date).deaths ;

	let animation = TweenMax.to(Cont, 1, {
		  var: NewVal,
		  onUpdate: function() {

		  	counter.select('.counter-deaths')
			.html(numberWithCommas(Math.ceil(Cont.var)))
		  }
	});

	makeContinentChart(svg);

	svg.selectAll(".y.axis")
	//.transition().duration(1000)
	.call(yAxis);

	svg.selectAll(".x.axis")
	//.transition().duration(1000)
	.call(xAxis);

	d3.select('.y.axis .domain').remove()
	d3.selectAll('.x.axis .domain').remove()
}


const makeContinentChart = (svg, data = null) => {

	if(data != null)
	{

		let continentsFill = svg.select('.continent-fill-g')
		.selectAll('path')
		.data(data)
		.enter()
		.append('path')
		.attr('class', d => 'continent-fill ' + d.key)
		.attr('d', area)

	}
	else
	{

		let fills = svg.selectAll('.continent-fill')

		svg.selectAll('.continent-fill')
		.transition()
		.duration(300)
		.attr('d',area)
		.on('end', (d,i) => {
	
			if(i==fills.nodes().length-1)
			{

				let id = +d3.select(svg.node()).attr('id').split('-')[4] -1;

				let filtered = dataCountriesDaily.filter(d => timeParse(d.date) <= timeParse(keyDates[id].date) )

				updateScales(keyDates[id].date)

				makeCountryChart(svg, filtered)
			}
		})
	}
}

const makeCountryChart = (svg, data) => {

		let key;
		let tt;

		svg.select('.countries-buttons').selectAll('path').remove()

		let countries = svg.select('.countries-buttons')
		.selectAll('path')
		.data(stacked(data))
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
		.on('mousemove', event => {

			let id = event.target.parentNode.parentNode.parentNode.id;

			tt = d3.selectAll('#' + id + ' .tooltip')

			let here = d3.pointer(event);

		    let left = here[0];
		    let top = here[1];

		    let bRect = tt.node().getBoundingClientRect();

			let tWidth = bRect.width;
			let tHeight = bRect.height;

		    let posX = left - tWidth - 6;
		    let posY = top - tHeight - 6;

		    if(posX + tWidth > width)posX = width - tWidth - 2

		    tt.style('left',  posX + 'px')
			tt.style('top', posY + 'px')
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

		    			let continents = dataContinentsAcum.filter(c => c.date === keyDates[i].date);

		    			let data = dataContinentsDaily.find(f => f.date === keyDates[i].date);

		    			let deaths = d3.sum(Object.values(data))

		    			updateScales(keyDates[i].date)

		    			update(d3.select('.gv-1m-deaths-svg-' + (i+1)), keyDates[i].date, d3.select('.counter' + (i+1)), 10000, continents);

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
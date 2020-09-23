import * as d3B from 'd3'

import * as voronoiMap  from 'd3-voronoi-map';
import { weightedVoronoi } from 'd3-weighted-voronoi';

let d3 = Object.assign({}, d3B, voronoiMap);

const atomEl = d3.select('.interactive-wrapper-voronoi').node();

let isMobile = window.matchMedia('(max-width: 700px)').matches;

let overallData;
let totalPopulationByYear = {};
let remarquableData;

let margin = {top: 10, right: 10, bottom: 10, left: 10};

let width = atomEl.getBoundingClientRect().width;
let height =  isMobile ? window.innerHeight : width * 2.5 / 4;

let mapCenter = [width / 2, height /2];

let baseRadius = 150;
let baseTotalPopulation;
let year;
let dataOfYear;
let totalPopulationOfYear;
let circlingPolygon;
let firstFrame;
let simulation;
let polygons;

let svg;
let drawingArea;
let mapContainer;

let radiusRatioAcum;

d3.json('https://interactive.guim.co.uk/docsdata-test/1YyNb9oLJOIgIUZcu-FpvCnluaBm0f_uu0f-YIHmI4tc.json')
.then( spreadsheet => {
	let rawData = spreadsheet.sheets.Graphic_Countries;
	
})

d3.csv('../../../assets/globalPopulationByRegionUntil2100.csv')
.then( data => {

	data.forEach(d => csvParser(d));

	overallData = data;

	initData(); 
	initLayout();

	loopThroughYears();
});

const initData = ()  => {

	baseTotalPopulation = totalPopulationByYear[1950];
	year = 1950;
	circlingPolygon = computeCirclingPolygon(baseRadius);
	firstFrame = true;

}

const initLayout = ()  => {

	svg = d3.select(".interactive-wrapper-voronoi")
	.append('svg')
	.attr("width", width)
	.attr("height", height);

	drawingArea = svg.append("g")
	.classed("drawingArea", true)

	mapContainer = drawingArea.append("g")
	.classed("map-container", true)

	mapContainer.append("g")
	.classed('highlighters', true);

}

const loopThroughYears = ()  => {

	totalPopulationOfYear = totalPopulationByYear[year];

	makeDataForYear();

	simulate();

	if (year<2100) {
		year += 5;
		setTimeout(loopThroughYears, 500);
	}
}

const simulate = () => {

	simulation = d3.voronoiMapSimulation(dataOfYear)
	.clip(circlingPolygon)
	.weight(d => d.populationOfYear)
	.convergenceRatio(0.02)
	.on("tick", d => {
          polygons = simulation.state().polygons;
          update();
      })
	.on("end", d => {
		attachMouseListener(dataOfYear);
		firstFrame = false;
	}); 


	if (firstFrame) {
          
          simulation.initialPosition(d3.voronoiMapInitialPositionPie().startAngle(-Math.PI/10));

         radiusRatioAcum = Math.sqrt(totalPopulationOfYear/baseTotalPopulation) ;
	}
    else {

          simulation.initialPosition((d)=>[d.previousX, d.previousY])
          .initialWeight((d)=>d.previousWeight);
    }
}

const makeDataForYear = ()  => {

	totalPopulationOfYear = totalPopulationByYear[year];
	dataOfYear = overallData.map((d)=>{
		return {
			id: d.id,
			continent: d.continent,
			populationOfYear: d[year],
			color: d.color,
			previousX: NaN,
			previousY: NaN,
			previousWeight: NaN
		}
	}).sort((a,b) => b.id - a.id);

	if (!firstFrame) {
		let previousPolygonById = {};
		simulation.state().polygons.forEach((p)=>{
			previousPolygonById[p.site.originalObject.data.originalData.id]=p
		})

		dataOfYear.forEach((d) => {
			let previousPolygon = previousPolygonById[d.id];
            d.previousX = previousPolygon.site.x,	//pick previously computed X coord
            d.previousY = previousPolygon.site.y,	//pick previously computed Y coord
            d.previousWeight = previousPolygon.site.weight	//pick previously computed weight
        })
	}
}

const csvParser = (d)  => {

	d3.range(1950, 2101, 5).map((year) => {

		d[year] = +d[year];

		if (totalPopulationByYear[year])
		{
			totalPopulationByYear[year] += d[year];
		}
		else
		{
			totalPopulationByYear[year] = d[year];
		}
	});
	d.id = +d.id;
	return d;
}
      
const computeCirclingPolygon = (radius)  => {

	let points = 50;
	let increment = 2 * Math.PI / points;
	let circlingPolygon = [];

	for (let a=0, i=0; i<points; i++, a+=increment) {

		circlingPolygon.push([radius*Math.cos(a), radius*Math.sin(a)])
	}

	return circlingPolygon;
};

const update = ()  => {

	let radiusRatio = Math.sqrt(totalPopulationOfYear/baseTotalPopulation);

	mapContainer
	.attr("transform", "translate("+mapCenter+")scale("+radiusRatioAcum+")")
	.transition()
	.duration(500)
	.attr("transform", "translate("+mapCenter+")scale("+radiusRatio+")");

	radiusRatioAcum = radiusRatio;

	let highlighters = mapContainer.select(".highlighters")
	.selectAll(".highlighter")
	.data(polygons);

	highlighters
	.enter()
	.append("path")
	.merge(highlighters)
	.attr("class", d => "group-" + d.site.originalObject.data.originalData.id)
	.classed("highlighter", true)
	.attr("d", d => "M" + d.join(",")+"z");
}

const attachMouseListener = (dataOfYear) => {
	let regionId;

	dataOfYear.forEach(d => {

		regionId = d.id

		d3.selectAll(".group-"+regionId)
		.on("mouseenter", highlight(regionId, true))
		.on("mouseleave", highlight(regionId, false));
	})
} 

const highlight = (regionId, highlight) => {
	return d => {
		d3.selectAll(".group-"+regionId)
		.classed("highlight", highlight);
	}
}
function app() {
	queue()
		.defer(d3.json, "us_states_5m.geo.json")
		.defer(d3.csv, "us_pop.csv")
		.awaitAll(generateMap);	
}

function generateMap(error, results) {	

	var usStates = results[0];
	var usPop = results[1];
	// The data in usStates is in alpha-order by state, as is the data in usPop.
	// The ASSERT test below is just a sanity-check for possible corruption.
	
	var i;
	for (i = 0; i < usStates.features.length; i++) {  
		// Assert test.
		if (usStates.features[i].properties.NAME !== usPop[i].State) {
			console.log('ASSERT failure for index: ' + i);
			console.log(usStates.features[i].properties.NAME + ' mismatch with ' + usPop[i].State);
			alert('Input data corrupted: generation of map terminated.');
			return;
		}
		usStates.features[i].properties.POPSTATS = usPop[i];
	}

	var width = 960,
		height = 600;
		
	var svgContainer = d3.select("#map").append("svg")
		.attr("width", width)
		.attr("height", height)
		.style("border", "2px solid steelblue");
		
	popChgScale = d3.scale.threshold()
						.domain([ 0.25, 0.50, 0.75, 1.0, 1.25, 1.50, 1.75, 2.0, Infinity])
						.range(colorbrewer.Greens[9]);		
	popChgScale.domainStrings = function() { return (['< 0.25', '0.25-0.50', '0.50-0.75', '0.75-1.0', '1.0-1.25', 
	                                                  '1.25-1.50', '1.50-1.75', '1.75-2.0', '> 2.0']); };	
		
	var projection = d3.geo.albersUsa()
		.scale(1280)
		.translate([width / 2, height / 2]);

	var geoPath = d3.geo.path()
		.projection(projection);
		
	var map = svgContainer.selectAll("path")
		.data(usStates.features)
		.enter()
		.append("path")
		.attr("d", function(d, i) { return geoPath(d); })
		.style("stroke", "black")
		.style("stroke-width", "0.25px")		
		.style("fill", "#ffffff");
						   
	var aDecades = [ 
			[1790,1800], 
			[1800,1810], [1810,1820], [1820,1830], [1830,1840], [1840,1850], [1850,1860], [1860,1870], [1870,1880], [1880,1890], [1890,1900],
			[1900,1910], [1910,1920], [1920,1930], [1930,1940], [1940,1950], [1950,1960], [1960,1970], [1970,1980], [1980,1990], [1990,2000],
			[2000,2010]
		];
	var index = 0;
	
	setSymbology();
	generateLegend(popChgScale, 'legend', 'Population Change (percent)');
	
	// Bind timer event handler.
	var timerInterval = 5000;
	var id = setInterval(setSymbology, timerInterval);
	
	function setSymbology() {
		var decade = aDecades[index];
		index = (index < aDecades.length-1) ? index+1 : 0;
		
		var szAttr = 'DELTA_' + decade[0] + '_' + decade[1];
 
		$('#titlePrefix').html('Percent Population Change Between ');
		$('#fromYear').html(decade[0]);
		$('#titleMidfix').html(' and ');
		$('#toYear').html(decade[1]);
		
		svgContainer.selectAll("path")
			.transition()
			.duration(2500)		
			.style("fill", function(d, i) { 
							var delta = +d.properties.POPSTATS[szAttr];
							return (delta === -9999) ? '#e8e8e8' : popChgScale(delta);	
					});
	} // setSymbology()
	
	function generateLegend(scale, szDivId, szCaption) {
		var width = 550,
			height = 60;
			
		var svg = d3.select('#' + szDivId).append("svg")
			.attr("width", width)
			.attr("height", height);
			
		var g = svg.append("g");

		// Create data array.
		var legendData = [];
		legendData.push( { d: -9999, r: '#e8e8e8', s: 'N/A' } );
		var i;
		for (i = 0; i < scale.domain().length; i++) {
			legendData.push( { d: scale.domain()[i], r: scale.range()[i], s: scale.domainStrings()[i] } );
		}
		
		g.selectAll("rect")
			.data(legendData)
			.enter().append("rect")
				.attr("height", 28)
				.attr("width", 50)
				.attr("x", function(d,i) { return i * 55; } )
				.attr("y", 20)
				.style("stroke", "black")
				.style("stroke-width", "0.25px")
				.style("fill", function(d,i) { return d.r; });
			
		g.selectAll("text")
			.data(legendData)
			.enter().append("text")
				.attr("x", function(d,i) { return i * 55; } )
				.attr("y", 60)
				.text(function(d,i) { return d.s; } )
				.style("font-size", "12px");

		g.append("text")
			.attr("class", "caption")
			.attr("y", 12)
			.text(szCaption);
	} // generateLegend()
} // generateMap

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { topicColors } from '../utils/colors';
import '../styles/TopicEvolution.css';

const TopicEvolution = ({ data }) => {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const [view, setView] = useState('stream'); // 'stream' or 'line'
  const [highlightedTopic, setHighlightedTopic] = useState(null);
  
  useEffect(() => {
    if (!data || !svgRef.current || !tooltipRef.current) return;
    
    const topicEvolution = data.processed.topicEvolution;
    const topicLabels = data.raw.topicLabels;
    
    // Format data for visualization
    const formattedData = formatDataForVisualization(topicEvolution, view);
    
    // Create the visualization
    createVisualization(formattedData, topicLabels, svgRef, tooltipRef, view, highlightedTopic);
    
  }, [data, view, highlightedTopic]);
  
  // Format data for different visualization types
  const formatDataForVisualization = (evolutionData, viewType) => {
    if (viewType === 'stream') {
      // For stream graph, we need data in a stacked format
      const years = evolutionData.map(d => d.year);
      const stackedData = [];
      
      // Create arrays for each topic
      for (let i = 1; i <= 13; i++) {
        const topicKey = `Topic_${i}`;
        const topicData = evolutionData.map(yearData => {
          return {
            year: yearData.year,
            value: yearData.topicDistribution[topicKey] || 0
          };
        });
        
        stackedData.push({
          key: topicKey,
          values: topicData
        });
      }
      
      return stackedData;
    } else {
      // For line chart, similar format but different processing for D3
      const lineData = [];
      
      for (let i = 1; i <= 13; i++) {
        const topicKey = `Topic_${i}`;
        const topicValues = evolutionData.map(d => ({
          year: d.year,
          value: d.topicDistribution[topicKey] || 0
        }));
        
        lineData.push({
          id: topicKey,
          values: topicValues
        });
      }
      
      return lineData;
    }
  };
  
  // Create the visualization based on data and view type
  const createVisualization = (formattedData, topicLabels, svgRef, tooltipRef, viewType, highlightedTopic) => {
    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();
    
    const margin = { top: 40, right: 80, bottom: 60, left: 60 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Extract all years from the data
    const years = [...new Set(formattedData[0].values.map(d => d.year))].sort((a, b) => a - b);
    
    // Create X scale
    const x = d3.scaleLinear()
      .domain([d3.min(years), d3.max(years)])
      .range([0, width]);
    
    // Create tooltip
    const tooltip = d3.select(tooltipRef.current);
    
    if (viewType === 'stream') {
      // Create StreamGraph
      createStreamGraph(svg, formattedData, x, height, width, topicLabels, tooltip, highlightedTopic, years);
    } else {
      // Create LineChart
      createLineChart(svg, formattedData, x, height, width, topicLabels, tooltip, highlightedTopic);
    }
    
    // Add X axis
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x)
        .tickFormat(d => d.toString())
        .ticks(width > 600 ? 10 : 5))
      .call(g => g.select(".domain").remove())
      .selectAll("text")
      .style("font-size", "12px");
    
    // Add X axis label
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + 40)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--text-primary)")
      .style("font-size", "14px")
      .text("Year");
  };
  
  // Create a stream graph visualization
  const createStreamGraph = (svg, data, x, height, width, topicLabels, tooltip, highlightedTopic, years) => {
    // Clear any existing labels and markers
    svg.selectAll(".topic-marker, .topic-label").remove();
    
    // Prepare data for stacking
    const stackData = [];
    
    years.forEach(year => {
      const yearData = { year };
      
      data.forEach(topic => {
        const yearValue = topic.values.find(v => v.year === year);
        yearData[topic.key] = yearValue ? yearValue.value : 0;
      });
      
      stackData.push(yearData);
    });
    
    // Create stack generator
    const keys = data.map(d => d.key);
    const stack = d3.stack()
      .keys(keys)
      .offset(d3.stackOffsetWiggle)
      .order(d3.stackOrderNone);
    
    const series = stack(stackData);
    
    // Create Y scale (no fixed domain for streamgraph)
    const y = d3.scaleLinear()
      .domain([d3.min(series, s => d3.min(s, d => d[0])), 
               d3.max(series, s => d3.max(s, d => d[1]))])
      .range([height, 0]);
    
    // Create area generator
    const area = d3.area()
      .x(d => x(d.data.year))
      .y0(d => y(d[0]))
      .y1(d => y(d[1]))
      .curve(d3.curveBasis);
    
    // Create legend
    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(0, -30)`);
    
    // Find topic names
    const topicNames = keys.map(key => {
      const topicNumber = key.replace("Topic_", "");
      const topicLabel = topicLabels.find(label => label["Topic Number"] === `Topic ${topicNumber}`);
      return topicLabel ? topicLabel["Topic Name"] : key;
    });
    
    // Add areas
    const paths = svg.selectAll(".area")
      .data(series)
      .enter()
      .append("path")
      .attr("class", d => `area topic-${d.key.replace("Topic_", "")}`)
      .attr("d", area)
      .style("fill", d => topicColors[d.key])
      .style("opacity", d => highlightedTopic && d.key !== highlightedTopic ? 0.3 : 0.8)
      .on("mouseover", function(event, d) {
        // Highlight this area
        d3.select(this).style("opacity", 1);
        
        // Get topic name
        const topicNumber = d.key.replace("Topic_", "");
        const topicLabel = topicLabels.find(label => label["Topic Number"] === `Topic ${topicNumber}`);
        const topicName = topicLabel ? topicLabel["Topic Name"] : d.key;
        
        // Show tooltip
        tooltip
          .style("opacity", 1)
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 10}px`)
          .html(`
            <div class="tooltip-title">${topicName}</div>
            <div class="tooltip-subtitle">${d.key}</div>
          `);
      })
      .on("mousemove", function(event, d) {
        // Get mouse X position and find nearest year
        const mouseX = d3.pointer(event)[0];
        const yearScale = x.invert(mouseX);
        const nearestYearIndex = d3.bisector(d => d.year).left(stackData, yearScale);
        const dataPoint = nearestYearIndex < stackData.length ? stackData[nearestYearIndex] : stackData[stackData.length - 1];
        
        // Get topic name
        const topicNumber = d.key.replace("Topic_", "");
        const topicLabel = topicLabels.find(label => label["Topic Number"] === `Topic ${topicNumber}`);
        const topicName = topicLabel ? topicLabel["Topic Name"] : d.key;
        
        // Show tooltip with value for that year
        tooltip
          .style("opacity", 1)
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 10}px`)
          .html(`
            <div class="tooltip-title">${topicName}</div>
            <div class="tooltip-subtitle">${d.key}</div>
            <div class="tooltip-value">Year: ${dataPoint.year}</div>
            <div class="tooltip-value">Value: ${(dataPoint[d.key] * 100).toFixed(2)}%</div>
          `);
      })
      .on("mouseout", function(event, d) {
        // Restore original opacity
        d3.select(this).style("opacity", highlightedTopic && d.key !== highlightedTopic ? 0.3 : 0.8);
        
        // Hide tooltip
        tooltip.style("opacity", 0);
      })
      .on("click", function(event, d) {
        // Toggle highlighted topic
        setHighlightedTopic(highlightedTopic === d.key ? null : d.key);
      });
    
    // For stream graph - add persistent labels for the highlighted topic
    if (highlightedTopic) {
      const selectedLine = data.find(d => d.id === highlightedTopic);
      if (selectedLine) {
        // Get topic name
        const topicNumber = selectedLine.id.replace("Topic_", "");
        const topicLabel = topicLabels.find(label => label["Topic Number"] === `Topic ${topicNumber}`);
        const topicName = topicLabel ? topicLabel["Topic Name"] : selectedLine.id;
        
        // Add markers at key points of the line
        const positions = [0, Math.floor(selectedLine.values.length / 2), selectedLine.values.length - 1];
        
        positions.forEach(i => {
          const point = selectedLine.values[i];
          
          // Add circle marker
          svg.append("circle")
            .attr("class", "topic-marker")
            .attr("cx", x(point.year))
            .attr("cy", y(point.value))
            .attr("r", 5)
            .attr("fill", topicColors[selectedLine.id])
            .attr("stroke", "white")
            .attr("stroke-width", 2);
        });
        
        // Add text label at the bottom center of the chart
        svg.append("text")
          .attr("class", "topic-label")
          .attr("x", width / 2)
          .attr("y", height + 15) // Position below the x-axis
          .attr("text-anchor", "middle") // Center align
          .attr("fill", topicColors[selectedLine.id])
          .attr("font-weight", "bold")
          .attr("font-size", "14px")
          .text(topicName);
      }
    }
    
    // Replace the label code in the stream graph section with this:
    
    // For stream graph - add persistent labels for the highlighted topic
    if (highlightedTopic) {
      const selectedArea = series.find(d => d.key === highlightedTopic);
      if (selectedArea) {
        // Get topic name
        const topicNumber = selectedArea.key.replace("Topic_", "");
        const topicLabel = topicLabels.find(label => label["Topic Number"] === `Topic ${topicNumber}`);
        const topicName = topicLabel ? topicLabel["Topic Name"] : selectedArea.key;
        
        // Find middle point on the rightmost area
        const lastYearData = selectedArea[selectedArea.length - 1];
        const middleY = (y(lastYearData[0]) + y(lastYearData[1])) / 2;
        
        // Add circle marker at the rightmost point
        svg.append("circle")
          .attr("class", "topic-marker")
          .attr("cx", x(years[years.length - 1]))
          .attr("cy", middleY)
          .attr("r", 5)
          .attr("fill", topicColors[selectedArea.key])
          .attr("stroke", "white")
          .attr("stroke-width", 2);
        
        // Add text label at the bottom center of the chart
        svg.append("text")
          .attr("class", "topic-label")
          .attr("x", width / 2)
          .attr("y",middleY +50)
          .attr("text-anchor", "middle") // Center align
          .attr("fill", topicColors[selectedArea.key])
          .attr("font-weight", "bold")
          .attr("font-size", "14px")
          .text(topicName);
      }
    }
      
    // Animate the areas
    paths.each(function(d) {
      const path = d3.select(this);
      const totalLength = path.node().getTotalLength();
      
      path
        .attr("stroke-dasharray", `${totalLength},${totalLength}`)
        .attr("stroke-dashoffset", totalLength)
        .transition()
        .duration(2000)
        .attr("stroke-dashoffset", 0)
        .transition()
        .duration(500)
        .attr("stroke-dasharray", "none");
    });
  };
  
  // Create a line chart visualization
  const createLineChart = (svg, data, x, height, width, topicLabels, tooltip, highlightedTopic) => {
    // Clear any existing labels and markers
    svg.selectAll(".topic-marker, .topic-label").remove();
    
    const y = d3.scaleLinear()
    .domain([0, 1.0]) // Full scale
    .range([height, 0]);
    
    // Add Y axis with more appropriate tick format showing decimal places for small values
    svg.append("g")
    .call(d3.axisLeft(y)
      .ticks(5)
      .tickFormat(d => `${(d * 100).toFixed(0)}%`))
    .call(g => g.select(".domain").remove())
    .selectAll("text")
    .style("font-size", "12px");
    
    
    // Add Y axis label
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -40)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--text-primary)")
      .style("font-size", "14px")
      .text("Topic Prevalence");
    
    // Create line generator
    const line = d3.line()
      .x(d => x(d.year))
      .y(d => y(d.value))
      .curve(d3.curveBasis);
    
    // Add lines
    const paths = svg.selectAll(".line")
      .data(data)
      .enter()
      .append("path")
      .attr("class", d => `line topic-${d.id.replace("Topic_", "")}`)
      .attr("d", d => line(d.values))
      .attr("fill", "none")
      .attr("stroke", d => topicColors[d.id])
      .attr("stroke-width", d => highlightedTopic === d.id ? 3 : 2)
      .style("opacity", d => highlightedTopic && d.id !== highlightedTopic ? 0.2 : 1)
      .on("mouseover", function(event, d) {
        // Highlight this line
        d3.select(this)
          .attr("stroke-width", 4)
          .style("opacity", 1);
        
        // Get topic name
        const topicNumber = d.id.replace("Topic_", "");
        const topicLabel = topicLabels.find(label => label["Topic Number"] === `Topic ${topicNumber}`);
        const topicName = topicLabel ? topicLabel["Topic Name"] : d.id;
        
        // Show tooltip
        tooltip
          .style("opacity", 1)
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 10}px`)
          .html(`
            <div class="tooltip-title">${topicName}</div>
            <div class="tooltip-subtitle">${d.id}</div>
          `);
      })
      .on("mousemove", function(event, d) {
        // Get mouse X position and find nearest year
        const mouseX = d3.pointer(event)[0];
        const yearScale = x.invert(mouseX);
        const bisect = d3.bisector(point => point.year).left;
        const index = bisect(d.values, yearScale);
        const dataPoint = index < d.values.length ? d.values[index] : d.values[d.values.length - 1];
        
        // Get topic name
        const topicNumber = d.id.replace("Topic_", "");
        const topicLabel = topicLabels.find(label => label["Topic Number"] === `Topic ${topicNumber}`);
        const topicName = topicLabel ? topicLabel["Topic Name"] : d.id;
        
        // Show tooltip with value for that year
        tooltip
          .style("opacity", 1)
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 10}px`)
          .html(`
            <div class="tooltip-title">${topicName}</div>
            <div class="tooltip-subtitle">${d.id}</div>
            <div class="tooltip-value">Year: ${dataPoint.year}</div>
            <div class="tooltip-value">Value: ${(dataPoint.value * 100).toFixed(2)}%</div>
          `);
      })
      .on("mouseout", function(event, d) {
        // Restore original appearance
        d3.select(this)
          .attr("stroke-width", highlightedTopic === d.id ? 3 : 2)
          .style("opacity", highlightedTopic && d.id !== highlightedTopic ? 0.2 : 1);
        
        // Hide tooltip
        tooltip.style("opacity", 0);
      })
      .on("click", function(event, d) {
        // Toggle highlighted topic
        setHighlightedTopic(highlightedTopic === d.id ? null : d.id);
      });
    
    // For line chart - add persistent labels for the highlighted topic
    if (highlightedTopic) {
      const selectedLine = data.find(d => d.id === highlightedTopic);
      if (selectedLine) {
        // Get topic name
        const topicNumber = selectedLine.id.replace("Topic_", "");
        const topicLabel = topicLabels.find(label => label["Topic Number"] === `Topic ${topicNumber}`);
        const topicName = topicLabel ? topicLabel["Topic Name"] : selectedLine.id;
        
        // Add markers at the beginning, middle, and end of the line
        const positions = [0, Math.floor(selectedLine.values.length / 2), selectedLine.values.length - 1];
        
        positions.forEach(i => {
          const point = selectedLine.values[i];
          
          // Add circle marker
          svg.append("circle")
            .attr("class", "topic-marker")
            .attr("cx", x(point.year))
            .attr("cy", y(point.value))
            .attr("r", 5)
            .attr("fill", topicColors[selectedLine.id])
            .attr("stroke", "white")
            .attr("stroke-width", 2);
          
          // Add text label at end position only (to avoid cluttering)
          if (i === positions[positions.length - 1]) {
            svg.append("text")
              .attr("class", "topic-label")
              .attr("x", x(point.year) + 10)
              .attr("y", y(point.value))
              .attr("dy", "0.35em")
              .attr("fill", topicColors[selectedLine.id])
              .attr("font-weight", "bold")
              .attr("font-size", "12px")
              .text(topicName);
          }
        });
      }
    }
    
    // Animate the lines
    paths.each(function(d) {
      const path = d3.select(this);
      const totalLength = path.node().getTotalLength();
      
      path
        .attr("stroke-dasharray", `${totalLength},${totalLength}`)
        .attr("stroke-dashoffset", totalLength)
        .transition()
        .duration(2000)
        .attr("stroke-dashoffset", 0)
        .transition()
        .duration(500)
        .attr("stroke-dasharray", "none");
    });
  };

  return (
    <section id="evolution" className="topic-evolution">
      <div className="content-wrapper">
        <div className="section-header">
          <h2>Topic Evolution Over Time</h2>
          <p className="section-intro">
            How have literary themes in Qazaq literature evolved from 1910 to 1999? 
            This visualization shows the changing prevalence of different topics over time.
          </p>
          
          <div className="controls">
            <button 
              className={`control-button ${view === 'stream' ? 'active' : ''}`}
              onClick={() => setView('stream')}
            >
              Stream Graph
            </button>
            <button 
              className={`control-button ${view === 'line' ? 'active' : ''}`}
              onClick={() => setView('line')}
            >
              Line Chart
            </button>
            {highlightedTopic && (
              <button 
                className="control-button"
                onClick={() => setHighlightedTopic(null)}
              >
                Clear Selection
              </button>
            )}
          </div>
        </div>
        
        <div className="visualization-container">
          <svg ref={svgRef} className="evolution-chart"></svg>
          <div ref={tooltipRef} className="tooltip"></div>
        </div>
        
        <div className="explanation">
          <p>
            This visualization reveals how literary themes have waxed and waned throughout the 20th century. 
            You can toggle between a stream graph (showing relationships between topics) and a line chart 
            (highlighting individual topic trajectories). Click on any topic to highlight it, or hover to 
            see detailed information.
          </p>
          <p>
            Notice how themes like "Warfare & Military" spike during the mid-1940s (World War II) and 
            themes related to national identity gain prominence in the later Soviet period. Traditional themes 
            like "Nomadic Lifestyle" remain consistent throughout, while "Domestic Life" grows in the later decades.
          </p>
        </div>
      </div>
    </section>
  );
};

export default TopicEvolution;
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { topicColors } from '../utils/colors';
import '../styles/TemporalTrends.css';

const TemporalTrends = ({ data }) => {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const [selectedDecade, setSelectedDecade] = useState(null);
  
  useEffect(() => {
    if (!data || !svgRef.current || !tooltipRef.current) return;
    
    // Extract data we need
    const booksByYear = data.processed.booksByYear;
    const topicLabels = data.raw.topicLabels;
    
    // Create the visualization
    createTemporalVisualization(booksByYear, topicLabels, svgRef, tooltipRef, selectedDecade, setSelectedDecade);
    
  }, [data, selectedDecade]);
  
  const createTemporalVisualization = (booksByYear, topicLabels, svgRef, tooltipRef, selectedDecade, setSelectedDecade) => {
    // Clear previous visualization
    d3.select(svgRef.current).selectAll("*").remove();
    
    // Set up dimensions
    const margin = { top: 50, right: 80, bottom: 90, left: 60 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Create tooltip
    const tooltip = d3.select(tooltipRef.current);
    
    // Process data for visualization
    const yearData = Object.entries(booksByYear).map(([year, data]) => ({
      year: parseInt(year),
      count: data.count,
      topicDistribution: data.topicDistribution
    })).sort((a, b) => a.year - b.year);
    
    // Group years into decades
    const decadeData = {};
    yearData.forEach(yearItem => {
      const decade = Math.floor(yearItem.year / 10) * 10;
      
      if (!decadeData[decade]) {
        decadeData[decade] = {
          decade,
          totalBooks: 0,
          years: [],
          topicSums: {},
          dominantTopics: {}
        };
        
        // Initialize topic sums
        for (let i = 1; i <= 13; i++) {
          decadeData[decade].topicSums[`Topic_${i}`] = 0;
          decadeData[decade].dominantTopics[`Topic_${i}`] = 0;
        }
      }
      
      decadeData[decade].totalBooks += yearItem.count;
      decadeData[decade].years.push(yearItem);
      
      // Sum topic values
      for (let i = 2; i <= 13; i++) {
        const topicKey = `Topic_${i}`;
        if (yearItem.topicDistribution[topicKey] !== undefined) {
          decadeData[decade].topicSums[topicKey] += yearItem.topicDistribution[topicKey] * yearItem.count;
        }
      }
    });
    
    // Calculate average topic distribution per decade
    Object.values(decadeData).forEach(decade => {
      if (decade.totalBooks > 0) {
        for (let i = 1; i <= 13; i++) {
          const topicKey = `Topic_${i}`;
          decade.topicSums[topicKey] /= decade.totalBooks;
        }
      }
      
      // Determine dominant topic for each decade
      let maxTopic = null;
      let maxValue = -Infinity;
      
      for (let i = 1; i <= 13; i++) {
        const topicKey = `Topic_${i}`;
        if (decade.topicSums[topicKey] > maxValue) {
          maxValue = decade.topicSums[topicKey];
          maxTopic = topicKey;
        }
      }
      
      decade.dominantTopic = maxTopic;
    });
    
    // Convert to array for visualization
    const decadeArray = Object.values(decadeData).sort((a, b) => a.decade - b.decade);
    
    // Create scales
    const x = d3.scaleBand()
      .domain(decadeArray.map(d => d.decade))
      .range([0, width])
      .padding(0.2);
    
    const y = d3.scaleLinear()
      .domain([0, d3.max(decadeArray, d => d.totalBooks) * 1.1])
      .range([height, 0]);
    
    // Create bars
    const bars = svg.selectAll(".bar")
      .data(decadeArray)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.decade))
      .attr("width", x.bandwidth())
      .attr("y", d => y(d.totalBooks))
      .attr("height", d => height - y(d.totalBooks))
      .attr("fill", d => topicColors[d.dominantTopic])
      .attr("opacity", d => selectedDecade === d.decade ? 1 : 0.7)
      .attr("stroke", "#fff")
      .attr("stroke-width", d => selectedDecade === d.decade ? 2 : 0)
      .on("mouseover", function(event, d) {
   // Highlight this bar
   d3.select(this)
   .attr("opacity", 1)
   .attr("stroke-width", 2);
 
 // Find dominant topic name
 const dominantTopicNum = d.dominantTopic.replace("Topic_", "");
 const topicLabel = topicLabels.find(label => label["Topic Number"] === `Topic ${dominantTopicNum}`);
 const topicName = topicLabel ? topicLabel["Topic Name"] : d.dominantTopic;
 
 // Find top 3 topics for this decade
 const topTopics = Object.entries(d.topicSums)
   .map(([topic, value]) => {
     const topicNum = topic.replace("Topic_", "");
     const label = topicLabels.find(l => l["Topic Number"] === `Topic ${topicNum}`);
     return {
       topic,
       name: label ? label["Topic Name"] : topic,
       value
     };
   })
   .sort((a, b) => b.value - a.value)
   .slice(0, 3);
  
  // Show enhanced tooltip
  tooltip
    .style("opacity", 1)
    .style("left", `${event.pageX + 10}px`)
    .style("top", `${event.pageY - 10}px`)
    .html(`
      <div class="tooltip-title">${d.decade}s</div>
      <div class="tooltip-value">Books: ${d.totalBooks}</div>
      <div class="tooltip-value">Dominant Theme: ${topicName}</div>
      <div class="tooltip-subtitle">Top Themes:</div>
      <ul class="tooltip-themes">
        ${topTopics.map(t => `<li><span style="color:${topicColors[t.topic]}">${t.name}</span>: ${(t.value * 100).toFixed(1)}%</li>`).join('')}
      </ul>
    `);
})
        .on("mouseout", function(event, d) {
        // Restore original appearance
        d3.select(this)
          .attr("opacity", selectedDecade === d.decade ? 1 : 0.7)
          .attr("stroke-width", selectedDecade === d.decade ? 2 : 0);
        
        // Hide tooltip
        tooltip.style("opacity", 0);
      })
      .on("click", function(event, d) {
        // Toggle selected decade
        setSelectedDecade(selectedDecade === d.decade ? null : d.decade);
      });
    
    // Add X axis
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d => `${d}s`))
      .selectAll("text")
      .style("font-size", "12px")
      .attr("transform", "rotate(-45)")
      .attr("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em");
    
    // Add X axis label
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + 60)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--text-primary)")
      .style("font-size", "14px")
      .text("Decade");
    
    // Add Y axis
    svg.append("g")
      .call(d3.axisLeft(y))
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
      .text("Number of Books");
    
    // Add chart title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--text-primary)")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text("Book Publication by Decade and Dominant Theme");
    


// If a decade is selected, show pie chart of topic distribution
if (selectedDecade) {
    // Find selected decade data
    const decadeInfo = decadeArray.find(d => d.decade === selectedDecade);
    
    if (decadeInfo) {
      // First, clear any existing pie charts
      svg.selectAll(".pie-chart-group").remove();
      
      const pieData = [];
      
      // Prepare data for pie chart
      for (let i = 1; i <= 13; i++) {
        const topicKey = `Topic_${i}`;
        const topicValue = decadeInfo.topicSums[topicKey];
        
        if (topicValue > 0) {
          const topicLabel = topicLabels.find(l => l["Topic Number"] === `Topic ${i}`);
          const topicName = topicLabel ? topicLabel["Topic Name"] : topicKey;
          
          pieData.push({
            topic: topicKey,
            name: topicName,
            value: topicValue
          });
        }
      }
      
      // Check if we have data to show
      if (pieData.length > 0) {
        console.log("Creating pie chart for decade:", selectedDecade);
        
        // Create pie chart directly in the SVG
        const pieRadius = Math.min(width, height) * 0.25; // Adjust size based on chart dimensions
        const pieX = width * 0.75;  // Position in the right side of the chart
        const pieY = height * 0.4;  // Position in the upper part
        
        // Create a background for the pie chart
        const pieGroup = svg.append("g")
          .attr("class", "pie-chart-group")
          .attr("transform", `translate(${pieX},${pieY})`);
        
        // Add a white background circle
        pieGroup.append("circle")
          .attr("r", pieRadius + 10)
          .attr("fill", "white")
          .attr("stroke", "#ddd")
          .attr("stroke-width", 1)
          .attr("opacity", 0.9);
        
        // Add title for the pie chart
        pieGroup.append("text")
          .attr("class", "pie-title")
          .attr("text-anchor", "middle")
          .attr("dy", -pieRadius - 15)
          .style("font-size", "14px")
          .style("font-weight", "bold")
          .text(`Topic Distribution in the ${selectedDecade}s`);
        
        // Add a close button (X symbol)
        const closeButton = pieGroup.append("g")
          .attr("class", "close-button")
          .attr("transform", `translate(${pieRadius + 15}, ${-pieRadius - 15})`)
          .style("cursor", "pointer")
          .on("click", function() {
            svg.selectAll(".pie-chart-group").remove();
            setSelectedDecade(null);
          });
        
        closeButton.append("circle")
          .attr("r", 10)
          .attr("fill", "#f5f5f5")
          .attr("stroke", "#ccc")
          .attr("stroke-width", 1);
        
        closeButton.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", "0.3em")
          .style("font-size", "14px")
          .style("font-weight", "bold")
          .text("×");
        
        // Create the pie generator
        const pie = d3.pie()
          .value(d => d.value)
          .sort(null);
        
        // Create the arc generator
        const arc = d3.arc()
          .innerRadius(0)
          .outerRadius(pieRadius);
        
        // Add pie slices
        const slices = pieGroup.selectAll(".slice")
          .data(pie(pieData))
          .enter()
          .append("path")
          .attr("class", "slice")
          .attr("d", arc)
          .attr("fill", d => topicColors[d.data.topic])
          .attr("stroke", "white")
          .attr("stroke-width", 1)
          .style("opacity", 0.85)
          .on("mouseover", function(event, d) {
            // Highlight this slice
            d3.select(this)
              .style("opacity", 1)
              .attr("stroke-width", 2);
            
            // Show tooltip
            tooltip
              .style("opacity", 1)
              .style("left", `${event.pageX + 10}px`)
              .style("top", `${event.pageY - 10}px`)
              .html(`
                <div class="tooltip-title">${d.data.name}</div>
                <div class="tooltip-value">Prevalence: ${(d.data.value * 100).toFixed(2)}%</div>
              `);
          })
          .on("mouseout", function() {
            // Restore original appearance
            d3.select(this)
              .style("opacity", 0.85)
              .attr("stroke-width", 1);
            
            // Hide tooltip
            tooltip.style("opacity", 0);
          });
        
        // Animate the pie chart appearance
        slices
          .transition()
          .duration(800)
          .attrTween("d", function(d) {
            const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
            return function(t) {
              return arc(interpolate(t));
            };
          });
        
        // Add a simple legend on the side
        const legendSpacing = 20;
        const legendData = pieData.sort((a, b) => b.value - a.value).slice(0, 5);
        
        const legend = pieGroup.append("g")
          .attr("class", "pie-legend")
          .attr("transform", `translate(${pieRadius + 30}, ${-pieRadius * 0.6})`);
        
        const legendItems = legend.selectAll(".legend-item")
          .data(legendData)
          .enter()
          .append("g")
          .attr("class", "legend-item")
          .attr("transform", (d, i) => `translate(0, ${i * legendSpacing})`);
        
        legendItems.append("rect")
          .attr("width", 12)
          .attr("height", 12)
          .attr("fill", d => topicColors[d.topic]);
        
        legendItems.append("text")
          .attr("x", 20)
          .attr("y", 10)
          .style("font-size", "11px")
          .text(d => {
            const name = d.name.length > 15 ? d.name.substring(0, 12) + "..." : d.name;
            return `${name} (${(d.value * 100).toFixed(1)}%)`;
          });
      }
    }
  }
    
    // Handle window resize
    const handleResize = () => {
      const newWidth = svgRef.current.clientWidth - margin.left - margin.right;
      
      // Update scales
      x.range([0, newWidth]);
      
      // Resize SVG
      svg.attr("width", newWidth + margin.left + margin.right);
      
      // Update bar positions and widths
      bars
        .attr("x", d => x(d.decade))
        .attr("width", x.bandwidth());
      
      // Update X axis
      svg.select(".x-axis")
        .call(d3.axisBottom(x).tickFormat(d => `${d}s`));
      
      // Update X axis label position
      svg.select(".x-label")
        .attr("x", newWidth / 2);
      
      // Update chart title position
      svg.select(".chart-title")
        .attr("x", newWidth / 2);
      
      // If pie chart exists, update its position
      if (selectedDecade) {
        const pieRadius = 150;
        const pieX = newWidth - pieRadius - 20;
        
        svg.select(".pie-chart")
          .attr("transform", `translate(${pieX},${height / 2})`);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  };

  return (
    <section id="trends" className="temporal-trends">
      <div className="content-wrapper">
        <div className="section-header">
          <h2>Literary Production Through Time</h2>
          <p className="section-intro">
            How has Qazaq literary production changed over the 20th century? This visualization
            shows the volume of literature produced in each decade and the dominant themes of each period.
          </p>
          
          <div className="controls">
            {selectedDecade && (
              <button 
                className="control-button"
                onClick={() => setSelectedDecade(null)}
              >
                Clear Selection
              </button>
            )}
          </div>
        </div>
        
        <div className="visualization-container">
          <svg ref={svgRef} className="trends-chart"></svg>
          <div ref={tooltipRef} className="tooltip"></div>
        </div>
        
        <div className="explanation">
          <p>
            This chart reveals both the volume of Qazaq literature produced in each decade and the
            dominant literary themes of each period. The color of each bar indicates the most prevalent
            theme in that decade's literature.
          </p>
          <p>
            Click on any decade to see a detailed breakdown of its thematic composition. Notice how
            literary production increases significantly in the latter half of the 20th century, and
            how dominant themes shift over time, reflecting changing cultural, political, and social
            contexts in Kazakhstan.
          </p>
        </div>
      </div>
    </section>
  );
};

export default TemporalTrends;
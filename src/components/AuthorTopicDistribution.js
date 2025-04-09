import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { topicColors } from '../utils/colors';
import '../styles/AuthorTopicDistribution.css';

const AuthorTopicDistribution = ({ data }) => {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const [selectedAuthor, setSelectedAuthor] = useState(null);
  
  useEffect(() => {
    if (!data || !svgRef.current || !tooltipRef.current) return;
    
    const topAuthors = data.processed.topAuthors;
    const topicLabels = data.raw.topicLabels;
    
    // Create the visualization
    createVisualization(topAuthors, topicLabels, svgRef, tooltipRef, selectedAuthor, setSelectedAuthor);
    
  }, [data, selectedAuthor]);
  
  const createVisualization = (authors, topicLabels, svgRef, tooltipRef, selectedAuthor, setSelectedAuthor) => {
    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();
    
    const margin = { top: 60, right: 200, bottom: 80, left: 250 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const height = Math.max(500, authors.length * 40) - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Create tooltip
    const tooltip = d3.select(tooltipRef.current);
    
    // Get topic names for labels
    const topicNames = {};
    topicLabels.forEach(label => {
      const topicNumber = label["Topic Number"].replace("Topic ", "");
      topicNames[`Topic_${topicNumber}`] = label["Topic Name"];
    });
    
    // Prepare data for stacked bar chart
    const stackedData = [];
    
    authors.forEach(author => {
      const authorData = {
        name: author.name,
        count: author.count
      };
      
      // Add topic values
      for (let i = 1; i <= 13; i++) {
        const topicKey = `Topic_${i}`;
        authorData[topicKey] = author.topicDistribution[topicKey] || 0;
      }
      
      stackedData.push(authorData);
    });
    
    // Create Y scale for authors
    const y = d3.scaleBand()
      .domain(authors.map(a => a.name))
      .range([0, height])
      .padding(0.1);
    
      const x = d3.scaleLinear()
      .domain([0, 1.0]) // 
      .range([0, width]);
    
    // Create stacks
    const stack = d3.stack()
      .keys(Array.from({length: 13}, (_, i) => `Topic_${i+1}`))
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone);
    
    const series = stack(stackedData);
    
    // Add Y axis
    svg.append("g")
      .call(d3.axisLeft(y))
      .selectAll("text")
        .style("font-size", "12px")
        .style("font-weight", d => selectedAuthor === d ? "bold" : "normal")
        .attr("fill", d => selectedAuthor === d ? "var(--accent-primary)" : "var(--text-primary)")
        .on("click", function(event, d) {
          const topicKey = d3.select(this.parentNode).datum().key;
  const authorName = d.data.name;
  const topicName = topicNames[topicKey] || topicKey;
  const value = d[1] - d[0];
  
  // Remove any existing persistent labels
  svg.selectAll(".persistent-label").remove();
  
  // Add a persistent label
  svg.append("text")
    .attr("class", "persistent-label")
    .attr("x", x(d[0] + (d[1] - d[0])/2))
    .attr("y", y(d.data.name) + y.bandwidth()/2)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("font-size", "12px")
    .attr("font-weight", "bold")
    .attr("fill", "black")
    .attr("pointer-events", "none")
    .text(`${topicName}: ${(value * 100).toFixed(1)}%`);
});
    // Add X axis
    svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d => `${(d * 100).toFixed(0)}%`))
    .selectAll("text")
      .style("font-size", "12px");
    // Add X axis label
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + 40)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--text-primary)")
      .style("font-size", "14px")
      .text("Topic Prevalence");
    
    // Add stacked bars
    const groups = svg.append("g")
      .selectAll("g")
      .data(series)
      .enter()
      .append("g")
      .attr("fill", d => topicColors[d.key]);
    
    groups.selectAll("rect")
      .data(d => d)
      .enter()
      .append("rect")
      .attr("x", d => x(d[0]))
      .attr("y", d => y(d.data.name))
      .attr("width", d => x(d[1]) - x(d[0]))
      .attr("height", y.bandwidth())
      .attr("opacity", 0.8)
      .attr("stroke", "white")
      .attr("stroke-width", 0.5)
      .on("mouseover", function(event, d) {
        // Highlight this segment
        d3.select(this)
          .attr("opacity", 1)
          .attr("stroke-width", 1);
        
        // Find which topic this is
        const topicKey = d3.select(this.parentNode).datum().key;
        const topicName = topicNames[topicKey] || topicKey;
        
        // Calculate value
        const value = d[1] - d[0];
        
        // Show tooltip
        tooltip
          .style("opacity", 1)
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 10}px`)
          .html(`
            <div class="tooltip-title">${d.data.name}</div>
            <div class="tooltip-subtitle">${topicName}</div>
            <div class="tooltip-value">Prevalence: ${(value * 100).toFixed(2)}%</div>
            <div class="tooltip-value">Total Books: ${d.data.count}</div>
          `);
      })
      .on("mouseout", function() {
        // Restore original appearance
        d3.select(this)
          .attr("opacity", 0.8)
          .attr("stroke-width", 0.5);
        
        // Hide tooltip
        tooltip.style("opacity", 0);
      });
    
    // Add legend
    const legend = svg.append("g")
      .attr("font-family", "sans-serif")
      .attr("font-size", 10)
      .attr("text-anchor", "start")
      .selectAll("g")
      .data(series.reverse())
      .enter().append("g")
      .attr("transform", (d, i) => `translate(${width + 20}, ${i * 20})`);
    
    legend.append("rect")
      .attr("x", 0)
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", d => topicColors[d.key])
      .attr("stroke", "white");
    
    legend.append("text")
      .attr("x", 20)
      .attr("y", 7.5)
      .attr("dy", "0.32em")
      .text(d => {
        const topicName = topicNames[d.key] || d.key;
        // Truncate if too long
        return topicName.length > 25 ? topicName.substring(0, 22) + "..." : topicName;
      });
    
    // Add legend title
    svg.append("text")
      .attr("x", width + 20)
      .attr("y", -10)
      .attr("text-anchor", "start")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .text("Topics");
  };

  return (
    <section id="authors" className="author-topic-distribution">
      <div className="content-wrapper">
        <div className="section-header">
          <h2>Author Thematic Signatures</h2>
          <p className="section-intro">
            Different authors gravitate toward different combinations of themes, creating 
            unique thematic signatures. This visualization shows the topic distribution in the
            works of the most prolific Qazaq authors.
          </p>
          
          <div className="controls">
            {selectedAuthor && (
              <button 
                className="control-button"
                onClick={() => setSelectedAuthor(null)}
              >
                Clear Selection
              </button>
            )}
          </div>
        </div>
        
        <div className="visualization-container author-chart-container">
          <svg ref={svgRef} className="author-chart"></svg>
          <div ref={tooltipRef} className="tooltip"></div>
        </div>
        
        <div className="explanation">
          <p>
            This chart reveals the thematic focus of each major author in the corpus. The horizontal
            bars show the proportion of each theme present in an author's work.
          </p>
          <p>
            Notice how some authors specialize in particular themes (like Military themes or Nomadic Lifestyle),
            while others have a more balanced distribution across multiple topics. These thematic signatures 
            offer insights into each author's unique literary focus and style.
          </p>
        </div>
      </div>
    </section>
  );
};

export default AuthorTopicDistribution;

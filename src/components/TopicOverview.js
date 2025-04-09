import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { topicColors } from '../utils/colors';
import '../styles/TopicOverview.css';

const TopicOverview = ({ data }) => {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  
  useEffect(() => {
    if (!data || !svgRef.current || !tooltipRef.current) return;
    
    // Process the data for bubble chart
    const topicLabels = data.raw.topicLabels;
    const nmfTopics = data.raw.nmfTopics;
    const documentTopics = data.raw.documentTopics;
    
    // Calculate average topic prevalence across all documents
    const topicAverages = {};
    const topicCounts = {};
    
    // Count documents where each topic is dominant
    documentTopics.forEach(doc => {
      const dominantTopic = doc.Dominant_Topic;
      if (dominantTopic) {
        topicCounts[dominantTopic] = (topicCounts[dominantTopic] || 0) + 1;
      }
      
      // Sum up topic values
      for (let i = 1; i <= 13; i++) {
        const topicKey = `Topic_${i}`;
        if (doc[topicKey] !== undefined) {
          topicAverages[topicKey] = (topicAverages[topicKey] || 0) + doc[topicKey];
        }
      }
    });
    
    // Calculate averages
    const docCount = documentTopics.length;
    Object.keys(topicAverages).forEach(topic => {
      topicAverages[topic] /= docCount;
    });
    
    // Prepare bubble chart data
    const bubbleData = topicLabels.map(label => {
      const topicNumber = label["Topic Number"];
      const topicKey = topicNumber.replace(" ", "_");
      
      // Find keywords for this topic
      const topicIndex = parseInt(topicNumber.split(" ")[1]) - 1;
      const keywords = nmfTopics[topicIndex + 1] ? nmfTopics[topicIndex + 1].slice(0, 5) : [];
      
      return {
        id: topicKey,
        name: label["Topic Name"],
        value: topicAverages[topicKey] || 0,
        count: topicCounts[topicKey] || 0,
        keywords: keywords,
        color: topicColors[topicKey]
      };
    });
    
    // Create bubble chart
    const width = svgRef.current.clientWidth;
    const height = 600;
    
    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();
    
    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height]);
    
    // Create tooltip
    const tooltip = d3.select(tooltipRef.current);
    
    // Create a pack layout
    const pack = d3.pack()
      .size([width, height])
      .padding(5);
    
    // Create hierarchy
    const root = d3.hierarchy({ children: bubbleData })
      .sum(d => d.value ? Math.sqrt(d.count * 100) + d.value * 5000 : 0)
      .sort((a, b) => b.value - a.value);
    
    // Generate bubble layout
    const nodes = pack(root).descendants().slice(1); // Skip root node
    
    // Add circles
    const circles = svg.selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .on("mouseover", (event, d) => {
        tooltip
          .style("opacity", 1)
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 10}px`)
          .html(`
            <div class="tooltip-title">${d.data.name}</div>
            <div class="tooltip-value">Prevalence: ${(d.data.value * 100).toFixed(2)}%</div>
            <div class="tooltip-value">Documents: ${d.data.count}</div>
            <div class="tooltip-keywords">
              <span>Top keywords:</span>
              <ul>
                ${d.data.keywords.slice(0, 5).map(k => `<li>${k}</li>`).join('')}
              </ul>
            </div>
          `);
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
      })
      .on("click", function(event, d) {
        const newSelectedTopic = d.data.id === selectedTopic ? null : d.data.id;
        setSelectedTopic(newSelectedTopic);
        
        // Update visual appearance for all circles
        svg.selectAll("circle")
          .attr("opacity", circle => {
            if (newSelectedTopic === null) return 0.7; // Reset all if deselecting
            return circle.data.id === newSelectedTopic ? 1 : 0.3; // Highlight selected, dim others
          })
          .attr("stroke", circle => circle.data.id === newSelectedTopic ? "#FFF" : "none")
          .attr("stroke-width", circle => circle.data.id === newSelectedTopic ? 3 : 0);
        
        // Add annotation for selected topic
        svg.selectAll(".topic-annotation").remove();
        
        if (newSelectedTopic) {
          const selectedNode = nodes.find(n => n.data.id === newSelectedTopic);
          if (selectedNode) {
            svg.append("text")
              .attr("class", "topic-annotation")
              .attr("x", selectedNode.x)
              .attr("y", selectedNode.y - selectedNode.r - 10)
              .attr("text-anchor", "middle")
              .attr("font-size", "14px")
              .attr("font-weight", "bold")
              .attr("fill", selectedNode.data.color)
              .text(selectedNode.data.name);
          }
        }
      });
    // Add circle backgrounds  
    circles.append("circle")
      .attr("r", d => d.r)
      .attr("fill", d => d.data.color)
      .attr("opacity", d => d.data.id === selectedTopic ? 1 : 0.7)
      .attr("stroke", d => d.data.id === selectedTopic ? "#FFF" : "none")
      .attr("stroke-width", 2)
      .transition()
      .duration(1000)
      .attr("r", d => d.r);
    
    // Add topic number
    circles.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.5em")
      .attr("fill", "#fff")
      .attr("font-size", d => d.r / 5)
      .attr("pointer-events", "none")
      .text(d => d.data.id.replace("Topic_", ""));
    
    // Add topic name
    circles.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.5em")
      .attr("fill", "#fff")
      .attr("font-size", d => Math.min(d.r / 6, 14))
      .attr("pointer-events", "none")
      .text(d => {
        const name = d.data.name;
        // Truncate if too long relative to circle size
        const maxLength = Math.floor(d.r / 3);
        return name.length > maxLength ? name.substring(0, maxLength - 3) + "..." : name;
      });
    
    // Handle window resize
    const handleResize = () => {
      const newWidth = svgRef.current.clientWidth;
      
      svg.attr("width", newWidth)
         .attr("viewBox", [0, 0, newWidth, height]);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [data, selectedTopic]);
  
  

  return (
    <section id="topics" className="topic-overview">
      <div className="content-wrapper">
        <div className="section-header">
          <h2>Literary Themes in Qazaq Literature</h2>
          <p className="section-intro">
            The 13 main thematic areas identified in our analysis represent the
            core narrative threads running through Qazaq literature. The size of each bubble 
            represents the theme's prevalence across the corpus.
          </p>
        </div>
        
        <div className="visualization-container">
          <svg ref={svgRef} className="bubble-chart"></svg>
          <div ref={tooltipRef} className="tooltip"></div>
        </div>
        
        <div className="explanation">
          <p>
            Each circle represents a literary theme, with its size indicating how prevalent
            the theme is throughout the corpus. The analysis reveals how traditional themes of nomadic 
            life and natural landscapes coexist with explorations of domestic settings, social 
            structures, and existential questions.
          </p>
        </div>
      </div>
    </section>
  );
};

export default TopicOverview;

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { topicColors } from '../utils/colors';
import '../styles/Intro.css';

const Intro = () => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Create an animated background pattern
    const width = svgRef.current.clientWidth;
    const height = 400;
    
    // Clear previous SVG content
    d3.select(svgRef.current).selectAll("*").remove();
    
    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .style("background", "var(--background-primary)");
      
    // Create a pattern of circles representing topics
    const topicKeys = Object.keys(topicColors).sort();
    const circleData = [];
    
    // Generate random circles for each topic
    topicKeys.forEach(topic => {
      const numCircles = Math.floor(Math.random() * 5) + 3; // 3-7 circles per topic
      
      for (let i = 0; i < numCircles; i++) {
        circleData.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 30 + 10,
          topic: topic,
          color: topicColors[topic],
          delay: Math.random() * 2000
        });
      }
    });
    
    // Add circles
    const circles = svg.selectAll("circle")
      .data(circleData)
      .enter()
      .append("circle")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", d => d.radius)
      .attr("fill", d => d.color)
      .attr("opacity", 0.4)
      .attr("stroke", d => d.color)
      .attr("stroke-width", 1);
    
    // Add slight pulsing animation to each circle
    circles.each(function(d) {
      d3.select(this)
        .transition()
        .delay(d.delay)
        .duration(3000)
        .attr("r", d => d.radius * 1.2)
        .attr("opacity", 0.6)
        .transition()
        .duration(3000)
        .attr("r", d => d.radius)
        .attr("opacity", 0.4)
        .on("end", function repeat() {
          d3.select(this)
            .transition()
            .duration(3000)
            .attr("r", d => d.radius * 1.2)
            .attr("opacity", 0.6)
            .transition()
            .duration(3000)
            .attr("r", d => d.radius)
            .attr("opacity", 0.4)
            .on("end", repeat);
        });
    });
    
    // Add slow-moving flow lines connecting random pairs of topics
    const lineData = [];
    for (let i = 0; i < 15; i++) {
      const startTopic = topicKeys[Math.floor(Math.random() * topicKeys.length)];
      const endTopic = topicKeys[Math.floor(Math.random() * topicKeys.length)];
      
      lineData.push({
        x1: Math.random() * width,
        y1: Math.random() * height,
        x2: Math.random() * width,
        y2: Math.random() * height,
        startTopic: startTopic,
        endTopic: endTopic,
        startColor: topicColors[startTopic],
        endColor: topicColors[endTopic],
        delay: Math.random() * 3000
      });
    }
    
    // Create gradient definitions
    const defs = svg.append("defs");
    
    lineData.forEach((d, i) => {
      const gradientId = `line-gradient-${i}`;
      
      const gradient = defs.append("linearGradient")
        .attr("id", gradientId)
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "100%");
      
      gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", d.startColor)
        .attr("stop-opacity", 0.6);
      
      gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", d.endColor)
        .attr("stop-opacity", 0.6);
      
      d.gradientId = gradientId;
    });
    
    // Add lines with gradients
    const lines = svg.selectAll(".flow-line")
      .data(lineData)
      .enter()
      .append("line")
      .attr("class", "flow-line")
      .attr("x1", d => d.x1)
      .attr("y1", d => d.y1)
      .attr("x2", d => d.x1) // Start at same point for animation
      .attr("y2", d => d.y1)
      .attr("stroke", d => `url(#${d.gradientId})`)
      .attr("stroke-width", 2)
      .attr("opacity", 0);
    
    // Animate lines
    lines.each(function(d) {
      d3.select(this)
        .transition()
        .delay(d.delay)
        .duration(1000)
        .attr("opacity", 0.5)
        .transition()
        .duration(2000)
        .attr("x2", d.x2)
        .attr("y2", d.y2)
        .transition()
        .duration(1000)
        .attr("opacity", 0.1)
        .transition()
        .duration(0)
        .attr("x1", d => Math.random() * width)
        .attr("y1", d => Math.random() * height)
        .attr("x2", d => Math.random() * width)
        .attr("y2", d => Math.random() * height)
        .on("end", function repeat() {
          d3.select(this)
            .transition()
            .duration(1000)
            .attr("opacity", 0.5)
            .transition()
            .duration(2000)
            .attr("x2", d => d.x2 = Math.random() * width)
            .attr("y2", d => d.y2 = Math.random() * height)
            .transition()
            .duration(1000)
            .attr("opacity", 0.1)
            .transition()
            .duration(0)
            .attr("x1", d => d.x1 = Math.random() * width)
            .attr("y1", d => d.y1 = Math.random() * height)
            .on("end", repeat);
        });
    });
    
    // Handle resize
    const handleResize = () => {
      const newWidth = svgRef.current.clientWidth;
      svg.attr("width", newWidth)
         .attr("viewBox", [0, 0, newWidth, height]);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <section id="intro" className="intro-section">
      <div className="content-wrapper">
        <h1>Exploring the Thematic Landscape of Qazaq Literature</h1>
        
        <div className="animated-background">
          <svg ref={svgRef} width="100%" height="400"></svg>
        </div>
        
        <div className="intro-text">
          <p>
          Thematic Currents in 20th Century Kazakh Literature –
          An exploration of the literary themes that defined a century of Kazakh writing, revealing how cultural identity evolved through periods of profound change.

          </p>
          
          <p>
            Scroll through this visual journey to discover how these themes evolved over time, 
            how they relate to each other, which authors gravitated toward specific topics, 
            and how the language and vocabulary of Qazaq literature reflects the cultural heritage 
            and historical context of Kazakhstan.
          </p>
          
          <div className="intro-cta">
            <a href="#topics" className="scroll-cta">Begin Exploring</a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Intro;

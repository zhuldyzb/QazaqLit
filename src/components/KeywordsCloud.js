import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import cloud from 'd3-cloud';
import { topicColors } from '../utils/colors';
import '../styles/KeywordsCloud.css';

const KeywordsCloud = ({ data }) => {
  const svgRef = useRef(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [maxWords, setMaxWords] = useState(30); // Default to showing all words (max 30)
 
  useEffect(() => {
    if (!data || !svgRef.current) return;
    
    // Get data needed for visualization - use the ENHANCED topic keywords
    const topicKeywords = data.processed.topicKeywords; // This already contains the enhanced keywords
    const topicLabels = data.raw.topicLabels;
    
    // Create the word cloud visualization
    createWordCloud(topicKeywords, topicLabels, svgRef, selectedTopic, setSelectedTopic, maxWords);
    
  }, [data, selectedTopic, maxWords]);
  
  const createWordCloud = (topicKeywords, topicLabels, svgRef, selectedTopic, setSelectedTopic, maxWords) => {
    // Clear previous visualization
    d3.select(svgRef.current).selectAll("*").remove();
    
    // Set up dimensions
    const width = svgRef.current.clientWidth;
    const height = 700;
    
    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height]);
    
    // Create a container for the word cloud
    const cloudContainer = svg.append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);
    
    // Create topic selector buttons
    const topicSelectorHeight = 50;
    const topicSelector = svg.append("g")
      .attr("class", "topic-selector")
      .attr("transform", `translate(0,${height - topicSelectorHeight})`);
    
      const filteredTopicKeywords = topicKeywords.filter(topic => topic.id >= 1 && topic.id <= 13);

      // Create topic selector buttons with proper labels
      const buttonWidth = width / filteredTopicKeywords.length;
      const buttonHeight = topicSelectorHeight - 10;
      
      topicSelector.selectAll(".topic-button")
        .data(filteredTopicKeywords)
        .enter()
        .append("g")
        .attr("class", "topic-button")
        .attr("transform", (d, i) => `translate(${i * buttonWidth},0)`)
        .each(function(d) {
          const group = d3.select(this);
          
          // Add button rectangle
          group.append("rect")
            .attr("width", buttonWidth - 4)
            .attr("height", buttonHeight)
            .attr("rx", 5)
            .attr("ry", 5)
            .attr("fill", topicColors[`Topic_${d.id}`])
            .attr("opacity", selectedTopic === d.id ? 1 : 0.7)
            .attr("stroke", "#fff")
            .attr("stroke-width", 1);
          
          // Add button text - show the actual topic name, not just T1, T2...
          const topicLabel = topicLabels.find(label => 
            label["Topic Number"] === `Topic ${d.id}`
          );
          const shortTopicName = topicLabel ? 
            topicLabel["Topic Name"].split(" ")[0] : // Just use first word
            `T${d.id}`;
          
          group.append("text")
            .attr("x", (buttonWidth - 4) / 2)
            .attr("y", buttonHeight / 2)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("fill", "#fff")
            .attr("font-size", "12px")
            .attr("pointer-events", "none")
            .text(shortTopicName);
          
          // Add tooltip with full topic name on hover
          group.on("mouseover", function(event) {
            tooltip
              .style("opacity", 1)
              .style("left", `${event.pageX + 10}px`)
              .style("top", `${event.pageY - 10}px`)
              .html(`
                <div class="tooltip-title">${topicLabel ? topicLabel["Topic Name"] : `Topic ${d.id}`}</div>
              `);
          })
          .on("mouseout", function() {
            tooltip.style("opacity", 0);
          });
        })
        .on("click", function(event, d) {
          // First hide any visible tooltip
          tooltip.style("opacity", 0);
          
          // Then update the selected topic
          setSelectedTopic(selectedTopic === d.id ? null : d.id);
        });
        
      // Create tooltip reference for topic buttons
      const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("pointer-events", "none")
        .style("background", "rgba(255, 255, 255, 0.95)")
        .style("padding", "8px")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("box-shadow", "0 2px 5px rgba(0, 0, 0, 0.1)")
        .style("z-index", 1000);
    
    // Display the current topic name
    svg.append("text")
      .attr("class", "topic-name")
      .attr("x", width / 2)
      .attr("y", height - topicSelectorHeight - 10)
      .attr("text-anchor", "middle")
      .attr("font-size", "18px")
      .attr("font-weight", "bold")
      .attr("fill", "var(--text-primary)")
      .text(selectedTopic 
        ? topicKeywords.find(t => t.id === selectedTopic)?.name || `Topic ${selectedTopic}` 
        : "Select a topic to view its keywords");
    
    // If no topic is selected, show instructions
    if (!selectedTopic) {
      cloudContainer.append("text")
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("fill", "var(--text-secondary)")
        .text("Click on a topic button below to visualize its keywords");
      return;
    }
    
    // Get keywords for the selected topic
    const selectedTopicData = topicKeywords.find(t => t.id === selectedTopic);
    if (!selectedTopicData || !selectedTopicData.keywords) return;
    
    // Prepare word cloud data
    // Filter out keywords that contain "topic" to avoid showing "topic 1", "topic 2", etc.
    const filteredKeywords = selectedTopicData.keywords
      .filter(keyword => {
        // Skip if keyword is undefined, null or empty
        if (!keyword) return false;
        
        // Convert to string if it's not already
        const keywordStr = String(keyword).trim();
        
        // Skip empty strings
        if (keywordStr === '') return false;
        
        // Skip if it contains "topic"
        if (keywordStr.toLowerCase().includes('topic')) return false;
        
        return true;
      });
    
    // Limit to max number of words (maximum 30 words per your dataset)
    // Ensure maxWords is within range 5-30
    const actualMaxWords = Math.min(Math.max(maxWords, 5), 30);
    const limitedKeywords = filteredKeywords.slice(0, actualMaxWords);
    
    const words = limitedKeywords.map((keyword, i) => ({
      text: String(keyword).trim(), // Ensure it's a string and trim whitespace
      size: Math.max(10, 60 - (i * 60 / limitedKeywords.length)), // Size decreases gradually with word index
      topic: selectedTopic
    }));
    
    // Create layout for word cloud
    const layout = cloud()
      .size([width, height - topicSelectorHeight - 50])
      .words(words)
      .padding(5)
      .rotate(() => ~~(Math.random() * 2) * 90)
      .fontSize(d => d.size)
      .on("end", draw);
    
    // Calculate layout
    layout.start();
    
    // Draw the word cloud
    function draw(words) {
      cloudContainer.selectAll("text")
        .data(words)
        .enter()
        .append("text")
        .style("font-size", d => `${d.size}px`)
        .style("font-family", "Futura")
        .style("fill", topicColors[`Topic_${selectedTopic}`])
        .attr("text-anchor", "middle")
        .attr("transform", d => `translate(${d.x},${d.y})rotate(${d.rotate})`)
        .text(d => d.text)
        .transition()
        .duration(300)
        .style("opacity", 1);
    }
    
    // Handle window resize
    const handleResize = () => {
      const newWidth = svgRef.current.clientWidth;
      
      // Resize SVG
      svg.attr("width", newWidth)
         .attr("viewBox", [0, 0, newWidth, height]);
      
      // Adjust cloud container position
      cloudContainer.attr("transform", `translate(${newWidth / 2},${height / 2})`);
      
      // Resize buttons
      const newButtonWidth = newWidth / filteredTopicKeywords.length;
      
      topicSelector.selectAll(".topic-button")
        .attr("transform", (d, i) => `translate(${i * newButtonWidth},0)`)
        .each(function() {
          const group = d3.select(this);
          
          group.select("rect")
            .attr("width", newButtonWidth - 4);
          
          group.select("text")
            .attr("x", (newButtonWidth - 4) / 2);
        });
      
      // Adjust topic name position
      svg.select(".topic-name")
        .attr("x", newWidth / 2);
      
      // Recalculate layout if a topic is selected
      if (selectedTopic) {
        cloudContainer.selectAll("text").remove();
        
        layout.size([newWidth, height - topicSelectorHeight - 50])
             .start();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  };

  // Handle slider change with proper bounds
  const handleSliderChange = (e) => {
    const value = parseInt(e.target.value);
    setMaxWords(Math.min(Math.max(value, 5), 30)); // Ensure value is between 5 and 30
  };

  return (
    <section id="keywords" className="keywords-cloud">
      <div className="content-wrapper">
        <div className="section-header">
          <h2>Thematic Vocabulary</h2>
          <p className="section-intro">
            Each literary theme is defined by its distinctive vocabulary. 
            Explore the key words that characterize each topic in Qazaq literature.
          </p>
        </div>
        
        <div className="visualization-container">
          <svg ref={svgRef} className="word-cloud"></svg>
        </div>
        
        <div className="controls-section">
          <div className="word-count-control">
            <label htmlFor="word-limit">Word display limit: </label>
            <input 
              type="range" 
              id="word-limit" 
              min="5" 
              max="30" 
              step="5" 
              value={maxWords}
              onChange={handleSliderChange}
            />
            <span className="word-count-display">{maxWords}</span>
          </div>
        </div>
        
        <div className="explanation">
          <p>
            This word cloud visualization shows the most characteristic terms for each literary theme.
            The size of each word reflects its importance to the topic. Click on any topic button at the
            bottom to explore its semantic landscape.
          </p>
          <p>
            These keywords offer insights into the linguistic fabric of Qazaq literature, revealing
            the vocabulary that defines different thematic domains. Notice how concrete, tangible terms
            dominate in themes like "Nomadic Lifestyle" and "Landscape," while more abstract concepts
            appear in themes like "Core Values and Beliefs" or "Existential Suffering."
          </p>
          <p>
            Use the slider control to adjust how many words are displayed in the visualization.
          </p>
        </div>
      </div>
    </section>
  );
};

export default KeywordsCloud;
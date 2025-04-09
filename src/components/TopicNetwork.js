import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { topicColors } from '../utils/colors';
import '../styles/TopicNetwork.css';

const TopicNetwork = ({ data }) => {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    if (!data || !svgRef.current || !tooltipRef.current) return;

    // Get data needed for the network visualization
    const topicLabels = data.raw.topicLabels;
    const correlationMatrix = data.processed.topicCorrelations;

    // Create network visualization
    createNetworkVisualization(
      topicLabels,
      correlationMatrix,
      svgRef,
      tooltipRef,
      selectedNode,
      setSelectedNode
    );
  }, [data, selectedNode]);

  const createNetworkVisualization = (
    topicLabels,
    correlationMatrix,
    svgRef,
    tooltipRef,
    selectedNode,
    setSelectedNode
  ) => {
    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove();

    // Set up dimensions
    const width = svgRef.current.clientWidth;
    const height = 600;

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    // Create tooltip (shared for both nodes and links)
    const tooltip = d3.select(tooltipRef.current);

    // Prepare nodes (each topic)
    const nodes = topicLabels.map(label => {
      const topicNumber = parseInt(label['Topic Number'].split(' ')[1]);
      return {
        id: `Topic_${topicNumber}`,
        name: label['Topic Name'],
        index: topicNumber - 1 // 0-indexed
      };
    });

    // Create links based on correlation matrix and threshold
    const links = [];
    const threshold = 0.05;
    for (let i = 0; i < correlationMatrix.length; i++) {
      for (let j = i + 1; j < correlationMatrix[i].length; j++) {
        const correlation = correlationMatrix[i][j];
        if (Math.abs(correlation) > threshold) {
          links.push({
            source: i,
            target: j,
            value: correlation
          });
        }
      }
    }

    // Create force simulation with increased distances
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.index).distance(600)) // Increased distance
      .force('charge', d3.forceManyBody().strength(-500))                 // Stronger repulsion
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(60));                    // Larger collision radius

    // Create a scale for link stroke widths (for visual thickness)
    const linkScale = d3.scaleLinear()
      .domain([threshold, d3.max(links, d => Math.abs(d.value))])
      .range([1, 8]);

    // Define a function to choose color based on correlation value
    const getLinkColor = (d) => {
      const absVal = Math.abs(d.value);
      if (absVal < 0.1) {
        return "#aaa"; // weak correlation color
      } else if (absVal < 0.3) {
        return "#777"; // medium correlation color
      } else {
        return "#555"; // strong correlation color
      }
    };

    // Add links (drawn behind nodes)
    const link = svg.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke-width', d => linkScale(Math.abs(d.value)))
      .attr('stroke', d => getLinkColor(d))
      .attr('stroke-opacity', 0.8)
      .attr('class', d => `link link-${d.source.index}-${d.target.index}`)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        // Increase stroke width temporarily to improve hover detection
        d3.select(this)
          .attr('stroke-width', linkScale(Math.abs(d.value)) + 2);
        // Show tooltip with formatted correlation value
        tooltip
          .style('opacity', 1)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 10}px`)
          .html(`Correlation: ${(d.value * 100).toFixed(1)}%`);
      })
      .on('mousemove', function(event) {
        tooltip
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 10}px`);
      })
      .on('mouseout', function(event, d) {
        // Restore original stroke width
        d3.select(this).attr('stroke-width', linkScale(Math.abs(d.value)));
        tooltip.style('opacity', 0);
      });

    // Add nodes
    const node = svg.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', d => `node node-${d.index}`)
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Append circles to nodes
    node.append('circle')
      .attr('r', 25)
      .attr('fill', d => topicColors[d.id])
      .attr('stroke', '#fff')
      .attr('stroke-width', d => d.id === selectedNode ? 3 : 1)
      .on('mouseover', function(event, d) {
        // Highlight node on hover
        d3.select(this).attr('stroke-width', 3);
        tooltip
          .style('opacity', 1)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 10}px`)
          .html(`
            <div class="tooltip-title">${d.name}</div>
            <div class="tooltip-subtitle">${d.id} (Node ${d.index + 1})</div>
          `);
        // Show node label on hover
        d3.select(this.parentNode).select('text')
          .style('opacity', 1);
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .attr('stroke-width', d.id === selectedNode ? 3 : 1);
        tooltip.style('opacity', 0);
        // Hide node label when not hovered
        d3.select(this.parentNode).select('text')
          .style('opacity', 0);
      })
      .on('click', function(event, d) {
        // Toggle node selection
        setSelectedNode(d.id === selectedNode ? null : d.id);
        if (d.id !== selectedNode) {
          // Dim all nodes and links
          node.selectAll('circle').attr('opacity', 0.3);
          link.attr('opacity', 0.1);
          d3.select(this).attr('opacity', 1);
          // Highlight connections for this node
          link.each(function(l) {
            if (l.source.index === d.index || l.target.index === d.index) {
              d3.select(this).attr('opacity', 1);
              const connectedNodeIndex = (l.source.index === d.index) ? l.target.index : l.source.index;
              node.filter(n => n.index === connectedNodeIndex)
                .select('circle')
                .attr('opacity', 1);
            }
          });
        } else {
          node.selectAll('circle').attr('opacity', 1);
          link.attr('opacity', 0.6);
        }
      });

    // Append a text label for each node (hidden by default)
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 45)
      .attr('fill', 'var(--text-primary)')
      .attr('font-size', '12px')
      .attr('class', 'node-label')
      // Prevent the text element from capturing pointer events so the circle events work as intended
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .text(d => {
        if (!d.name || d.name.trim() === '') {
          return `Topic ${d.id.split('_')[1]}`;
        }
        return d.name.length > 15 ? d.name.substring(0, 12) + '...' : d.name;
      });

    // Update positions on each simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => Math.max(30, Math.min(width - 30, d.source.x)))
        .attr('y1', d => Math.max(30, Math.min(height - 30, d.source.y)))
        .attr('x2', d => Math.max(30, Math.min(width - 30, d.target.x)))
        .attr('y2', d => Math.max(30, Math.min(height - 30, d.target.y)));

      node.attr('transform', d => `translate(${Math.max(30, Math.min(width - 30, d.x))},
                                               ${Math.max(30, Math.min(height - 30, d.y))})`);
    });

    // Handle window resize
    const handleResize = () => {
      const newWidth = svgRef.current.clientWidth;
      svg.attr('width', newWidth)
         .attr('viewBox', [0, 0, newWidth, height]);
      simulation.force('center', d3.forceCenter(newWidth / 2, height / 2))
                .alpha(0.3)
                .restart();
    };

    window.addEventListener('resize', handleResize);

    // Drag event functions
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  };

  return (
    <section id="network" className="topic-network">
      <div className="content-wrapper">
        <div className="section-header">
          <h2>Thematic Connections</h2>
          <p className="section-intro">
            Literary themes don't exist in isolation. This network visualization reveals how different topics connect and relate to each other throughout Qazaq literature.
          </p>
          <div className="controls">
            {selectedNode && (
              <button 
                className="control-button"
                onClick={() => setSelectedNode(null)}
              >
                Clear Selection
              </button>
            )}
          </div>
        </div>
        <div className="visualization-container network-container">
          <svg ref={svgRef} className="network-chart"></svg>
          <div ref={tooltipRef} className="tooltip"></div>
        </div>
        <div className="explanation">
          <p>
            The thickness of the links indicates the strength of the correlation: thicker lines represent stronger connections.
          </p>
          <p>
            Link colors are  based on correlation strength: lighter for weak, medium gray for moderate, and dark gray for strong correlations.
          </p>
          <p>
          </p>
        </div>
      </div>
    </section>
  );
};

export default TopicNetwork;

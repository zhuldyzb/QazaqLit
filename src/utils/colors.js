import * as d3 from 'd3';

// Main color scheme for topics
export const topicColors = {
  'Topic_1': '#264653', // Core Values and Beliefs
  'Topic_2': '#2a9d8f', // Domestic Life
  'Topic_3': '#e9c46a', // Romance & Youth
  'Topic_4': '#f4a261', // Social Structure
  'Topic_5': '#e76f51', // Nomadic Lifestyle
  'Topic_6': '#bc4749', // Historical Legacy
  'Topic_7': '#6a994e', // Inner Life & Mortality
  'Topic_8': '#386641', // Intellect & Virtue
  'Topic_9': '#073b4c', // National Identity & Movement
  'Topic_10': '#457b9d', // Existential Suffering
  'Topic_11': '#7b2cbf', // Landscape
  'Topic_12': '#3f37c9', // Warfare & Military
  'Topic_13': '#1b263b', // Homeland Nature
};

// Topic color by number (1-indexed)
export const getTopicColor = (topicNumber) => {
  const key = `Topic_${topicNumber}`;
  return topicColors[key] || '#999999';
};

// Sequential color scale for continuous values
export const createSequentialScale = (domain = [0, 1], range = ['#f7fbff', '#08306b']) => {
  return d3.scaleSequential()
    .domain(domain)
    .interpolator(d3.interpolate(range[0], range[1]));
};

// Categorical color scale for authors or categories
export const createCategoricalScale = (domain) => {
  return d3.scaleOrdinal()
    .domain(domain)
    .range(d3.schemeTableau10);
};

// Color scale for years (temporal data)
export const createYearColorScale = (startYear, endYear) => {
  return d3.scaleSequential()
    .domain([startYear, endYear])
    .interpolator(d3.interpolateViridis);
};

// Generate a color palette for a dimension with n values
export const generatePalette = (n) => {
  return n <= 10 
    ? d3.schemeTableau10.slice(0, n)
    : d3.quantize(d3.interpolateRainbow, n);
};

// Topic color array in order (for consistent legends)
export const topicColorArray = Array.from({length: 13}, (_, i) => getTopicColor(i + 1));

// Highlight color for selections
export const highlightColor = '#ff6b6b';

// Background and text colors
export const backgroundColor = '#fcfaf5';
export const textColor = '#1a1a1a';
export const secondaryTextColor = '#5a5a5a';

// Opacity settings
export const defaultOpacity = 0.8;
export const hoveredOpacity = 1.0;
export const fadedOpacity = 0.2;

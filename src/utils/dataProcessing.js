import Papa from 'papaparse';

/**
 * Load and parse all data files
 * @returns {Object} Object containing all parsed data
 */
export const loadAllData = async () => {
  try {
    // Load each dataset
    const topicLabels = await loadTopicLabels();
    const nmfTopics = await loadNMFTopics();
    const documentTopics = await loadDocumentTopics();
    const expandedWordlist = await loadExpandedWordlist(); // New wordlist
    
    // Process and organize data for visualizations
    const booksByYear = aggregateBooksByYear(documentTopics);
    const topAuthors = getTopAuthors(documentTopics, 20);
    const topicEvolution = calculateTopicEvolutionByYear(documentTopics);
    const topicCorrelations = calculateTopicCorrelations(documentTopics);
    const topicKeywords = prepareTopicKeywords(nmfTopics, topicLabels);
    
    // Add expanded keywords to the topic keywords
    const enhancedTopicKeywords = enhanceTopicKeywords(topicKeywords, expandedWordlist);
    
    // Return all data and processed derivatives
    return {
      raw: {
        topicLabels,
        nmfTopics,
        documentTopics,
        expandedWordlist
      },
      processed: {
        booksByYear,
        topAuthors,
        topicEvolution,
        topicCorrelations,
        topicKeywords: enhancedTopicKeywords // Use enhanced keywords
      }
    };
  } catch (error) {
    console.error("Error loading data:", error);
    throw error;
  }
};

/**
 * Load and parse the expanded wordlist.csv file
 * In this format, each row is a topic and columns are words
 * @returns {Array} Array of processed wordlist data
 */
const loadExpandedWordlist = async () => {
  try {
    const response = await fetch('/data/wordlist.csv');
    const csvText = await response.text();
    
    const result = Papa.parse(csvText, {
      header: false,
      skipEmptyLines: true
    });
    
    // Process the CSV data where rows are topics and columns are words
    const processedWordlist = [];
    
    // Process each row (topic)
    result.data.forEach((row, rowIndex) => {
      // Skip any header row
      if (rowIndex === 0 && (row[0].toLowerCase().includes('topic') || isNaN(parseInt(row[0])))) {
        return;
      }
      
      // Get the topic identifier from the first column
      let topicId = 0;
      const topicCell = row[0];
      
      // Extract topic number using regex to find a number at the end of the string
      const topicMatch = topicCell.match(/\d+$/);
      if (topicMatch) {
        topicId = parseInt(topicMatch[0]);
      } else if (!isNaN(parseInt(topicCell))) {
        topicId = parseInt(topicCell);
      }
      
      // If we couldn't determine a topic ID, skip this row
      if (topicId === 0) return;
      
      // Add all non-empty words from this row as keywords for this topic
      row.slice(1).forEach(word => {
        if (word && word.trim()) {
          processedWordlist.push({
            topic_id: topicId,
            word: word.trim()
          });
        }
      });
    });
    
    return processedWordlist;
  } catch (error) {
    console.error("Error loading expanded wordlist:", error);
    throw error;
  }
};

/**
 * Enhance topic keywords with expanded wordlist
 * @param {Array} topicKeywords Original topic keywords array
 * @param {Array} expandedWordlist Expanded wordlist data
 * @returns {Array} Enhanced topic keywords array
 */
const enhanceTopicKeywords = (topicKeywords, expandedWordlist) => {
  // Create a copy of the original topic keywords
  const enhancedKeywords = [...topicKeywords];
  
  // Process the expanded wordlist
  expandedWordlist.forEach(wordItem => {
    const topicId = wordItem.topic_id;
    const word = wordItem.word;
    
    // Skip if topic ID or word is missing
    if (!topicId || !word) return;
    
    // Find the corresponding topic
    const topic = enhancedKeywords.find(t => t.id === topicId);
    if (topic) {
      // Only add the word if it's not already in the keywords list
      if (!topic.keywords.includes(word)) {
        topic.keywords.push(word);
      }
    }
  });
  
  return enhancedKeywords;
};

/**
 * Load and parse the topic labels file
 * @returns {Array} Array of topic label objects
 */
const loadTopicLabels = async () => {
  try {
    const response = await fetch('/data/topic_labels.csv');
    const csvText = await response.text();
    
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true
    });
    
    return result.data;
  } catch (error) {
    console.error("Error loading topic labels:", error);
    throw error;
  }
};

/**
 * Load and parse the NMF topics file (keywords for each topic)
 * @returns {Array} Array of topic keyword arrays
 */
const loadNMFTopics = async () => {
  try {
    const response = await fetch('/data/nmf_topics.csv');
    const csvText = await response.text();
    
    const result = Papa.parse(csvText, {
      header: false,
      skipEmptyLines: true
    });
    
    return result.data;
  } catch (error) {
    console.error("Error loading NMF topics:", error);
    throw error;
  }
};

/**
 * Load and parse the document topic distributions file
 * @returns {Array} Array of document objects with topic distributions
 */
const loadDocumentTopics = async () => {
  try {
    const response = await fetch('/data/document_topic_distributions_with_metadata.csv');
    const csvText = await response.text();
    
    const result = Papa.parse(csvText, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true
    });
    
    return result.data;
  } catch (error) {
    console.error("Error loading document topics:", error);
    throw error;
  }
};

/**
 * Aggregate books by year and calculate (normalized) topic distributions by year
 * @param {Array} documentTopics Array of document objects
 * @returns {Object} Object with year-based aggregations
 */
const aggregateBooksByYear = (documentTopics) => {
  // Determine if normalization is needed based on a sample of documents
  let sampleTotal = 0;
  const sampleSize = Math.min(100, documentTopics.length);
  for (let i = 0; i < sampleSize; i++) {
    let docTotal = 0;
    for (let j = 1; j <= 13; j++) {
      const topicKey = `Topic_${j}`;
      if (documentTopics[i][topicKey] !== undefined) {
        docTotal += documentTopics[i][topicKey];
      }
    }
    sampleTotal += docTotal;
  }
  const avgTotal = sampleTotal / sampleSize;
  const needsNormalization = avgTotal < 0.95;

  const booksByYear = {};
  
  documentTopics.forEach(doc => {
    if (!doc.Year) return;
    
    if (!booksByYear[doc.Year]) {
      booksByYear[doc.Year] = {
        count: 0,
        topicDistribution: Array(13).fill(0).reduce((obj, _, i) => {
          obj[`Topic_${i + 1}`] = 0;
          return obj;
        }, {})
      };
    }
    
    booksByYear[doc.Year].count++;
    
    // Compute total topic weight for the document
    let docTotal = 0;
    for (let i = 1; i <= 13; i++) {
      const topicKey = `Topic_${i}`;
      if (doc[topicKey] !== undefined) {
        docTotal += doc[topicKey];
      }
    }
    
    // Sum (normalized) topic values for each year
    for (let i = 1; i <= 13; i++) {
      const topicKey = `Topic_${i}`;
      if (doc[topicKey] !== undefined) {
        const normalizedValue = (needsNormalization && docTotal > 0)
          ? doc[topicKey] / docTotal
          : doc[topicKey];
        booksByYear[doc.Year].topicDistribution[topicKey] += normalizedValue;
      }
    }
  });
  
  // Calculate average topic distribution for each year
  Object.keys(booksByYear).forEach(year => {
    const count = booksByYear[year].count;
    if (count > 0) {
      Object.keys(booksByYear[year].topicDistribution).forEach(topic => {
        booksByYear[year].topicDistribution[topic] /= count;
      });
    }
  });
  
  return booksByYear;
};

/**
 * Diagnostic function to print document topic sums for a sample
 * @param {Array} documentTopics Array of document objects
 */
const diagnoseTopicDistributions = (documentTopics) => {
  // Check a sample of documents to see what their total topic distribution is
  const sampleSize = Math.min(20, documentTopics.length);
  
  console.log(`Diagnosing topic distributions for ${sampleSize} documents:`);
  
  for (let i = 0; i < sampleSize; i++) {
    const doc = documentTopics[i];
    let topicSum = 0;
    
    for (let j = 1; j <= 13; j++) {
      const topicKey = `Topic_${j}`;
      if (doc[topicKey] !== undefined) {
        topicSum += doc[topicKey];
      }
    }
    
    console.log(`Document ${i}: "${doc["Book Title"] || 'Untitled'}" by ${doc.Author || 'Unknown'}`);
    console.log(`  Total topic distribution: ${(topicSum * 100).toFixed(2)}%`);
    
    // Print individual topic values
    for (let j = 1; j <= 13; j++) {
      const topicKey = `Topic_${j}`;
      if (doc[topicKey] !== undefined) {
        console.log(`  ${topicKey}: ${(doc[topicKey] * 100).toFixed(2)}%`);
      }
    }
    console.log('---');
  }
};

/**
 * Modified getTopAuthors function with normalization:
 * @param {Array} documentTopics Array of document objects
 * @param {Number} topN Number of top authors to return
 * @returns {Array} Array of author objects with book counts
 */
const getTopAuthors = (documentTopics, topN = 20) => {
  // First, diagnose the issue
  diagnoseTopicDistributions(documentTopics);
  
  // Create a map to store author data
  const authorMap = new Map();
  
  // First pass: Gather all data and check if normalization is needed
  let needsNormalization = false;
  let sampleTotal = 0;
  const sampleSize = Math.min(100, documentTopics.length);
  
  for (let i = 0; i < sampleSize; i++) {
    const doc = documentTopics[i];
    let docTotal = 0;
    
    for (let j = 1; j <= 13; j++) {
      const topicKey = `Topic_${j}`;
      if (doc[topicKey] !== undefined) {
        docTotal += doc[topicKey];
      }
    }
    
    sampleTotal += docTotal;
  }
  
  // If average total is much less than 1, we need to normalize
  const avgTotal = sampleTotal / sampleSize;
  console.log(`Average topic distribution total across sample: ${(avgTotal * 100).toFixed(2)}%`);
  needsNormalization = avgTotal < 0.95; // If less than 95%, we'll normalize
  console.log(`Normalization needed: ${needsNormalization}`);
  
  // Process all documents
  documentTopics.forEach(doc => {
    if (!doc.Author || !doc.Author.trim()) return;
    
    // Normalize author name
    const authorName = doc.Author.trim();
    
    // Initialize author data if not already present
    if (!authorMap.has(authorName)) {
      authorMap.set(authorName, {
        name: authorName,
        count: 0,
        books: new Set(),
        topicSums: Array(13).fill(0).reduce((obj, _, i) => {
          obj[`Topic_${i + 1}`] = 0;
          return obj;
        }, {})
      });
    }
    
    const authorData = authorMap.get(authorName);
    authorData.count++;
    
    // Add book title if available
    if (doc["Book Title"]) {
      authorData.books.add(doc["Book Title"]);
    }
    
    // Calculate total topic weight for this document
    let docTopicTotal = 0;
    for (let i = 1; i <= 13; i++) {
      const topicKey = `Topic_${i}`;
      if (doc[topicKey] !== undefined) {
        docTopicTotal += doc[topicKey];
      }
    }
    
    // Sum topic values (with normalization if needed)
    for (let i = 1; i <= 13; i++) {
      const topicKey = `Topic_${i}`;
      if (doc[topicKey] !== undefined) {
        const normalizedValue = (needsNormalization && docTopicTotal > 0)
          ? doc[topicKey] / docTopicTotal
          : doc[topicKey];
        
        authorData.topicSums[topicKey] += normalizedValue;
      }
    }
  });
  
  // Convert to array and calculate average topic distributions
  const authors = Array.from(authorMap.values()).map(author => {
    // Calculate average topic distribution
    const topicDistribution = {};
    
    for (let i = 1; i <= 13; i++) {
      const topicKey = `Topic_${i}`;
      topicDistribution[topicKey] = author.count > 0 ? author.topicSums[topicKey] / author.count : 0;
    }
    
    // Calculate total distribution for this author (for debugging)
    let totalDist = 0;
    Object.values(topicDistribution).forEach(val => {
      totalDist += val;
    });
    console.log(`Author ${author.name}: Total topic distribution: ${(totalDist * 100).toFixed(2)}%`);
    
    return {
      name: author.name,
      count: author.count,
      bookCount: author.books.size,
      topicDistribution,
      totalDistribution: totalDist // for debugging
    };
  });
  
  // Sort by book count (descending)
  authors.sort((a, b) => b.count - a.count);
  
  // Log the top authors' topic distribution totals
  console.log("Top authors' topic distribution totals:");
  authors.slice(0, topN).forEach(author => {
    console.log(`${author.name}: ${(author.totalDistribution * 100).toFixed(2)}%`);
  });
  
  // Return top N authors
  return authors.slice(0, topN);
};

/**
 * Calculate topic evolution by year for trend analysis,
 * applying normalization to each document's topic distribution.
 * @param {Array} documentTopics Array of document objects
 * @returns {Array} Array of objects with year and topic distribution data
 */
const calculateTopicEvolutionByYear = (documentTopics) => {
  // Determine if normalization is needed based on a sample
  let sampleTotal = 0;
  const sampleSize = Math.min(100, documentTopics.length);
  for (let i = 0; i < sampleSize; i++) {
    let docTotal = 0;
    for (let j = 1; j <= 13; j++) {
      const topicKey = `Topic_${j}`;
      if (documentTopics[i][topicKey] !== undefined) {
        docTotal += documentTopics[i][topicKey];
      }
    }
    sampleTotal += docTotal;
  }
  const avgTotal = sampleTotal / sampleSize;
  const needsNormalization = avgTotal < 0.95;
  
  const yearlyData = {};
  
  // Group documents by year
  documentTopics.forEach(doc => {
    if (!doc.Year) return;
    
    if (!yearlyData[doc.Year]) {
      yearlyData[doc.Year] = {
        documents: []
      };
    }
    
    yearlyData[doc.Year].documents.push(doc);
  });
  
  // Calculate topic proportions for each year using normalized values per document
  const evolution = Object.keys(yearlyData).sort().map(year => {
    const yearDocs = yearlyData[year].documents;
    const topicSums = Array(13).fill(0).reduce((obj, _, i) => {
      obj[`Topic_${i + 1}`] = 0;
      return obj;
    }, {});
    
    // Sum topic values across all documents in this year
    yearDocs.forEach(doc => {
      let docTotal = 0;
      for (let i = 1; i <= 13; i++) {
        const topicKey = `Topic_${i}`;
        if (doc[topicKey] !== undefined) {
          docTotal += doc[topicKey];
        }
      }
      for (let i = 1; i <= 13; i++) {
        const topicKey = `Topic_${i}`;
        if (doc[topicKey] !== undefined) {
          const normalizedValue = (needsNormalization && docTotal > 0)
            ? doc[topicKey] / docTotal
            : doc[topicKey];
          topicSums[topicKey] += normalizedValue;
        }
      }
    });
    
    // Calculate average for each topic
    const docCount = yearDocs.length;
    Object.keys(topicSums).forEach(topic => {
      topicSums[topic] /= docCount;
    });
    
    return {
      year: parseInt(year),
      documentCount: docCount,
      topicDistribution: topicSums
    };
  });
  
  return evolution;
};

/**
 * Calculate correlations between topics across all documents,
 * using normalized topic values.
 * @param {Array} documentTopics Array of document objects
 * @returns {Array} Matrix of correlation values between topics
 */
const calculateTopicCorrelations = (documentTopics) => {
  // Determine if normalization is needed based on a sample
  let sampleTotal = 0;
  const sampleSize = Math.min(100, documentTopics.length);
  for (let i = 0; i < sampleSize; i++) {
    let docTotal = 0;
    for (let j = 1; j <= 13; j++) {
      const topicKey = `Topic_${j}`;
      if (documentTopics[i][topicKey] !== undefined) {
        docTotal += documentTopics[i][topicKey];
      }
    }
    sampleTotal += docTotal;
  }
  const avgTotal = sampleTotal / sampleSize;
  const needsNormalization = avgTotal < 0.95;

  const numTopics = 13;
  // Prepare an array of normalized topic values for each document
  const normalizedDocs = documentTopics.map(doc => {
    let docTotal = 0;
    for (let i = 1; i <= numTopics; i++) {
      const topicKey = `Topic_${i}`;
      if (doc[topicKey] !== undefined) {
        docTotal += doc[topicKey];
      }
    }
    const normalizedValues = [];
    for (let i = 1; i <= numTopics; i++) {
      const topicKey = `Topic_${i}`;
      const val = doc[topicKey] !== undefined ? doc[topicKey] : 0;
      normalizedValues.push((needsNormalization && docTotal > 0) ? val / docTotal : val);
    }
    return normalizedValues;
  });

  // Calculate means for each topic
  const topicMeans = Array(numTopics).fill(0);
  normalizedDocs.forEach(normalizedValues => {
    for (let i = 0; i < numTopics; i++) {
      topicMeans[i] += normalizedValues[i];
    }
  });
  const docCount = documentTopics.length;
  for (let i = 0; i < numTopics; i++) {
    topicMeans[i] /= docCount;
  }

  // Initialize covariance matrix and calculate covariance for each topic pair
  const covarianceMatrix = Array(numTopics).fill().map(() => Array(numTopics).fill(0));
  normalizedDocs.forEach(normalizedValues => {
    for (let i = 0; i < numTopics; i++) {
      for (let j = 0; j < numTopics; j++) {
        covarianceMatrix[i][j] += (normalizedValues[i] - topicMeans[i]) *
                                    (normalizedValues[j] - topicMeans[j]);
      }
    }
  });
  for (let i = 0; i < numTopics; i++) {
    for (let j = 0; j < numTopics; j++) {
      covarianceMatrix[i][j] /= docCount;
    }
  }

  // Compute standard deviations for each topic
  const topicVariances = Array(numTopics).fill(0);
  normalizedDocs.forEach(normalizedValues => {
    for (let i = 0; i < numTopics; i++) {
      topicVariances[i] += Math.pow(normalizedValues[i] - topicMeans[i], 2);
    }
  });
  const topicStdDevs = topicVariances.map(v => Math.sqrt(v / docCount));

  // Create correlation matrix by normalizing the covariance values
  const correlationMatrix = Array(numTopics).fill().map(() => Array(numTopics).fill(0));
  for (let i = 0; i < numTopics; i++) {
    for (let j = 0; j < numTopics; j++) {
      if (topicStdDevs[i] > 0 && topicStdDevs[j] > 0) {
        correlationMatrix[i][j] = covarianceMatrix[i][j] / (topicStdDevs[i] * topicStdDevs[j]);
      } else {
        correlationMatrix[i][j] = 0;
      }
    }
  }

  return correlationMatrix;
};


/**
 * Prepare topic keywords for visualization
 * @param {Array} nmfTopics Array of topic keyword arrays
 * @param {Array} topicLabels Array of topic label objects
 * @returns {Array} Array of topics with labels and keywords
 */
const prepareTopicKeywords = (nmfTopics, topicLabels) => {
  const topics = [];
  
  // Skip header row in NMF topics
  for (let i = 1; i < nmfTopics.length; i++) {
    const keywordRow = nmfTopics[i];
    const topicIndex = i - 1;
    
    // Find the corresponding topic label
    const topicLabel = topicLabels.find(label => 
      label["Topic Number"] === `Topic ${topicIndex + 1}`
    );
    
    const topicName = topicLabel ? topicLabel["Topic Name"] : `Topic ${topicIndex + 1}`;
    
    // Create topic object with keywords
    topics.push({
      id: topicIndex + 1,
      name: topicName,
      keywords: keywordRow.filter(Boolean) // Remove empty strings
    });
  }
  
  return topics;
};
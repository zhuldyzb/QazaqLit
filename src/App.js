import React, { useState, useEffect } from 'react';
import './styles/App.css';
import Header from './components/Header';
import Footer from './components/Footer';
import Intro from './components/Intro';
import TopicOverview from './components/TopicOverview';
import TopicEvolution from './components/TopicEvolution';
import AuthorTopicDistribution from './components/AuthorTopicDistribution';
import TopicNetwork from './components/TopicNetwork';
import KeywordsCloud from './components/KeywordsCloud';
import TemporalTrends from './components/TemporalTrends';
import { loadAllData } from './utils/dataProcessing';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('intro');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const loadedData = await loadAllData();
        setData(loadedData);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleScroll = () => {
    // This will be expanded to handle scrollytelling triggers
    const scrollPosition = window.scrollY;
    // Logic to determine which section is active based on scroll position
    // will be implemented in a more sophisticated way
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading the Literary Visualizations...</p>
      </div>
    );
  }

  return (
    <div className="App">
      <Header activeSection={activeSection} />
      
      <main className="content">
        <Intro />
        
        <section className="visualization-section">
          <TopicOverview data={data} />
        </section>
        
        <section className="visualization-section">
          <TopicEvolution data={data} />
        </section>
        
        <section className="visualization-section">
          <AuthorTopicDistribution data={data} />
        </section>
        
        <section className="visualization-section">
          <TopicNetwork data={data} />
        </section>
        
        <section className="visualization-section">
          <KeywordsCloud data={data} />
        </section>
        
        <section className="visualization-section">
          <TemporalTrends data={data} />
        </section>
      </main>
      
      <Footer />
    </div>
  );
}

export default App;
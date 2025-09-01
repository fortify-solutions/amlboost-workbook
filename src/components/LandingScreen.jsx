import React, { useState, useEffect } from 'react';
import { InvestigationService } from '../services/investigationService';
import { Icon } from './ui/Icon';

export function LandingScreen({ onCreateNew, onLoadInvestigation }) {
  const [investigations, setInvestigations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Initialize sample data only if none exists (preserves user saves)
    InvestigationService.initializeSampleData();
    loadInvestigations();
  }, []);

  const loadInvestigations = () => {
    try {
      const summaries = InvestigationService.getInvestigationSummaries();
      setInvestigations(summaries.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
    } catch (err) {
      setError('Failed to load investigations');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvestigation = (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        InvestigationService.deleteInvestigation(id);
        loadInvestigations();
      } catch (err) {
        alert('Failed to delete investigation');
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen fortify-geometric-pattern">
      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="mb-8">
            <div className="inline-block p-6 fortify-gradient-bg rounded-3xl mb-6 shadow-xl">
              <Icon name="BarChart3" className="w-16 h-16 text-white" />
            </div>
          </div>
          <h1 className="text-6xl fortify-heading font-bold mb-6">
            AMLBoost
          </h1>
          <p className="text-2xl font-medium text-gray-600 mb-4">
            Intelligent Transaction Analysis Platform
          </p>
          <p className="text-lg fortify-body max-w-3xl mx-auto leading-relaxed">
            Create sophisticated investigations to analyze transaction data, build interactive charts, 
            and uncover critical insights with AI-powered assistance. Streamline your compliance and 
            risk detection workflows.
          </p>
        </div>

        {/* Action Card */}
        <div className="flex justify-center max-w-3xl mx-auto mb-16">
          {/* Create New Investigation */}
          <div 
            onClick={onCreateNew}
            className="fortify-card hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-purple-300 hover:scale-105 w-full max-w-lg group"
          >
            <div className="p-10 text-center">
              <div className="w-20 h-20 fortify-gradient-bg rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-shadow">
                <Icon name="Plus" className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl fortify-subheading mb-3">
                Create New Investigation
              </h3>
              <p className="fortify-body text-base">
                Launch a comprehensive analysis workspace with intelligent cells optimized for data exploration, 
                visualization, and pattern detection.
              </p>
            </div>
          </div>
        </div>

        {/* Existing Investigations */}
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl fortify-heading font-bold mb-8">
            Recent Investigations
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent mx-auto mb-4"></div>
              <p className="fortify-body">Loading investigations...</p>
            </div>
          ) : error ? (
            <div className="fortify-card border-red-200 p-6 text-center bg-red-50">
              <Icon name="AlertCircle" className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-red-700">{error}</p>
            </div>
          ) : investigations.length === 0 ? (
            <div className="fortify-card p-16 text-center">
              <div className="w-20 h-20 fortify-gradient-bg rounded-full flex items-center justify-center mx-auto mb-6">
                <Icon name="FileX" className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl fortify-subheading mb-3">No investigations yet</h3>
              <p className="fortify-body mb-6 text-lg">Ready to dive into your data? Create your first investigation to start uncovering insights.</p>
              <button
                onClick={onCreateNew}
                className="fortify-button-primary flex items-center space-x-2 mx-auto px-6 py-3 text-lg"
              >
                <Icon name="Plus" className="w-5 h-5" />
                <span>Create Investigation</span>
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {investigations.map((investigation) => (
                <div
                  key={investigation.id}
                  className="fortify-card hover:shadow-xl transition-all duration-300 hover:border-purple-300 group"
                >
                  <div className="p-8">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg fortify-subheading mb-2">
                          {investigation.name}
                        </h3>
                        {investigation.description && (
                          <p className="fortify-body mb-3 line-clamp-2">
                            {investigation.description}
                          </p>
                        )}
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Icon name="FileText" className="w-4 h-4" />
                            <span>{investigation.cellCount} cells</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Icon name="Clock" className="w-4 h-4" />
                            <span>Updated {formatDate(investigation.updatedAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => onLoadInvestigation(investigation.id)}
                          className="fortify-button-primary text-sm flex items-center space-x-1"
                        >
                          <Icon name="Play" className="w-3 h-3" />
                          <span>Open</span>
                        </button>
                        <button
                          onClick={() => handleDeleteInvestigation(investigation.id, investigation.name)}
                          className="px-3 py-1.5 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200 transition-colors flex items-center space-x-1"
                        >
                          <Icon name="Trash2" className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center space-x-2 text-sm text-gray-400">
            <span>AMLBoost v2.0</span>
            <span>•</span>
            <span>Intelligent Transaction Analysis</span>
          </div>
        </div>
      </div>
    </div>
  );
}
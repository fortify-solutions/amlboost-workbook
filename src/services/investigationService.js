// Investigation storage service using localStorage
import { sampleInvestigations } from '../data/sampleInvestigations';

export const InvestigationService = {
  // Initialize sample data if no investigations exist
  initializeSampleData: () => {
    try {
      const existing = InvestigationService.getAllInvestigations();
      if (existing.length === 0) {
        console.log('No existing investigations found, loading sample data...');
        localStorage.setItem('notebook_investigations', JSON.stringify(sampleInvestigations));
        console.log(`Loaded ${sampleInvestigations.length} sample investigations`);
      }
    } catch (error) {
      console.error('Failed to initialize sample data:', error);
    }
  },

  // Force refresh sample data (for development/updates)
  refreshSampleData: () => {
    try {
      console.log('Force refreshing sample investigations...');
      localStorage.setItem('notebook_investigations', JSON.stringify(sampleInvestigations));
      console.log(`Refreshed ${sampleInvestigations.length} sample investigations`);
      return sampleInvestigations;
    } catch (error) {
      console.error('Failed to refresh sample data:', error);
      throw error;
    }
  },
  // Save an investigation
  saveInvestigation: (investigation) => {
    try {
      const investigations = InvestigationService.getAllInvestigations();
      const timestamp = new Date().toISOString();
      
      const investigationData = {
        id: investigation.id || `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: investigation.name,
        description: investigation.description,
        cells: investigation.cells,
        createdAt: investigation.createdAt || timestamp,
        updatedAt: timestamp,
        version: '1.0'
      };
      
      // Update existing or add new
      const existingIndex = investigations.findIndex(inv => inv.id === investigationData.id);
      if (existingIndex >= 0) {
        investigations[existingIndex] = investigationData;
      } else {
        investigations.push(investigationData);
      }
      
      localStorage.setItem('notebook_investigations', JSON.stringify(investigations));
      return investigationData;
    } catch (error) {
      console.error('Failed to save investigation:', error);
      throw new Error('Failed to save investigation');
    }
  },

  // Load a specific investigation
  loadInvestigation: (id) => {
    try {
      const investigations = InvestigationService.getAllInvestigations();
      const investigation = investigations.find(inv => inv.id === id);
      
      if (!investigation) {
        throw new Error('Investigation not found');
      }
      
      return investigation;
    } catch (error) {
      console.error('Failed to load investigation:', error);
      throw error;
    }
  },

  // Get all investigations
  getAllInvestigations: () => {
    try {
      const stored = localStorage.getItem('notebook_investigations');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to retrieve investigations:', error);
      return [];
    }
  },

  // Delete an investigation
  deleteInvestigation: (id) => {
    try {
      const investigations = InvestigationService.getAllInvestigations();
      const filtered = investigations.filter(inv => inv.id !== id);
      localStorage.setItem('notebook_investigations', JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Failed to delete investigation:', error);
      throw new Error('Failed to delete investigation');
    }
  },

  // Get investigation metadata (without full cell data)
  getInvestigationSummaries: () => {
    try {
      const investigations = InvestigationService.getAllInvestigations();
      return investigations.map(inv => ({
        id: inv.id,
        name: inv.name,
        description: inv.description,
        createdAt: inv.createdAt,
        updatedAt: inv.updatedAt,
        cellCount: inv.cells ? inv.cells.length : 0
      }));
    } catch (error) {
      console.error('Failed to get investigation summaries:', error);
      return [];
    }
  },

  // Export investigation as JSON (for external backup)
  exportInvestigation: (id) => {
    try {
      const investigation = InvestigationService.loadInvestigation(id);
      const exportData = {
        ...investigation,
        exportedAt: new Date().toISOString(),
        appVersion: '2.0'
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Failed to export investigation:', error);
      throw error;
    }
  },

  // Import investigation from JSON
  importInvestigation: (jsonData) => {
    try {
      const investigation = JSON.parse(jsonData);
      
      // Validate required fields
      if (!investigation.name || !investigation.cells) {
        throw new Error('Invalid investigation format');
      }
      
      // Generate new ID to avoid conflicts
      investigation.id = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      investigation.createdAt = new Date().toISOString();
      
      return InvestigationService.saveInvestigation(investigation);
    } catch (error) {
      console.error('Failed to import investigation:', error);
      throw error;
    }
  }
};
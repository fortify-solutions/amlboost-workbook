import React, { useState } from 'react';
import { useNotebook } from '../../stores/NotebookContext';
import { InvestigationService } from '../../services/investigationService';
import { Icon } from '../ui/Icon';

export function SaveInvestigationModal({ isOpen, onClose, currentInvestigation = null }) {
  const { state, dispatch, ActionTypes } = useNotebook();
  const [name, setName] = useState(currentInvestigation?.name || '');
  const [description, setDescription] = useState(currentInvestigation?.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Investigation name is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const investigation = {
        id: currentInvestigation?.id,
        name: name.trim(),
        description: description.trim(),
        cells: state.cells.map(cell => ({
          ...cell,
          // Only save the configuration, not runtime data
          queryResults: undefined,
          queryError: undefined
        }))
      };

      const savedInvestigation = InvestigationService.saveInvestigation(investigation);
      
      // Update the current investigation in context so future saves work correctly
      dispatch({
        type: ActionTypes.SET_CURRENT_INVESTIGATION,
        payload: savedInvestigation
      });
      
      // Show success message
      alert(`Investigation "${savedInvestigation.name}" saved successfully!`);
      
      onClose();
      
      // Reset form
      setName('');
      setDescription('');
    } catch (err) {
      setError('Failed to save investigation: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {currentInvestigation ? 'Update Investigation' : 'Save Investigation'}
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <Icon name="X" className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex">
                <Icon name="AlertCircle" className="w-5 h-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Investigation Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Suspicious Payment Analysis"
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe the purpose and findings of this investigation..."
              rows={4}
              maxLength={500}
            />
            <div className="text-xs text-gray-500 mt-1">
              {description.length}/500 characters
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex">
              <Icon name="Info" className="w-5 h-5 text-blue-400" />
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  This will save all {state.cells.length} cells and their configurations. 
                  You can reload this investigation later to continue your analysis.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Icon name="Save" className="w-4 h-4" />
                <span>{currentInvestigation ? 'Update' : 'Save'} Investigation</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { 
  X, 
  Search, 
  Layers, 
  Check, 
  Plus, 
  Globe, 
  Clock, 
  DollarSign, 
  Building2 
} from 'lucide-react';
import { GA4Account, GA4Property } from '../types';

interface PropertySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: GA4Account[];
  currentProperty: GA4Property | null;
  onSelectProperty: (property: GA4Property) => void;
  onAddCustomProperty: (property: GA4Property) => void;
}

export const PropertySelectorModal: React.FC<PropertySelectorModalProps> = ({
  isOpen,
  onClose,
  accounts,
  currentProperty,
  onSelectProperty,
  onAddCustomProperty
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customPropId, setCustomPropId] = useState('');
  const [customPropName, setCustomPropName] = useState('');
  const [customTimeZone, setCustomTimeZone] = useState('America/Los_Angeles');

  if (!isOpen) return null;

  const allProperties = accounts.flatMap(acc =>
    acc.properties.map(p => ({ ...p, accountName: acc.displayName }))
  );

  const filteredProperties = allProperties.filter(p =>
    p.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.propertyId.includes(searchTerm) ||
    (p.accountName && p.accountName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelect = (prop: GA4Property) => {
    onSelectProperty(prop);
    onClose();
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPropId.trim()) return;

    const cleanedId = customPropId.trim().replace(/^properties\//, '');
    const newProp: GA4Property = {
      id: `properties/${cleanedId}`,
      propertyId: cleanedId,
      displayName: customPropName.trim() || `Property ${cleanedId}`,
      timeZone: customTimeZone,
      currencyCode: 'USD',
      isDemo: false
    };

    onAddCustomProperty(newProp);
    onSelectProperty(newProp);
    setIsAddingCustom(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Select GA4 Property</h2>
              <p className="text-xs text-slate-500">Switch active Google Analytics 4 property target</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div className="p-4 border-b border-slate-200 bg-white flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search properties by name or ID (e.g. 213025502)..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-xs sm:text-sm text-slate-900 placeholder-slate-400 transition-all"
            />
          </div>

          <button
            onClick={() => setIsAddingCustom(!isAddingCustom)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Property ID</span>
          </button>
        </div>

        {/* Add Custom Form Drawer */}
        {isAddingCustom && (
          <form onSubmit={handleSaveCustom} className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-900">Connect Custom GA4 Property ID:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">GA4 Numeric Property ID *</label>
                <input
                  type="text"
                  required
                  value={customPropId}
                  onChange={(e) => setCustomPropId(e.target.value)}
                  placeholder="e.g. 342981244"
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Display Label</label>
                <input
                  type="text"
                  value={customPropName}
                  onChange={(e) => setCustomPropName(e.target.value)}
                  placeholder="e.g. Marketing Website Prod"
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingCustom(false)}
                className="px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
              >
                Add & Switch Target
              </button>
            </div>
          </form>
        )}

        {/* Properties List */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1 divide-y divide-slate-100">
          {filteredProperties.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              No matching GA4 properties found.
            </div>
          ) : (
            filteredProperties.map((prop) => {
              const isSelected = currentProperty?.propertyId === prop.propertyId;
              return (
                <div
                  key={prop.propertyId}
                  onClick={() => handleSelect(prop)}
                  className={`pt-2 first:pt-0 p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                    isSelected
                      ? 'bg-blue-50/80 border-blue-300'
                      : 'bg-white hover:bg-slate-50 border-slate-200/80'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${isSelected ? 'text-blue-900' : 'text-slate-800 group-hover:text-blue-600'}`}>
                        {prop.displayName}
                      </span>
                      {prop.isDemo && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-500 border border-slate-200 font-medium">
                          Demo
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                      <span>ID: {prop.propertyId}</span>
                      {prop.accountName && (
                        <span className="font-sans text-slate-400">• {prop.accountName}</span>
                      )}
                      {prop.timeZone && (
                        <span className="font-sans text-slate-400 hidden sm:inline">• {prop.timeZone}</span>
                      )}
                    </div>
                  </div>

                  {isSelected ? (
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4" />
                    </div>
                  ) : (
                    <button className="px-3 py-1 rounded-md text-xs font-semibold text-slate-500 group-hover:text-blue-700 group-hover:bg-blue-50 transition-colors">
                      Select
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Total accessible properties: <strong className="text-slate-800">{allProperties.length}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-md text-slate-600 hover:text-slate-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

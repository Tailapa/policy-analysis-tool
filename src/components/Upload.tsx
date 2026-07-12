import React, { useState, useRef, useEffect } from 'react';
import { Item, Ministry, Pillar, Status, Impact, Source } from '../types';
import { uploadIssueFile, createManualItem } from '../api';
import {
  Upload as UploadIcon,
  FileText,
  Plus,
  X,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Link2,
  Compass,
  ChevronDown,
  Building2,
  Trash2,
  Loader2,
  ListChecks,
  Tag
} from 'lucide-react';
import { INDIA_STATE_PATHS } from './IndiaMapPaths';
import ManageItems from './admin/ManageItems';
import ManageMinistries from './admin/ManageMinistries';
import ManageThemes from './admin/ManageThemes';

interface UploadProps {
  onUploadSuccess: (issueId?: string) => void;
  onBackToDashboard: () => void;
  theme: 'light' | 'dark';
  ministries: Ministry[];
  pillars: string[];
  onMinistriesChanged: () => void;
  onPillarsChanged: () => void;
}

type AdminTab = 'upload' | 'items' | 'ministries' | 'themes';

export default function Upload({
  onUploadSuccess,
  onBackToDashboard,
  theme,
  ministries,
  pillars,
  onMinistriesChanged,
  onPillarsChanged,
}: UploadProps) {
  const isDark = theme === 'dark';
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('upload');

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMinistry, setSelectedMinistry] = useState('');
  const [customMinistry, setCustomMinistry] = useState('');
  const [isCustomMinistry, setIsCustomMinistry] = useState(false);
  const [themePillar, setThemePillar] = useState<Pillar>('');
  const [customTheme, setCustomTheme] = useState('');
  const [isCustomTheme, setIsCustomTheme] = useState(false);
  const [status, setStatus] = useState<Status>('Initiated');
  const [impact, setImpact] = useState<Impact>('Medium');
  const [date, setDate] = useState('24 Jun');
  const [dateValue, setDateValue] = useState(24);
  const [isNational, setIsNational] = useState(true);
  const [selectedState, setSelectedState] = useState(INDIA_STATE_PATHS[0].name);

  // Sources and Tags
  const [sources, setSources] = useState<Source[]>([{ label: 'Official Press Release', url: 'https://pib.gov.in' }]);
  const [currentSourceLabel, setCurrentSourceLabel] = useState('');
  const [currentSourceUrl, setCurrentSourceUrl] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // File Upload states
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission / success state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [publishedItem, setPublishedItem] = useState<Item | null>(null);
  const [publishedCount, setPublishedCount] = useState(1);

  const effectiveMinistry = isCustomMinistry ? customMinistry : (selectedMinistry || ministries[0]?.name || '');
  const effectiveTheme = isCustomTheme ? customTheme : themePillar;

  useEffect(() => {
    if (!selectedMinistry && ministries.length > 0) {
      setSelectedMinistry(ministries[0].name);
    }
  }, [ministries, selectedMinistry]);

  useEffect(() => {
    if (!themePillar && pillars.length > 0) {
      setThemePillar(pillars[0]);
    }
  }, [pillars, themePillar]);

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.type.startsWith('image/') || file.type === 'text/plain') {
        setUploadedFile(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Sources Handlers
  const addSource = () => {
    if (currentSourceLabel.trim() && currentSourceUrl.trim()) {
      setSources([...sources, { label: currentSourceLabel.trim(), url: currentSourceUrl.trim() }]);
      setCurrentSourceLabel('');
      setCurrentSourceUrl('');
    }
  };

  const removeSource = (index: number) => {
    setSources(sources.filter((_, i) => i !== index));
  };

  // Form Submit Handler — file present routes to the real ingestion pipeline
  // (POST /api/admin/issues/upload, parses the whole issue); otherwise this
  // hand-authored single item goes to the supplementary manual-create
  // endpoint (POST /api/admin/items). See reconciliation note.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      if (uploadedFile) {
        const result = await uploadIssueFile(uploadedFile);
        setPublishedItem(result.items[0] ?? null);
        setPublishedCount(result.item_count);
        setShowSuccess(true);
        onUploadSuccess(result.issue_id);
        return;
      }

      const tags = tagsInput
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const created = await createManualItem({
        title: title.trim(),
        description: description.trim(),
        ministry: effectiveMinistry,
        theme: effectiveTheme,
        status,
        impact,
        date,
        dateValue,
        geography: isNational ? 'national' : `state: ${selectedState}`,
        sources: sources.length > 0 ? sources : [{ label: 'Cabinet Secretariat', url: 'https://cabsec.gov.in' }],
        tags: tags.length > 0 ? tags : ['Cabinet', 'Policy', 'Viksit Bharat'],
      });

      setPublishedItem(created);
      setPublishedCount(1);
      setShowSuccess(true);
      onUploadSuccess();
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to publish this brief.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setTitle('');
    setDescription('');
    setCustomMinistry('');
    setIsCustomMinistry(false);
    setThemePillar(pillars[0] || '');
    setCustomTheme('');
    setIsCustomTheme(false);
    setStatus('Initiated');
    setImpact('Medium');
    setUploadedFile(null);
    setTagsInput('');
    setSources([{ label: 'Official Press Release', url: 'https://pib.gov.in' }]);
    setShowSuccess(false);
    setPublishedItem(null);
    setSubmitError(null);
  };

  if (isSubmitting) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className={`p-10 md:p-14 rounded-3xl border text-center shadow-2xl transition-all ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
        }`}>
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6 border ${
            isDark ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-600'
          }`}>
            <Loader2 size={30} className="animate-spin" />
          </div>
          <h2 className={`text-xl font-black font-display tracking-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            {uploadedFile ? 'Parsing Your Report' : 'Publishing Brief'}
          </h2>
          <p className="text-xs text-zinc-500 font-medium mt-2 max-w-xs mx-auto">
            Please wait while we process the data...
          </p>
        </div>
      </div>
    );
  }

  if (showSuccess && publishedItem) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className={`p-8 md:p-10 rounded-3xl border text-center shadow-2xl transition-all ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
        }`}>
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mb-6">
            <CheckCircle2 size={32} className="animate-bounce" />
          </div>
          <h2 className={`text-2xl font-black font-display tracking-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            {publishedCount > 1 ? `${publishedCount} Policy Actions Published!` : 'Policy Action Published!'}
          </h2>
          <p className="text-xs text-zinc-500 font-medium mt-1.5 max-w-md mx-auto">
            {publishedCount > 1
              ? `The uploaded report was parsed into ${publishedCount} items, already live in the interactive database. Showing the first below.`
              : 'Your policy brief has been successfully generated, cross-referenced, and live-injected into the interactive database.'}
          </p>

          <div className={`mt-8 p-6 rounded-2xl border text-left space-y-4 max-w-lg mx-auto ${
            isDark ? 'bg-zinc-950/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
          }`}>
            <div>
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                isDark ? 'text-indigo-400 border-indigo-500/20 bg-indigo-500/5' : 'text-indigo-700 border-indigo-200 bg-indigo-50'
              }`}>
                {publishedItem.theme}
              </span>
              <h4 className={`text-sm font-bold mt-2 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                {publishedItem.title}
              </h4>
            </div>

            <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
              {publishedItem.description}
            </p>

            <div className="flex flex-wrap gap-2 text-[10px] font-bold text-zinc-500">
              <span className="bg-zinc-200/50 dark:bg-zinc-800/80 px-2 py-0.5 rounded">
                {publishedItem.ministry}
              </span>
              <span>&bull;</span>
              <span>{publishedItem.date}</span>
              <span>&bull;</span>
              <span className="uppercase text-amber-600 dark:text-amber-400">
                {publishedItem.impact} Impact
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-10">
            <button
              onClick={handleResetForm}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                isDark
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'
                  : 'bg-white border-zinc-250 text-zinc-700 hover:bg-zinc-50 shadow-sm'
              }`}
            >
              Publish Another Brief
            </button>
            <button
              onClick={onBackToDashboard}
              className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-550 text-white rounded-full text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const adminTabs: { id: AdminTab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    { id: 'upload', label: 'Upload New', icon: UploadIcon },
    { id: 'items', label: 'Manage Items', icon: ListChecks },
    { id: 'ministries', label: 'Manage Ministries', icon: Building2 },
    { id: 'themes', label: 'Manage Themes', icon: Tag },
  ];

  return (
    <div className={`${activeAdminTab === 'upload' ? 'max-w-4xl' : 'max-w-5xl'} mx-auto py-6 px-4`}>
      {/* Header back navigation */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          onClick={onBackToDashboard}
          className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full border transition-all cursor-pointer ${
            isDark
              ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
              : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 shadow-sm'
          }`}
        >
          <ArrowLeft size={13} />
          <span>Exit Admin Portal</span>
        </button>

        <div className="flex items-center gap-1.5">
          <Sparkles size={14} className="text-amber-500 animate-pulse" />
          <span className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">
            SECURE PUBLISHING MODE
          </span>
        </div>
      </div>

      {/* Admin sub-tab strip */}
      <div className={`inline-flex gap-1.5 p-1 rounded-full shadow-inner border mb-8 transition-all ${
        isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
      }`}>
        {adminTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveAdminTab(id)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeAdminTab === id
                ? isDark
                  ? 'bg-zinc-800 text-white shadow-md border border-zinc-700/50'
                  : 'bg-white text-zinc-900 shadow-sm border border-zinc-200'
                : isDark
                  ? 'text-zinc-400 hover:text-zinc-200'
                  : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Icon size={12} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {activeAdminTab === 'items' && (
        <ManageItems isDark={isDark} onItemsChanged={onMinistriesChanged} />
      )}

      {activeAdminTab === 'ministries' && (
        <ManageMinistries isDark={isDark} onMinistriesChanged={onMinistriesChanged} />
      )}

      {activeAdminTab === 'themes' && (
        <ManageThemes isDark={isDark} onPillarsChanged={onPillarsChanged} />
      )}

      {activeAdminTab === 'upload' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form panel */}
        <div className={`lg:col-span-2 rounded-3xl border p-6 md:p-8 shadow-xl ${
          isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-800'
        }`}>
          <h2 className={`text-xl font-extrabold font-display tracking-tight mb-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            Publish New Policy Brief
          </h2>
          <p className="text-xs text-zinc-500 font-medium mb-8">
            Create high-fidelity administrative entries directly with custom geographic hotspots
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Policy Title *
              </label>
              <input
                type="text"
                required={!uploadedFile}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. National Green Hydrogen Mission allocates funding..."
                className={`w-full px-4 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all ${
                  isDark
                    ? 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:bg-zinc-900 focus:border-zinc-700'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white focus:border-zinc-300 shadow-inner'
                }`}
              />
            </div>

            {/* Description */}
            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Policy Description & Brief *
              </label>
              <textarea
                required={!uploadedFile}
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write a comprehensive administrative overview, outlining beneficiaries, budgets, goals, and regulatory shifts."
                className={`w-full px-4 py-3 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all ${
                  isDark
                    ? 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:bg-zinc-900 focus:border-zinc-700'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white focus:border-zinc-300 shadow-inner'
                }`}
              />
            </div>

            {/* Ministry Dropdown & Switcher */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Responsible Cabinet Ministry *
                </label>
                <div className="flex gap-2">
                  {!isCustomMinistry ? (
                    <select
                      value={selectedMinistry}
                      onChange={(e) => setSelectedMinistry(e.target.value)}
                      className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all ${
                        isDark
                          ? 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:bg-zinc-900'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white shadow-inner'
                      }`}
                    >
                      <optgroup label="Ministries">
                        {ministries.filter(m => (m.category || 'ministry') === 'ministry').map(m => (
                          <option key={m.name} value={m.name}>{m.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Regulatory Bodies">
                        {ministries.filter(m => m.category === 'regulatory_body').map(m => (
                          <option key={m.name} value={m.name}>{m.name}</option>
                        ))}
                      </optgroup>
                    </select>
                  ) : (
                    <input
                      type="text"
                      required={!uploadedFile}
                      value={customMinistry}
                      onChange={(e) => setCustomMinistry(e.target.value)}
                      placeholder="e.g. Ministry of Space & Technology"
                      className={`w-full px-4 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all ${
                        isDark
                          ? 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:bg-zinc-900'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white shadow-inner'
                      }`}
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsCustomMinistry(!isCustomMinistry)}
                  className="mt-1.5 text-[10px] font-bold text-indigo-500 hover:underline cursor-pointer"
                >
                  {isCustomMinistry ? '← Select Standard Ministry' : '＋ Input custom Ministry'}
                </button>
              </div>

              {/* Theme / Pillar */}
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Theme Pillar Category *
                </label>
                {!isCustomTheme ? (
                  <select
                    value={themePillar}
                    onChange={(e) => setThemePillar(e.target.value as Pillar)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all ${
                      isDark
                        ? 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:bg-zinc-900'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white shadow-inner'
                    }`}
                  >
                    {pillars.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required={!uploadedFile}
                    value={customTheme}
                    onChange={(e) => setCustomTheme(e.target.value)}
                    placeholder="e.g. Digital Governance"
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all ${
                      isDark
                        ? 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:bg-zinc-900'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white shadow-inner'
                    }`}
                  />
                )}
                <button
                  type="button"
                  onClick={() => setIsCustomTheme(!isCustomTheme)}
                  className="mt-1.5 text-[10px] font-bold text-indigo-500 hover:underline cursor-pointer"
                >
                  {isCustomTheme ? '← Select Standard Theme' : '＋ Input custom Theme'}
                </button>
              </div>
            </div>

            {/* Status & Impact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Administrative Status *
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Status)}
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all ${
                    isDark
                      ? 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:bg-zinc-900'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white shadow-inner'
                  }`}
                >
                  <option value="Initiated">Initiated</option>
                  <option value="Announced">Announced</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Strategic Impact Level *
                </label>
                <select
                  value={impact}
                  onChange={(e) => setImpact(e.target.value as Impact)}
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all ${
                    isDark
                      ? 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:bg-zinc-900'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white shadow-inner'
                  }`}
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            {/* Timeline date and state mapping */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Timeline Date *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required={!uploadedFile}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    placeholder="e.g. 24 Jun"
                    className={`w-1/2 px-4 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all ${
                      isDark
                        ? 'bg-zinc-950 border-zinc-800 text-zinc-100'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-900 shadow-inner'
                    }`}
                  />
                  <input
                    type="number"
                    required={!uploadedFile}
                    min={1}
                    max={30}
                    value={dateValue}
                    onChange={(e) => setDateValue(Number(e.target.value))}
                    placeholder="24"
                    className={`w-1/2 px-4 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all ${
                      isDark
                        ? 'bg-zinc-950 border-zinc-800 text-zinc-100'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-900 shadow-inner'
                    }`}
                  />
                </div>
              </div>

              {/* Geography Mapping */}
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Geographic Targeting *
                </label>
                <div className="space-y-2">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                      <input
                        type="radio"
                        checked={isNational}
                        onChange={() => setIsNational(true)}
                        className="accent-indigo-600"
                      />
                      <span>National Level</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                      <input
                        type="radio"
                        checked={!isNational}
                        onChange={() => setIsNational(false)}
                        className="accent-indigo-600"
                      />
                      <span>State Specific</span>
                    </label>
                  </div>

                  {!isNational && (
                    <select
                      value={selectedState}
                      onChange={(e) => setSelectedState(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all ${
                        isDark
                          ? 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:bg-zinc-900'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white shadow-inner'
                      }`}
                    >
                      {INDIA_STATE_PATHS.map(state => (
                        <option key={state.id} value={state.name}>{state.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Sources section */}
            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-950/40 border-zinc-800' : 'bg-zinc-50/50 border-zinc-200'}`}>
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Cross-Reference Citations & Sources ({sources.length})
              </label>

              {sources.length > 0 && (
                <div className="space-y-2 mb-4">
                  {sources.map((src, index) => (
                    <div 
                      key={index} 
                      className={`flex justify-between items-center px-3.5 py-1.5 rounded-xl border text-xs font-semibold ${
                        isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-700 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Link2 size={12} className="text-indigo-400 shrink-0" />
                        <span className="font-bold shrink-0">{src.label}:</span>
                        <span className="text-zinc-400 truncate text-[10px] font-medium">{src.url}</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeSource(index)}
                        className="text-zinc-400 hover:text-rose-500 cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={currentSourceLabel}
                  onChange={(e) => setCurrentSourceLabel(e.target.value)}
                  placeholder="Source label (e.g. PIB Delhi)"
                  className={`w-full sm:w-1/3 px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none ${
                    isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
                  }`}
                />
                <input
                  type="url"
                  value={currentSourceUrl}
                  onChange={(e) => setCurrentSourceUrl(e.target.value)}
                  placeholder="Source URL (https://...)"
                  className={`w-full sm:w-1/2 px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none ${
                    isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
                  }`}
                />
                <button
                  type="button"
                  onClick={addSource}
                  className="sm:w-auto px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all self-end"
                >
                  Add Source
                </button>
              </div>
            </div>

            {/* Tags Input */}
            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Custom Search Tags (Comma separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="GreenEnergy, Hydrogen, FuelCells, Budget2026"
                className={`w-full px-4 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all ${
                  isDark
                    ? 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:bg-zinc-900'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white shadow-inner'
                }`}
              />
            </div>

            {/* Error banner */}
            {submitError && (
              <div className={`p-3 rounded-xl border text-xs font-bold ${
                isDark ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-100 text-rose-700'
              }`}>
                {submitError}
              </div>
            )}

            {/* Publish Action Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3.5 text-white rounded-full text-xs font-bold transition-all shadow-md mt-4 ${
                isSubmitting
                  ? 'bg-indigo-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] cursor-pointer'
              }`}
            >
              {isSubmitting
                ? (uploadedFile ? 'Parsing & Publishing…' : 'Publishing…')
                : (uploadedFile ? 'Parse & Publish Uploaded Report' : 'Confirm and Publish Brief')}
            </button>
          </form>
        </div>

        {/* File upload side block */}
        <div className="space-y-6">
          <div className={`rounded-3xl border p-6 shadow-xl ${
            isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-800'
          }`}>
            <h3 className={`text-sm font-bold font-display tracking-tight mb-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              Or Simply Upload a Report (PDF)
            </h3>
            <p className="text-[10px] text-zinc-500 font-semibold mb-6 uppercase tracking-wider">
              OPTIONAL PDF OR DOCUMENTATION
            </p>

            {/* Drag and drop panel */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileInput}
              className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-indigo-500 bg-indigo-500/5 scale-95'
                  : isDark
                    ? 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/20'
                    : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50/50 shadow-inner'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple={false}
                accept=".pdf,.txt,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />

              {!uploadedFile ? (
                <>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 border ${
                    isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-white border-zinc-200 text-zinc-500 shadow-sm'
                  }`}>
                    <UploadIcon size={16} />
                  </div>
                  <p className={`text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-800'}`}>
                    Drag & Drop File Here
                  </p>
                  <p className="text-[10px] text-zinc-500 font-semibold mt-1">
                    or click to search computer
                  </p>
                  <p className="text-[9px] text-zinc-500/80 mt-3 italic">
                    Supports PDF, DOCX or TXT (Max 15MB)
                  </p>
                </>
              ) : (
                <div className="w-full">
                  <div className="mx-auto w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mb-3">
                    <FileText size={16} />
                  </div>
                  <p className={`text-xs font-bold truncate max-w-[200px] mx-auto ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                    {uploadedFile.name}
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <div className="flex items-center justify-center gap-1.5 mt-4">
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100/50 dark:bg-emerald-950/30 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      Loaded Successfully
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadedFile(null);
                      }}
                      className="text-zinc-400 hover:text-rose-500 p-1 rounded-full cursor-pointer hover:bg-zinc-200/40 dark:hover:bg-zinc-800"
                      title="Remove file"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick tips panel */}
          <div className={`rounded-3xl border p-5 shadow-sm text-xs space-y-3 font-semibold ${
            isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-400' : 'bg-zinc-50/50 border-zinc-200 text-zinc-600'
          }`}>
            <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
              Publishing Standards
            </h4>
            <ul className="list-disc pl-4 space-y-1.5 text-[11px]">
              <li>Use title casing for the main headline.</li>
              <li>Always cross-reference a valid press release link.</li>
              <li>State Specific targetings will light up on the Choropleth map immediately.</li>
              <li>Uploaded materials are processed locally and securely.</li>
            </ul>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

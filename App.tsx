
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Lead, User, DashboardCounts, LeadStats, LeadGroup, LeadGroupMember, ReferralGroup, ReferralGroupMember } from './types';
import { apiService } from './services/api';
import { Icons } from './components/Icons';
import LeadFormModal from './components/LeadFormModal';
import LeadDetails from './components/LeadDetails';
import FilterPanel from './components/FilterPanel';
import Login from './components/Login';
import MessageModal from './components/MessageModal';
import LeadAssistantChatbot from './components/LeadAssistantChatbot';
import DailyReminderGate from './components/DailyReminderGate';
import DailyReportView from './components/DailyReportView';
import NotesView from './components/NotesView';
import UserManagementView from './components/UserManagementView';
import { exportCrmData } from './utils/exportCrm';
import GroupChatView from './components/GroupChatView';
import ReleaseNotesView, { hasActiveReleaseNotes } from './components/ReleaseNotesView';
import WeeklyAIReportView from './components/WeeklyAIReportView';
import GoogleAnalyticsView from './components/GoogleAnalyticsView';
import BulkMsgView from './components/BulkMsgView';
import HrPortalView from './components/HrPortalView';
import ReviewMeetingView from './components/ReviewMeetingView';
import SalesTrainingView from './components/SalesTrainingView';
import CoworkView from './components/CoworkView';
import { Armchair } from 'lucide-react';
import { LeadGroupChips, CreateGroupModal, LeadGroupPopup, GroupsPanel } from './components/LeadGroups';
import { ReferralGroupsButton, ReferralGroupsPanel, ReferralGroupPopup, ReferralCodeChip } from './components/ReferralGroups';

type View = 'dashboard' | 'transferred' | 'reminders' | 'converted' | 'not-interested' | 'daily-report' | 'weekly-ai-report' | 'notes' | 'user-management' | 'group-chat' | 'release-notes' | 'google-analytics' | 'bulk-msg' | 'hr-portal' | 'review-meeting' | 'sales-training' | 'cowork';

export interface FilterState {
  courses: string[];
  programTypes: string[];
  professions: string[];
  sources: string[];
  statuses: string[];
  pipelines: string[];
  assignedUsers: string[];
  campaigns: string[];
  fromDate: string;
  toDate: string;
  statusFilter: 'hot' | 'warm' | 'cold' | 'no-remarks' | 'responded' | 'qualified' | null;
  college?: string; // optional college filter (single select)
  batch?: string; // optional batch filter (single select)
  assignedUser?: string; // single assigned user filter
  source?: string; // single lead source filter
}

export const initialFilters: FilterState = {
  courses: [],
  programTypes: [],
  professions: [],
  sources: [],
  statuses: [],
  pipelines: [],
  assignedUsers: [],
  campaigns: [],
  fromDate: '',
  toDate: '',
  statusFilter: null,
  college: '',
  batch: '',
  assignedUser: '',
  source: '',
};

const parseMongoDate = (date: any): string => {
  if (!date) return new Date().toISOString();
  if (typeof date === 'string') return date;
  if (date.$date) return date.$date;
  return new Date().toISOString();
};

const normalizeRemark = (remark: any) => ({
  _id: remark?._id?.$oid || remark?._id || Math.random().toString(36).substr(2, 9),
  remark: remark?.remark || '',
  timestamp: parseMongoDate(remark?.timestamp),
  addedBy: remark?.addedBy || remark?.username || remark?.createdBy || remark?.by || undefined,
});

const normalizeLead = (lead: any): Lead => ({
  _id: lead._id?.$oid || lead._id || Math.random().toString(36).substr(2, 9),
  userName: lead.userName || lead.username || 'Unknown Lead',
  userNumber: lead.userNumber || '0000000000',
  course: lead.course || lead.courseofintrest || lead.courseTitle || null,
  leadfrom: lead.leadfrom || lead.source || 'Manual',
  referredBy: lead.referredBy || null,
  referralCode: lead.referralCode || null,
  is_referral_leader: !!lead.is_referral_leader,
  status: lead.status || 'Cold',
  pipeline: lead.pipeline || 'New Lead',
  conversations: Array.isArray(lead.conversations) ? lead.conversations : [],
  remarks: Array.isArray(lead.remarks) ? lead.remarks.map(normalizeRemark) : [],
  datecreated: parseMongoDate(lead.datecreated),
  lastInteracted: parseMongoDate(lead.lastInteracted),
  followUpCount: lead.followUpCount || 0,
  respondedAfterFollowUp: !!lead.respondedAfterFollowUp,
  demoBooked: !!lead.demoBooked,
  lastFollowUpSentAt: lead.lastFollowUpSentAt ? parseMongoDate(lead.lastFollowUpSentAt) : null,
  reminder: lead.reminder ? parseMongoDate(lead.reminder) : null,
  profession: lead.profession || null,
  location: lead.location || lead.city || null,
  programType: lead.programType || lead.program_type || lead.programtype || null,
  assignedto: lead.assignedto || undefined,
  fees: lead.fees || lead.feeStructure,
  aiAnalysis: lead.aiAnalysis || null,
  aiConversationSummary: lead.aiConversationSummary || null,
  InternDetails: Array.isArray(lead.InternDetails) ? lead.InternDetails : [],
  certificates: Array.isArray(lead.certificates) ? lead.certificates : [],
  is_leader: !!lead.is_leader,
  batchId: lead.batchId || null,
  Trainer: lead.Trainer || null,
  batch_date: lead.batch_date || null,
  campaignHistory: Array.isArray(lead.campaignHistory) ? lead.campaignHistory : [],
  autoReassignHistory: Array.isArray(lead.autoReassignHistory) ? lead.autoReassignHistory : [],
});

/**
 * Compact AI assistant button for dashboard rows.
 */
const AIAnalysisCell = ({ lead, onOpenAssistant }: { lead: Lead, onOpenAssistant: (id: string) => void }) => {
  return (
    <div className="flex items-center justify-center p-2">
      <button
        onClick={(e) => { e.stopPropagation(); onOpenAssistant(lead._id); }}
        className="text-[11px] font-black text-slate-700 hover:text-slate-900 uppercase px-2 py-1 rounded-md bg-slate-50 border border-slate-100 shadow-sm"
      >
        AI assistant
      </button>
    </div>
  );
};

const LoadingSpinner = () => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-blue-600 font-bold text-sm animate-pulse">Processing...</p>
    </div>
  </div>
);

const App: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState<View>(() => {
    const saved = localStorage.getItem('crm_view') as View;
    const valid: View[] = ['dashboard', 'transferred', 'reminders', 'converted', 'not-interested', 'daily-report', 'notes', 'user-management', 'group-chat', 'release-notes', 'google-analytics', 'bulk-msg', 'hr-portal', 'review-meeting', 'sales-training', 'cowork'];
    return valid.includes(saved) ? saved : 'dashboard';
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [autoAssignEnabled, setAutoAssignEnabled] = useState(true);
  const [autoAssignStaffs, setAutoAssignStaffs] = useState<string[]>([]);
  const [excludedStaffs, setExcludedStaffs] = useState<string[]>([]);
  const [isAutoAssignConfigOpen, setIsAutoAssignConfigOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileActionsOpen, setIsMobileActionsOpen] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [isMessagingMode, setIsMessagingMode] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [campaignNames, setCampaignNames] = useState<string[]>([]);

  // ── Lead Groups ──
  const [leadGroups, setLeadGroups] = useState<LeadGroup[]>([]);
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [groupPickIds, setGroupPickIds] = useState<Set<string>>(new Set());
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<LeadGroupMember[]>([]);
  const [isLoadingGroupMembers, setIsLoadingGroupMembers] = useState(false);
  const [isGroupsPanelOpen, setIsGroupsPanelOpen] = useState(false);
  const [addToGroupOpen, setAddToGroupOpen] = useState(false);

  // ── Referral Groups (existing student -> everyone they've referred) ──
  const [referralGroups, setReferralGroups] = useState<ReferralGroup[]>([]);
  const [isReferralPanelOpen, setIsReferralPanelOpen] = useState(false);
  const [openReferralGroup, setOpenReferralGroup] = useState<ReferralGroup | null>(null);
  const [referralMembers, setReferralMembers] = useState<ReferralGroupMember[]>([]);
  const [isLoadingReferralMembers, setIsLoadingReferralMembers] = useState(false);

  const [assistantOpenLeadId, setAssistantOpenLeadId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [leadStats, setLeadStats] = useState<LeadStats | null>(null);
  const [dashboardCounts, setDashboardCounts] = useState<DashboardCounts | null>(null);
  const [reminderLeads, setReminderLeads] = useState<Lead[]>([]);
  const [isFetchingLeads, setIsFetchingLeads] = useState(false);
  const leadsRequestIdRef = useRef(0);
  const [searchTabCounts, setSearchTabCounts] = useState<Record<string, number>>({});
  const searchTabTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  const [showLeadLegend, setShowLeadLegend] = useState(false);

  const autoAssignRef = useRef(autoAssignEnabled);
  useEffect(() => { autoAssignRef.current = autoAssignEnabled; }, [autoAssignEnabled]);

  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('crm_token'));
  const [currentUser, setCurrentUser] = useState<User | null>(JSON.parse(localStorage.getItem('crm_user') || 'null'));

  const viewLabels: Record<View, string> = {
    'user-management': 'User Management',
    dashboard: currentUser?.role === 'hr' ? 'Job Seekers' : 'Dashboard',
    transferred: 'Transferred Leads',
    reminders: 'Reminders',
    converted: 'Converted',
    'not-interested': 'Not Interested',
    'daily-report': currentUser?.role === 'admin' ? 'Daily Report' : 'My Report',
    'weekly-ai-report': 'AI Report',
    notes: 'Notes & Sheet',
    'group-chat': 'Team Chat',
    'release-notes': "What's New",
    'google-analytics': 'Google Analytics',
    'bulk-msg': 'Bulk WhatsApp',
    'hr-portal': 'HR Portal',
    'review-meeting': 'Review Meeting',
    'sales-training': 'Sales Training',
    cowork: 'Seat Booking',
  };

  useEffect(() => {
    localStorage.setItem('crm_view', currentView);
  }, [currentView]);

  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('crm_theme') === 'dark';
    if (saved) document.documentElement.classList.add('dark');
    return saved;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('crm_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const LEADS_PER_PAGE = 50;
  const LEADS_CHUNK_LIMIT = 200;

  const fetchDashboardMeta = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const data = await apiService.fetchDashboardMeta(currentUser.username);
      if (data.success) {
        if (data.staffs) setUsers(data.staffs);
        if (data.counts) setDashboardCounts(data.counts);
      }
      if (currentUser.role === 'admin') {
        const settings = await apiService.getSettings();
        if (settings.success) setAutoAssignEnabled(settings.autoAssign);
        const staffSettings = await apiService.getAutoAssignStaffs();
        if (staffSettings.success) {
          setAutoAssignStaffs(staffSettings.staffs || []);
          setExcludedStaffs(staffSettings.excludedStaffs || []);
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard meta:', err);
      handleLogout(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadsForCurrentView = async (opts?: { forceLoadAll?: boolean }): Promise<Lead[] | undefined> => {
    if (!currentUser) return;

    // Cowork view owns its own data fetching.
    if (currentView === 'cowork') return;

    const requestId = ++leadsRequestIdRef.current;

    // Reminders view should behave like the old UI: reminders are not affected by search/filters.
    if (currentView === 'reminders') {
      try {
        setIsFetchingLeads(true);
        const res = await apiService.queryLeads({
          view: 'reminders',
          page: 1,
          limit: 500,
          includeStats: false,
          mode: 'summary',
        });
        if (requestId !== leadsRequestIdRef.current) return;
        if (res.success) {
          const normalized = res.leads.map(normalizeLead);
          setReminderLeads(normalized);
        }
      } catch (err) {
        console.error('Failed to fetch reminders:', err);
      } finally {
        if (requestId === leadsRequestIdRef.current) setIsFetchingLeads(false);
      }
      return;
    }

    const hasActiveFilters = (() => {
      const { statusFilter, fromDate, toDate, courses, programTypes, professions, sources, statuses, pipelines, assignedUsers, campaigns } = filters;
      const arrayFiltersActive =
        courses.length > 0 ||
        programTypes.length > 0 ||
        professions.length > 0 ||
        sources.length > 0 ||
        statuses.length > 0 ||
        pipelines.length > 0 ||
        assignedUsers.length > 0 ||
        campaigns.length > 0;
      return arrayFiltersActive || fromDate !== '' || toDate !== '' || statusFilter !== null;
    })();

    const isSearchOrFilterActive = searchQuery.trim().length > 0 || hasActiveFilters;
    const shouldLoadAll = opts?.forceLoadAll || isSearchOrFilterActive;

    const mode = 'summary';

    try {
      setIsFetchingLeads(true);

      if (!shouldLoadAll) {
        const res = await apiService.queryLeads({
          view: currentView,
          searchQuery,
          filters,
          page: currentPage,
          limit: LEADS_PER_PAGE,
          includeStats: true,
          mode,
        });

        if (requestId !== leadsRequestIdRef.current) return;
        if (res.success) {
          const normalized = res.leads.map(normalizeLead);
          setLeads(normalized);
          setLeadsTotal(res.total || 0);
          setLeadStats(res.stats ?? null);
          return normalized;
        }
        return;
      }

      // Load all results in chunks so the UI becomes usable quickly.
      let page = 1;
      let total = 0;
      let accumulated: Lead[] = [];

      while (true) {
        const res = await apiService.queryLeads({
          view: currentView,
          searchQuery,
          filters,
          page,
          limit: LEADS_CHUNK_LIMIT,
          includeStats: page === 1,
          mode,
        });

        if (requestId !== leadsRequestIdRef.current) return;
        if (!res.success) break;

        if (page === 1) {
          total = res.total || 0;
          setLeadsTotal(total);
          setLeadStats(res.stats ?? null);
        }

        const chunk = res.leads.map(normalizeLead);
        accumulated = accumulated.concat(chunk);
        setLeads(accumulated);

        if (accumulated.length >= total || chunk.length === 0) break;
        page += 1;
      }
      return accumulated;
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      if (requestId === leadsRequestIdRef.current) setIsFetchingLeads(false);
    }
  };

  const fetchLeadGroups = async () => {
    try {
      const groups = await apiService.getLeadGroups();
      setLeadGroups(groups);
    } catch (err) {
      console.error('Failed to fetch lead groups:', err);
    }
  };

  const fetchReferralGroups = async () => {
    try {
      const groups = await apiService.getReferralGroups();
      setReferralGroups(groups);
    } catch (err) {
      console.error('Failed to fetch referral groups:', err);
    }
  };

  const openReferralPopup = async (group: ReferralGroup) => {
    setOpenReferralGroup(group);
    setIsReferralPanelOpen(false);
    setIsLoadingReferralMembers(true);
    setReferralMembers([]);
    try {
      const members = await apiService.getReferralGroupMembers(group.code);
      setReferralMembers(members);
    } catch (err) {
      console.error('Failed to load referral group members:', err);
    } finally {
      setIsLoadingReferralMembers(false);
    }
  };

  // Opens the referral popup from a row-level code chip, where we may only have the
  // code itself (the referred lead's row) rather than the full group summary — reuse
  // the already-fetched referralGroups list for the leader name if we have it.
  const openReferralPopupByCode = (code: string, fallbackLeaderName?: string | null) => {
    const known = referralGroups.find(g => g.code === code);
    openReferralPopup(known || { code, leaderId: '', leaderName: fallbackLeaderName || 'Unknown', leaderNumber: '', memberCount: 0 });
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchDashboardMeta();
    fetchLeadsForCurrentView();
    apiService.getCampaignNames().then(setCampaignNames).catch(() => {});
    fetchLeadGroups();
    fetchReferralGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const ws = new WebSocket('wss://nonveracious-conveniently-jacques.ngrok-free.dev/ws');

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'new_user' && data.user) {
          let freshLead = normalizeLead(data.user);

          if (!freshLead.assignedto && currentUser?.role === 'admin' && autoAssignRef.current) {
            try {
              const res = await apiService.triggerAutoAssign(freshLead._id);
              if (res.success && res.lead) {
                freshLead = normalizeLead(res.lead);
              }
            } catch (e) {
              console.error('Failed to trigger auto-assign for external lead:', e);
            }
          }

          setLeads(prev => {
            const exists = prev.some(l => l._id === freshLead._id);
            if (exists) {
              return prev.map(l => l._id === freshLead._id ? freshLead : l);
            }
            // Avoid injecting new leads into a server-paginated view (can break ordering/pagination).
            return prev;
          });
        }
      } catch (e) { console.error('WS Error:', e); }
    };
    return () => ws.close();
  }, [isAuthenticated, currentUser]);

  const handleStatusFilterClick = (status: 'hot' | 'warm' | 'cold' | 'no-remarks' | 'responded' | 'qualified') => {
    setFilters(prev => ({
      ...prev,
      statusFilter: prev.statusFilter === status ? null : status
    }));
  };

  const isLeadsTableView =
    currentView === 'dashboard' ||
    currentView === 'transferred' ||
    currentView === 'converted' ||
    currentView === 'not-interested';
  const isDailyReportView = currentView === 'daily-report' || currentView === 'weekly-ai-report';
  // A single checkbox column serves both Messaging Mode and Group Mode.
  const isPickMode = isMessagingMode || isGroupMode;

  // Server-driven leads: when view/search/filters/page change, fetch the next slice (or all results in chunks).
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchLeadsForCurrentView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, currentView, searchQuery, filters, currentPage]);

  // Reset to page 1 whenever the query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [currentView, searchQuery, filters]);

  // Cross-tab search: when a search is active, count matching leads in every searchable tab
  // so we can highlight tabs that contain the search result even if the user isn't on that tab.
  useEffect(() => {
    if (searchTabTimerRef.current) clearTimeout(searchTabTimerRef.current);
    const q = searchQuery.trim();
    if (!q || !currentUser) {
      setSearchTabCounts({});
      return;
    }
    searchTabTimerRef.current = setTimeout(async () => {
      const views = ['dashboard', 'converted', 'not-interested'] as const;
      const results = await Promise.all(
        views.map(view =>
          apiService.queryLeads({ view, searchQuery: q, page: 1, limit: 1, includeStats: false, mode: 'summary' })
            .then(res => ({ view, total: res.success ? (res.total ?? 0) : 0 }))
            .catch(() => ({ view, total: 0 }))
        )
      );
      const counts: Record<string, number> = {};
      results.forEach(({ view, total }) => { counts[view] = total; });
      setSearchTabCounts(counts);
    }, 400);
    return () => { if (searchTabTimerRef.current) clearTimeout(searchTabTimerRef.current); };
  }, [searchQuery, currentUser]);

  // Backward-compatible variable name used throughout the render: this list is already filtered server-side.
  const filteredLeads = leads;

  const toggleLeadSelection = (id: string) => {
    const next = new Set(selectedLeadIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedLeadIds(next);
  };

  const selectAllFiltered = async () => {
    // Regardless of whether search/filters are active, make sure every matching
    // lead (not just the currently loaded page) is fetched before selecting.
    let allLeads = leads;
    if (leads.length < leadsTotal) {
      const fetched = await fetchLeadsForCurrentView({ forceLoadAll: true });
      if (fetched) allLeads = fetched;
    }
    setSelectedLeadIds(new Set(allLeads.map(l => l._id)));
  };

  const uncheckAll = () => {
    setSelectedLeadIds(new Set());
  };

  const exitMessagingMode = () => {
    setIsMessagingMode(false);
    uncheckAll();
  };

  // ── Lead Groups ──
  // Messaging Mode and Group Mode are mutually exclusive (one checkbox column).
  useEffect(() => { if (isMessagingMode && isGroupMode) setIsGroupMode(false); }, [isMessagingMode]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isGroupMode) { setIsMessagingMode(false); uncheckAll(); }
    else setGroupPickIds(new Set());
  }, [isGroupMode]); // eslint-disable-line react-hooks/exhaustive-deps
  // Switching the leads view drops the group selection; search/filter changes keep
  // it, so the user can search → pick → search → pick before creating the group.
  useEffect(() => { setGroupPickIds(new Set()); }, [currentView]);

  const groupsByLeadId = useMemo(() => {
    const map = new Map<string, LeadGroup[]>();
    for (const g of leadGroups) {
      for (const id of g.memberIds) {
        if (!map.has(id)) map.set(id, []);
        map.get(id)!.push(g);
      }
    }
    return map;
  }, [leadGroups]);

  const activeGroup = useMemo(
    () => leadGroups.find(g => g._id === openGroupId) ?? null,
    [leadGroups, openGroupId],
  );

  const canManageGroup = (g: LeadGroup | null) =>
    !!g && (currentUser?.role === 'admin' || (!!g.createdBy && g.createdBy === currentUser?.username));

  const toggleGroupPick = (id: string) => {
    setGroupPickIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const openGroupPopup = async (group: LeadGroup) => {
    setOpenGroupId(group._id);
    setIsGroupsPanelOpen(false);
    setIsLoadingGroupMembers(true);
    setGroupMembers([]);
    try {
      const members = await apiService.getLeadGroupMembers(group._id);
      setGroupMembers(members);
    } catch (err) {
      console.error('Failed to load group members:', err);
    } finally {
      setIsLoadingGroupMembers(false);
    }
  };

  const handleCreateGroup = async (name: string, color: string) => {
    try {
      setIsCreatingGroup(true);
      await apiService.createLeadGroup(name, color, Array.from(groupPickIds));
      await fetchLeadGroups();
      setIsCreateGroupOpen(false);
      setIsGroupMode(false);
    } catch (err: any) {
      alert(err.message || 'Failed to create group');
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleAddPickedToGroup = async (groupId: string) => {
    try {
      setLoading(true);
      await apiService.updateLeadGroupMembers(groupId, { add: Array.from(groupPickIds) });
      await fetchLeadGroups();
      setAddToGroupOpen(false);
      setIsGroupMode(false);
    } catch (err: any) {
      alert(err.message || 'Failed to add leads to group');
    } finally {
      setLoading(false);
    }
  };

  const handleRenameGroup = async (name: string) => {
    if (!activeGroup) return;
    try {
      await apiService.updateLeadGroup(activeGroup._id, { name });
      await fetchLeadGroups();
    } catch (err: any) {
      alert(err.message || 'Failed to rename group');
    }
  };

  const handleRecolorGroup = async (color: string) => {
    if (!activeGroup) return;
    try {
      await apiService.updateLeadGroup(activeGroup._id, { color });
      await fetchLeadGroups();
    } catch (err: any) {
      alert(err.message || 'Failed to update group colour');
    }
  };

  const handleDeleteGroup = async () => {
    if (!activeGroup) return;
    try {
      await apiService.deleteLeadGroup(activeGroup._id);
      setOpenGroupId(null);
      await fetchLeadGroups();
    } catch (err: any) {
      alert(err.message || 'Failed to delete group');
    }
  };

  const handleRemoveGroupMember = async (leadId: string) => {
    if (!activeGroup) return;
    try {
      await apiService.updateLeadGroupMembers(activeGroup._id, { remove: [leadId] });
      setGroupMembers(prev => prev.filter(m => m._id !== leadId));
      await fetchLeadGroups();
    } catch (err: any) {
      alert(err.message || 'Failed to remove member');
    }
  };

  const handleAddGroupMembers = async (leadIds: string[]) => {
    if (!activeGroup) return;
    try {
      await apiService.updateLeadGroupMembers(activeGroup._id, { add: leadIds });
      const [members] = await Promise.all([
        apiService.getLeadGroupMembers(activeGroup._id),
        fetchLeadGroups(),
      ]);
      setGroupMembers(members);
    } catch (err: any) {
      alert(err.message || 'Failed to add member');
    }
  };

  const handleSendMessage = async (message: string, campaignName: string) => {
    try {
      setIsSendingMessage(true);
      const res = await apiService.sendMessageToLeads(Array.from(selectedLeadIds), message, campaignName);
      alert(res.message);
      setIsMessageModalOpen(false);
      exitMessagingMode();
      if (campaignName) {
        apiService.getCampaignNames().then(setCampaignNames).catch(() => {});
      }
    } catch (err) {
      alert('Failed to send messages');
      exitMessagingMode();
    } finally {
      setIsSendingMessage(false);
    }
  };

  const remindersList = useMemo(() => {
    return reminderLeads
      .filter(l => l.reminder)
      .sort((a, b) => new Date(parseMongoDate(a.reminder)).getTime() - new Date(parseMongoDate(b.reminder)).getTime());
  }, [reminderLeads]);

  const notInterestedCount = dashboardCounts?.notInterestedCount ?? 0;

  const categorizedReminders = useMemo(() => {
    if (currentUser?.role !== 'admin') return { 'My Reminders': remindersList };
    const groups: Record<string, Lead[]> = {};
    remindersList.forEach(lead => {
      const staff = lead.assignedto || 'Unassigned';
      if (!groups[staff]) groups[staff] = [];
      groups[staff].push(lead);
    });
    return groups;
  }, [remindersList, currentUser]);

  const stats = useMemo(() => {
    const s = leadStats;
    return {
      total: s?.total ?? leadsTotal ?? 0,
      cold: s?.cold ?? 0,
      warm: s?.warm ?? 0,
      hot: s?.hot ?? 0,
      unassigned: s?.unassigned ?? 0,
      noRemarks: s?.noRemarks ?? 0,
      responded: s?.responded ?? 0,
      qualified: s?.qualified ?? 0,
    };
  }, [leadStats, leadsTotal]);

  const handleDistribute = async () => {
    if (!confirm('This will alternatively assign all unassigned leads among your staff. Continue?')) return;
    try {
      setLoading(true);
      const res = await apiService.distributeLeads();
      alert(res.message);
      await fetchDashboardMeta();
      await fetchLeadsForCurrentView({ forceLoadAll: true });
    } catch (err) {
      alert('Distribution failed');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoAssign = async () => {
    const newState = !autoAssignEnabled;
    try {
      setLoading(true);
      const res = await apiService.updateSettings(newState);
      if (res.success) {
        setAutoAssignEnabled(newState);
      } else {
        alert('Failed to update toggle');
      }
    } catch (err) {
      alert('Network error updating setting');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStaffInAutoAssign = async (username: string) => {
    const isCurrentlyExcluded = excludedStaffs.includes(username);
    const newExcluded = isCurrentlyExcluded
      ? excludedStaffs.filter(s => s !== username)
      : [...excludedStaffs, username];
    setExcludedStaffs(newExcluded);
    try {
      const res = await apiService.updateAutoAssignStaffs(newExcluded);
      if (!res.success) throw new Error(res.message || 'Failed to update staff preference');
    } catch (err) {
      setExcludedStaffs(excludedStaffs);
      alert('Failed to update staff preference');
    }
  };

  const handleUpdateReminder = async (leadId: string, date: string | null) => {
    try {
      setLoading(true);
      const updated = await apiService.updateLead({ _id: leadId, reminder: date });
      const norm = normalizeLead(updated);
      setLeads(prev => prev.map(l => l._id === leadId ? norm : l));
      setReminderLeads(prev => prev.map(l => l._id === leadId ? norm : l));
      if (selectedLead?._id === leadId) setSelectedLead(norm);
    } catch (err) {
      alert('Failed to update reminder');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (user: User, token: string) => {
    localStorage.setItem('crm_token', token);
    localStorage.setItem('crm_user', JSON.stringify(user));
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = (confirm = true) => {
    if (confirm && !window.confirm('Logout?')) return;
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    localStorage.removeItem('crm_view');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setLeads([]);
    setLeadsTotal(0);
    setLeadStats(null);
    setDashboardCounts(null);
    setReminderLeads([]);
  };

  const handleExportCrm = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportProgress('Starting...');
    try {
      await exportCrmData(currentView, filters, searchQuery, (msg) => setExportProgress(msg));
    } catch (err) {
      console.error('CRM export failed:', err);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
      setExportProgress('');
    }
  };

  const handleAddLead = async (leadData: Partial<Lead>) => {
    try {
      setLoading(true);
      const payload = {
        ...leadData,
        assignedto: currentUser?.username
      };
      await apiService.addLead(payload);
      setIsAddModalOpen(false);
      await fetchDashboardMeta();
      await fetchLeadsForCurrentView({ forceLoadAll: true });
    } catch (err: any) { alert(err.message); }
    finally { setLoading(false); }
  };

  const handleDeleteLead = async (id: string) => {
    if (currentUser?.role !== 'admin') return alert('Only admins can delete leads');
    if (!confirm('Delete this lead?')) return;
    try {
      setLoading(true);
      await apiService.deleteLead(id);
      setSelectedLead(null);
      await fetchDashboardMeta();
      await fetchLeadsForCurrentView({ forceLoadAll: true });
    } catch (err) { alert('Delete failed'); }
    finally { setLoading(false); }
  };

  const getDaysRemaining = (dateStr: string) => {
    try {
      const targetDate = new Date(dateStr);
      const now = new Date();
      targetDate.setHours(0, 0, 0, 0);
      now.setHours(0, 0, 0, 0);
      const diffTime = targetDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return { text: `${Math.abs(diffDays)}d Overdue`, color: 'text-red-600 bg-red-50' };
      if (diffDays === 0) return { text: 'Today', color: 'text-orange-600 bg-orange-50' };
      return { text: `${diffDays}d Left`, color: 'text-blue-600 bg-blue-50' };
    } catch (e) {
      return { text: 'Invalid', color: 'text-slate-400' };
    }
  };

  const formatDate = (date: any) => {
    const d = parseMongoDate(date);
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (date: any) => {
    const d = parseMongoDate(date);
    return new Date(d).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getLatestRemark = (remarks: Lead['remarks']) => {
    if (!remarks || remarks.length === 0) return null;
    return [...remarks].sort(
      (a, b) => new Date(parseMongoDate(b.timestamp)).getTime() - new Date(parseMongoDate(a.timestamp)).getTime()
    )[0];
  };

  const handleAnalyzeLead = async (leadId: string) => {
    try {
      setLoading(true);
      const result = await apiService.analyzeLead(leadId);
      if (result.success && result.analysis) {
        setLeads(prev => prev.map(l => l._id === leadId ? { ...l, aiAnalysis: result.analysis } : l));
        setSelectedLead(prev => prev && prev._id === leadId ? { ...prev, aiAnalysis: result.analysis } : prev);
      }
    } catch (err) {
      alert('Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const openAssistantForLead = (leadId: string) => {
    // Open the floating assistant for the lead without selecting it in the main UI
    setAssistantOpenLeadId(leadId);
  };

  const openLeadDetails = async (leadId: string) => {
    try {
      setLoading(true);
      const res = await apiService.fetchLeadById(leadId);
      if (res.success && res.lead) {
        setSelectedLead(normalizeLead(res.lead));
      }
    } catch (err) {
      console.error('Failed to open lead:', err);
      alert('Failed to load lead details');
    } finally {
      setLoading(false);
    }
  };

  const hasActiveFilters = useMemo(() => {
    const { statusFilter, fromDate, toDate, courses, programTypes, professions, sources, statuses, pipelines, assignedUsers, campaigns } = filters;
    const arrayFiltersActive =
      courses.length > 0 ||
      programTypes.length > 0 ||
      professions.length > 0 ||
      sources.length > 0 ||
      statuses.length > 0 ||
      pipelines.length > 0 ||
      assignedUsers.length > 0 ||
      campaigns.length > 0;
    return arrayFiltersActive || fromDate !== '' || toDate !== '' || statusFilter !== null;
  }, [filters]);

  // When a search query or any filter is active, show ALL matching results so the user
  // can see every match without clicking through pages.  In the default (no search /
  // no filter) state, render 50 rows per page for speed.
  const isSearchOrFilterActive = searchQuery.trim().length > 0 || hasActiveFilters;
  const totalPages = isSearchOrFilterActive
    ? 1
    : Math.max(1, Math.ceil(leadsTotal / LEADS_PER_PAGE));
  const paginatedLeads = filteredLeads;

  // HR only ever needs the (backend-scoped) "Looking for job" queue + the HR Portal —
  // the rest of the counsellor/admin sidebar & toolbar is hidden for this role.
  const isHr = currentUser?.role === 'hr';

  // Mobile bottom nav: main destinations only — everything else lives behind "More".
  const mobileNavItems: { key: string; label: string; icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactElement; active: boolean; onClick: () => void }[] = isHr
    ? [
        { key: 'dashboard', label: 'Job Seekers', icon: Icons.User, active: currentView === 'dashboard', onClick: () => setCurrentView('dashboard') },
        { key: 'hr-portal', label: 'HR Portal', icon: Icons.Crown, active: currentView === 'hr-portal', onClick: () => setCurrentView('hr-portal') },
      ]
    : [
        { key: 'dashboard', label: 'Dashboard', icon: Icons.User, active: currentView === 'dashboard' || currentView === 'transferred', onClick: () => setCurrentView('dashboard') },
        { key: 'daily-report', label: currentUser?.role === 'admin' ? 'Daily Report' : 'My Report', icon: Icons.Calendar, active: currentView === 'daily-report', onClick: () => setCurrentView('daily-report') },
        { key: 'weekly-ai-report', label: 'AI Report', icon: Icons.Bot, active: currentView === 'weekly-ai-report', onClick: () => setCurrentView('weekly-ai-report') },
      ];

  if (!isAuthenticated) return <Login onLogin={handleLogin} />;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-left relative">
      {loading && <LoadingSpinner />}
      <DailyReminderGate isAuthenticated={isAuthenticated} />

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[9998] md:hidden bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-[9999] w-64 bg-slate-900 text-white flex flex-col transform transition-transform duration-300 md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:flex'}`}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg"><Icons.Settings className="w-6 h-6 text-white" /></div>
            <h1 className="text-xl font-bold tracking-tight">BetaSpace CRM</h1>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-2 hover:bg-slate-800 rounded-lg"><Icons.X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button onClick={() => { setCurrentView('dashboard'); setIsMobileMenuOpen(false); }} className={`hidden md:flex w-full items-center gap-3 px-4 py-3 rounded-xl border transition-all relative ${(currentView === 'dashboard' || currentView === 'transferred') ? 'bg-blue-600/10 text-blue-400 border-blue-600/20' : searchQuery.trim() && (searchTabCounts['dashboard'] ?? 0) > 0 ? 'text-amber-400 border-amber-500/40 bg-amber-500/10' : 'text-slate-400 border-transparent hover:bg-slate-800'}`}>
            <Icons.User className="w-5 h-5" />
            <span className="font-medium">Dashboard{currentView === 'transferred' ? ' · Transferred' : ''}</span>
            {searchQuery.trim() && currentView !== 'dashboard' && (searchTabCounts['dashboard'] ?? 0) > 0 && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center animate-pulse">{searchTabCounts['dashboard']}</span>
            )}
          </button>
          {!isHr && (
          <button onClick={() => { setCurrentView('reminders'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all relative ${currentView === 'reminders' ? 'bg-blue-600/10 text-blue-400 border-blue-600/20' : 'text-slate-400 border-transparent hover:bg-slate-800'}`}>
            <Icons.Calendar className="w-5 h-5" />
            <span className="font-medium">Reminders</span>
            {(dashboardCounts?.remindersCount ?? remindersList.length) > 0 && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{dashboardCounts?.remindersCount ?? remindersList.length}</span>
            )}
          </button>
          )}
          {!isHr && (
          <button onClick={() => { setCurrentView('converted'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all relative ${currentView === 'converted' ? 'bg-emerald-600/10 text-emerald-400 border-emerald-600/20' : searchQuery.trim() && (searchTabCounts['converted'] ?? 0) > 0 ? 'text-amber-400 border-amber-500/40 bg-amber-500/10' : 'text-slate-400 border-transparent hover:bg-slate-800'}`}>
            <Icons.CheckCircle className="w-5 h-5" />
            <span className="font-medium">Converted</span>
            {searchQuery.trim() && currentView !== 'converted' && (searchTabCounts['converted'] ?? 0) > 0 && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center animate-pulse">{searchTabCounts['converted']}</span>
            )}
          </button>
          )}
          {!isHr && (
          <button onClick={() => { setCurrentView('not-interested'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all relative ${currentView === 'not-interested' ? 'bg-rose-600/10 text-rose-400 border-rose-600/20' : searchQuery.trim() && (searchTabCounts['not-interested'] ?? 0) > 0 ? 'text-amber-400 border-amber-500/40 bg-amber-500/10' : 'text-slate-400 border-transparent hover:bg-slate-800'}`}>
            <Icons.X className="w-5 h-5" />
            <span className="font-medium">Not Interested</span>
            {searchQuery.trim() && currentView !== 'not-interested' && (searchTabCounts['not-interested'] ?? 0) > 0 ? (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center animate-pulse">{searchTabCounts['not-interested']}</span>
            ) : notInterestedCount > 0 && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{notInterestedCount}</span>
            )}
          </button>
          )}
          {!isHr && (
          <button onClick={() => { setCurrentView('notes'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${currentView === 'notes' ? 'bg-violet-600/10 text-violet-400 border-violet-600/20' : 'text-slate-400 border-transparent hover:bg-slate-800'}`}>
            <Icons.FileText className="w-5 h-5" />
            <span className="font-medium">Notes & Sheet</span>
          </button>
          )}
          {!isHr && (
          <button onClick={() => { setCurrentView('daily-report'); setIsMobileMenuOpen(false); }} className={`hidden md:flex w-full items-center gap-3 px-4 py-3 rounded-xl border transition-all ${currentView === 'daily-report' ? 'bg-cyan-600/10 text-cyan-400 border-cyan-600/20' : 'text-slate-400 border-transparent hover:bg-slate-800'}`}>
            <Icons.Calendar className="w-5 h-5" />
            <span className="font-medium">{currentUser?.role === 'admin' ? 'Daily Report' : 'My Report'}</span>
          </button>
          )}
          {!isHr && (
          <button onClick={() => { setCurrentView('weekly-ai-report'); setIsMobileMenuOpen(false); }} className={`hidden md:flex w-full items-center gap-3 px-4 py-3 rounded-xl border transition-all ${currentView === 'weekly-ai-report' ? 'bg-amber-600/10 text-amber-400 border-amber-600/20' : 'text-slate-400 border-transparent hover:bg-slate-800'}`}>
            <Icons.Bot className="w-5 h-5" />
            <span className="font-medium">AI Report</span>
          </button>
          )}
          {!isHr && (
          <button onClick={() => { setCurrentView('cowork'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${currentView === 'cowork' ? 'bg-sky-600/10 text-sky-400 border-sky-600/20' : 'text-slate-400 border-transparent hover:bg-slate-800'}`}>
            <Armchair className="w-5 h-5" />
            <span className="font-medium">Seat Booking</span>
          </button>
          )}
          {!isHr && (
          <button onClick={() => { setCurrentView('sales-training'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${currentView === 'sales-training' ? 'bg-indigo-600/10 text-indigo-400 border-indigo-600/20' : 'text-slate-400 border-transparent hover:bg-slate-800'}`}>
            <Icons.GraduationCap className="w-5 h-5" />
            <span className="font-medium">Sales Training</span>
          </button>
          )}
          {currentUser?.role === 'admin' && (
            <button onClick={() => { setCurrentView('user-management'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${currentView === 'user-management' ? 'bg-indigo-600/10 text-indigo-400 border-indigo-600/20' : 'text-slate-400 border-transparent hover:bg-slate-800'}`}>
              <Icons.User className="w-5 h-5" />
              <span className="font-medium">User Management</span>
            </button>
          )}
          {currentUser?.role === 'admin' && (
            <button onClick={() => { setCurrentView('google-analytics'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${currentView === 'google-analytics' ? 'bg-sky-600/10 text-sky-400 border-sky-600/20' : 'text-slate-400 border-transparent hover:bg-slate-800'}`}>
              <Icons.BarChart3 className="w-5 h-5" />
              <span className="font-medium">Google Analytics</span>
            </button>
          )}
          {(currentUser?.role === 'admin' || isHr) && (
            <button onClick={() => { setCurrentView('hr-portal'); setIsMobileMenuOpen(false); }} className={`${isHr ? 'hidden md:flex' : 'flex'} w-full items-center gap-3 px-4 py-3 rounded-xl border transition-all ${currentView === 'hr-portal' ? 'bg-indigo-600/10 text-indigo-400 border-indigo-600/20' : 'text-slate-400 border-transparent hover:bg-slate-800'}`}>
              <Icons.User className="w-5 h-5" />
              <span className="font-medium">HR Portal</span>
            </button>
          )}
          {currentUser?.role === 'admin' && (
            <button onClick={() => { setCurrentView('review-meeting'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${currentView === 'review-meeting' ? 'bg-indigo-600/10 text-indigo-400 border-indigo-600/20' : 'text-slate-400 border-transparent hover:bg-slate-800'}`}>
              <Icons.Bot className="w-5 h-5" />
              <span className="font-medium">Review Meeting</span>
            </button>
          )}
          {!isHr && (
          <button onClick={() => { setCurrentView('group-chat'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${currentView === 'group-chat' ? 'bg-teal-600/10 text-teal-400 border-teal-600/20' : 'text-slate-400 border-transparent hover:bg-slate-800'}`}>
            <Icons.Chat className="w-5 h-5" />
            <span className="font-medium">Team Chat</span>
          </button>
          )}
          {!isHr && (
          <button onClick={() => { setCurrentView('bulk-msg'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${currentView === 'bulk-msg' ? 'bg-emerald-600/10 text-emerald-400 border-emerald-600/20' : 'text-slate-400 border-transparent hover:bg-slate-800'}`}>
            <Icons.Upload className="w-5 h-5" />
            <span className="font-medium">Bulk WhatsApp</span>
          </button>
          )}
          {!isHr && (
          <button onClick={() => { setCurrentView('release-notes'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all relative ${currentView === 'release-notes' ? 'bg-purple-600/10 text-purple-400 border-purple-600/20' : 'text-slate-400 border-transparent hover:bg-slate-800'}`}>
            <Icons.FileText className="w-5 h-5" />
            <span className="font-medium">What's New</span>
            {hasActiveReleaseNotes() && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            )}
          </button>
          )}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <p className="text-xs text-slate-500 uppercase font-bold mb-2">Signed in as</p>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs uppercase">{currentUser?.username.charAt(0)}</div>
            <div className="text-sm overflow-hidden">
              <p className="font-semibold truncate">{currentUser?.username}</p>
              <p className="text-slate-500 text-xs capitalize">{currentUser?.role}</p>
            </div>
          </div>
          {currentUser?.role === 'admin' && (
            <button
              onClick={handleExportCrm}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:bg-green-600 transition-all text-sm font-bold mb-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isExporting
                ? <Icons.RefreshCcw className="w-4 h-4 animate-spin flex-shrink-0" />
                : <Icons.Download className="w-4 h-4 flex-shrink-0" />}
              <span className="truncate">{isExporting ? exportProgress : 'Export CRM'}</span>
            </button>
          )}
          <button onClick={() => handleLogout()} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:bg-red-600 transition-all text-sm font-bold">Logout</button>
        </div>
      </aside>

      {/* Mobile bottom navigation — main destinations only; everything else is behind "More". */}
      <nav className="md:hidden fixed z-[9996] left-1/2 -translate-x-1/2 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center gap-1 bg-slate-900/95 backdrop-blur-md border border-slate-700/60 rounded-full shadow-2xl px-1.5 py-1.5 max-w-[calc(100%-1.5rem)]">
        {mobileNavItems.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={item.onClick}
              aria-label={item.label}
              title={item.label}
              className={`flex items-center justify-center rounded-full transition-all shrink-0 ${item.active ? 'gap-2 px-4 py-3 bg-blue-600/15 border border-blue-500/40 text-blue-400 shadow-[0_0_14px_rgba(59,130,246,0.35)]' : 'p-3 text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {item.active && <span className="text-xs font-bold whitespace-nowrap">{item.label}</span>}
            </button>
          );
        })}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="More"
          title="More"
          className={`flex items-center justify-center rounded-full transition-all shrink-0 ${isMobileMenuOpen ? 'gap-2 px-4 py-3 bg-blue-600/15 border border-blue-500/40 text-blue-400 shadow-[0_0_14px_rgba(59,130,246,0.35)]' : 'p-3 text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
        >
          <Icons.MoreHorizontal className="w-5 h-5 shrink-0" />
          {isMobileMenuOpen && <span className="text-xs font-bold whitespace-nowrap">More</span>}
        </button>
      </nav>

      <main className="flex-1 flex flex-col overflow-hidden relative min-w-0 pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 z-20 shadow-sm">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <h2 className="text-lg font-bold text-slate-800 truncate min-w-0 max-w-[50%] sm:max-w-none">{viewLabels[currentView]}</h2>
            {!isDailyReportView && currentView !== 'notes' && currentView !== 'user-management' && currentView !== 'hr-portal' && currentView !== 'review-meeting' && currentView !== 'sales-training' && currentView !== 'cowork' && currentView !== 'group-chat' && currentView !== 'bulk-msg' && (
              <div className="relative flex-1 max-w-md ml-1 sm:ml-2">
                <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`w-full pl-10 ${searchQuery ? 'pr-9' : 'pr-4'} py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${/^\+?[\d\s-]+$/.test(searchQuery.trim()) && searchQuery.replace(/\D/g, '').length >= 3 ? 'bg-amber-100 border border-amber-400 font-semibold text-amber-900' : 'bg-slate-100 border-transparent'}`} />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors" title="Clear search"><Icons.X className="w-4 h-4" /></button>
                )}
              </div>
            )}
            {isLeadsTableView && (
              <button onClick={() => setIsFilterOpen(true)} className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${hasActiveFilters ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
                <Icons.Filter className="w-4 h-4" />
                <span className="hidden md:inline">Filters</span>
                {hasActiveFilters && <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>}
              </button>
            )}
          </div>

          <div className="hidden md:flex items-center gap-4 ml-4">
            {isMessagingMode ? (
              <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
                <span className="text-xs font-bold text-slate-400 uppercase mr-2">{selectedLeadIds.size} Selected</span>
                <button onClick={selectAllFiltered} className="px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200">Select All</button>
                <button onClick={uncheckAll} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200">Clear</button>
                {selectedLeadIds.size > 0 && (
                  <button onClick={() => setIsMessageModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:shadow-lg active:scale-95 transition-all">
                    <Icons.Send className="w-4 h-4" />
                    <span>Send Message</span>
                  </button>
                )}
                <button onClick={exitMessagingMode} className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors" title="Exit Messaging Mode"><Icons.X className="w-5 h-5" /></button>
              </div>
            ) : isGroupMode ? (
              <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
                <span className="text-xs font-bold text-slate-400 uppercase mr-1">{groupPickIds.size} Selected</span>
                <button onClick={() => setGroupPickIds(new Set())} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200">Clear</button>
                {groupPickIds.size > 0 && (
                  <>
                    <button onClick={() => setIsCreateGroupOpen(true)} className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:shadow-lg active:scale-95 transition-all">
                      <Icons.Plus className="w-4 h-4" />
                      <span>Create Group</span>
                    </button>
                    {leadGroups.length > 0 && (
                      <div className="relative">
                        <button onClick={() => setAddToGroupOpen(o => !o)} className="flex items-center gap-1.5 px-3 py-2 bg-violet-50 text-violet-700 border border-violet-200 rounded-lg font-bold text-sm hover:bg-violet-100 transition-all">
                          Add to <Icons.ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        {addToGroupOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setAddToGroupOpen(false)} />
                            <div className="absolute top-11 right-0 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl p-1.5 min-w-[200px] max-h-64 overflow-y-auto">
                              {leadGroups.map(g => (
                                <button key={g._id} onClick={() => handleAddPickedToGroup(g._id)} className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 text-left transition-colors">
                                  <span className="text-sm font-semibold text-slate-700 truncate">{g.name}</span>
                                  <span className="text-[10px] text-slate-400 flex-shrink-0">{g.memberCount}</span>
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
                <button onClick={() => setIsGroupMode(false)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors" title="Exit Group Mode"><Icons.X className="w-5 h-5" /></button>
              </div>
            ) : (
              isLeadsTableView && (
                <>
                  <button
                    onClick={() => setIsGroupsPanelOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-50 text-violet-700 hover:bg-violet-100 rounded-lg font-bold text-sm transition-all border border-violet-200"
                  >
                    <Icons.User className="w-4 h-4" />
                    <span>Groups{leadGroups.length > 0 ? ` (${leadGroups.length})` : ''}</span>
                  </button>
                  {currentView === 'dashboard' && (
                    <ReferralGroupsButton groups={referralGroups} onClick={() => setIsReferralPanelOpen(true)} />
                  )}
                  <button
                    onClick={() => setIsMessagingMode(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-bold text-sm transition-all border border-indigo-200"
                  >
                    <Icons.Send className="w-4 h-4" />
                    <span>Messaging Mode</span>
                  </button>
                </>
              )
            )}

            {!isPickMode && !isDailyReportView && currentView !== 'user-management' && currentView !== 'hr-portal' && currentView !== 'review-meeting' && currentView !== 'sales-training' && currentView !== 'cowork' && currentView !== 'group-chat' && currentView !== 'bulk-msg' && (
              <>
                {currentUser?.role === 'admin' && (
                  <div className="relative flex items-center gap-2 pr-4 border-r border-slate-200">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter leading-none mb-1">Auto-Assign</span>
                      <span className={`text-[9px] font-bold ${autoAssignEnabled ? 'text-green-600' : 'text-slate-400'}`}>{autoAssignEnabled ? 'ON' : 'OFF'}</span>
                    </div>
                    <button onClick={handleToggleAutoAssign} disabled={loading} className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none ${autoAssignEnabled ? 'bg-blue-600' : 'bg-slate-300'} ${loading ? 'opacity-50' : ''}`}><div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 transform ${autoAssignEnabled ? 'translate-x-5' : 'translate-x-0'}`} /></button>
                    <button
                      onClick={() => setIsAutoAssignConfigOpen(o => !o)}
                      title="Configure auto-assign staffs"
                      className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <Icons.Settings className="w-3.5 h-3.5" />
                    </button>
                    {isAutoAssignConfigOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsAutoAssignConfigOpen(false)} />
                      <div className="absolute top-10 right-0 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-3 min-w-[200px]">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Staff in Auto-Assign</p>
                          <button onClick={() => setIsAutoAssignConfigOpen(false)} className="text-slate-400 hover:text-slate-600"><Icons.X className="w-3.5 h-3.5" /></button>
                        </div>
                        {autoAssignStaffs.length === 0 ? (
                          <p className="text-xs text-slate-400 py-1">No staff found</p>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {autoAssignStaffs.map(username => {
                              const included = !excludedStaffs.includes(username);
                              return (
                                <button
                                  key={username}
                                  onClick={() => handleToggleStaffInAutoAssign(username)}
                                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-left transition-colors"
                                >
                                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${included ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                                    {included && <Icons.Check className="w-2.5 h-2.5 text-white" />}
                                  </div>
                                  <span className={`text-xs font-semibold ${included ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400'}`}>{username}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      </>
                    )}
                  </div>
                )}

                {currentUser?.role === 'admin' && stats.unassigned > 0 && (
                  <button onClick={handleDistribute} disabled={loading} className="flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-orange-200 transition-all disabled:opacity-50"><Icons.RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> <span className="hidden lg:inline">Bulk Assign ({stats.unassigned})</span></button>
                )}

                {!isHr && (
                  <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:shadow-lg active:scale-95 transition-all"><Icons.Plus className="w-4 h-4" /> <span className="hidden lg:inline">Add Lead</span></button>
                )}
              </>
            )}
          </div>

          <button
            onClick={() => setIsDark((d: boolean) => !d)}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 hover:bg-slate-100 rounded-lg flex-shrink-0 ml-1"
          >
            {isDark
              ? <Icons.Sun className="w-5 h-5 text-yellow-400" />
              : <Icons.Moon className="w-5 h-5 text-slate-500" />
            }
          </button>

          {!isDailyReportView && currentView !== 'user-management' && currentView !== 'hr-portal' && currentView !== 'review-meeting' && currentView !== 'sales-training' && currentView !== 'cowork' && currentView !== 'group-chat' && currentView !== 'bulk-msg' && (
            <button onClick={() => setIsMobileActionsOpen(!isMobileActionsOpen)} className="md:hidden ml-2 p-2 hover:bg-slate-100 rounded-lg relative flex-shrink-0">
              <Icons.MoreVertical className="w-6 h-6 text-slate-700" />
              {(hasActiveFilters || selectedLeadIds.size > 0 || isMessagingMode || isGroupMode || groupPickIds.size > 0) && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
              )}
            </button>
          )}
        </header>

        {isMobileActionsOpen && !isDailyReportView && (
          <div className="absolute right-4 top-16 z-[50] md:hidden animate-in slide-in-from-top-2 duration-200">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-2 min-w-[200px]">
              {isMessagingMode ? (
                <>
                  <div className="p-3 border-b border-slate-100 mb-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Messaging Mode ({selectedLeadIds.size})</p>
                  </div>
                  <button onClick={selectAllFiltered} className="flex items-center gap-3 w-full p-3 text-left hover:bg-slate-50 text-slate-700 rounded-lg transition-colors"><Icons.Check className="w-4 h-4" /> <span className="text-sm font-semibold">Select All Filtered</span></button>
                  <button onClick={uncheckAll} className="flex items-center gap-3 w-full p-3 text-left hover:bg-slate-50 text-slate-700 rounded-lg transition-colors"><Icons.X className="w-4 h-4" /> <span className="text-sm font-semibold">Uncheck All</span></button>
                  {selectedLeadIds.size > 0 && (
                    <button onClick={() => { setIsMessageModalOpen(true); setIsMobileActionsOpen(false); }} className="flex items-center gap-3 w-full p-3 text-left bg-indigo-600 text-white rounded-lg transition-colors mt-1"><Icons.Send className="w-4 h-4" /> <span className="text-sm font-bold">Send Message Now</span></button>
                  )}
                  <button onClick={exitMessagingMode} className="flex items-center gap-3 w-full p-3 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-1"><Icons.X className="w-4 h-4" /> <span className="text-sm font-bold">Exit Mode</span></button>
                </>
              ) : isGroupMode ? (
                <>
                  <div className="p-3 border-b border-slate-100 mb-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Group Mode ({groupPickIds.size})</p>
                  </div>
                  <button onClick={() => setGroupPickIds(new Set())} className="flex items-center gap-3 w-full p-3 text-left hover:bg-slate-50 text-slate-700 rounded-lg transition-colors"><Icons.X className="w-4 h-4" /> <span className="text-sm font-semibold">Clear Selection</span></button>
                  {groupPickIds.size > 0 && (
                    <button onClick={() => { setIsCreateGroupOpen(true); setIsMobileActionsOpen(false); }} className="flex items-center gap-3 w-full p-3 text-left bg-violet-600 text-white rounded-lg transition-colors mt-1"><Icons.Plus className="w-4 h-4" /> <span className="text-sm font-bold">Create Group</span></button>
                  )}
                  <button onClick={() => { setIsGroupMode(false); setIsMobileActionsOpen(false); }} className="flex items-center gap-3 w-full p-3 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-1"><Icons.X className="w-4 h-4" /> <span className="text-sm font-bold">Exit Mode</span></button>
                </>
              ) : (
                <>
                  <button onClick={() => { setIsMessagingMode(true); setIsMobileActionsOpen(false); }} className="flex items-center gap-3 w-full p-3 text-left bg-indigo-50 text-indigo-700 rounded-lg transition-colors mb-1"><Icons.Send className="w-4 h-4" /> <span className="text-sm font-bold">Messaging Mode</span></button>
                  {isLeadsTableView && (
                    <button onClick={() => { setIsGroupsPanelOpen(true); setIsMobileActionsOpen(false); }} className="flex items-center gap-3 w-full p-3 text-left bg-violet-50 text-violet-700 rounded-lg transition-colors mb-1"><Icons.User className="w-4 h-4" /> <span className="text-sm font-bold">Groups{leadGroups.length > 0 ? ` (${leadGroups.length})` : ''}</span></button>
                  )}
                  {currentView === 'dashboard' && referralGroups.length > 0 && (
                    <button onClick={() => { setIsReferralPanelOpen(true); setIsMobileActionsOpen(false); }} className="flex items-center gap-3 w-full p-3 text-left bg-amber-50 text-amber-700 rounded-lg transition-colors mb-1"><Icons.User className="w-4 h-4" /> <span className="text-sm font-bold">Referrals ({referralGroups.length})</span></button>
                  )}
                  <button onClick={() => { setIsFilterOpen(true); setIsMobileActionsOpen(false); }} className={`flex items-center gap-3 w-full p-3 text-left rounded-lg transition-colors ${hasActiveFilters ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-50 text-slate-700'}`}><Icons.Filter className="w-4 h-4" /> <span className="text-sm font-semibold">Filters {hasActiveFilters ? '(Active)' : ''}</span></button>
                  <button onClick={() => { setIsAddModalOpen(true); setIsMobileActionsOpen(false); }} className="flex items-center gap-3 w-full p-3 text-left hover:bg-slate-50 text-slate-700 rounded-lg transition-colors"><Icons.Plus className="w-4 h-4 text-green-600" /> <span className="text-sm font-semibold">Add New Lead</span></button>
                  {currentUser?.role === 'admin' && (
                    <button onClick={() => { handleDistribute(); setIsMobileActionsOpen(false); }} className="flex items-center gap-3 w-full p-3 text-left hover:bg-slate-50 text-slate-700 rounded-lg transition-colors"><Icons.RefreshCcw className="w-4 h-4 text-orange-600" /> <span className="text-sm font-semibold">Bulk Assign</span></button>
                  )}
                  {currentUser?.role === 'admin' && (
                    <>
                      <div className="flex items-center justify-between w-full p-3 rounded-lg">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-700">Auto-Assign</span>
                          <span className={`text-[10px] font-bold ${autoAssignEnabled ? 'text-green-600' : 'text-slate-400'}`}>{autoAssignEnabled ? 'ON' : 'OFF'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={handleToggleAutoAssign} disabled={loading} className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none ${autoAssignEnabled ? 'bg-blue-600' : 'bg-slate-300'} ${loading ? 'opacity-50' : ''}`}><div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 transform ${autoAssignEnabled ? 'translate-x-5' : 'translate-x-0'}`} /></button>
                          <button
                            onClick={() => setIsAutoAssignConfigOpen(o => !o)}
                            title="Configure auto-assign staffs"
                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            <Icons.Settings className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {isAutoAssignConfigOpen && (
                        <div className="mx-1 mb-1 bg-slate-50 rounded-lg p-3 border border-slate-200">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Staff in Auto-Assign</p>
                          {autoAssignStaffs.length === 0 ? (
                            <p className="text-xs text-slate-400 py-1">No staff found</p>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {autoAssignStaffs.map(username => {
                                const included = !excludedStaffs.includes(username);
                                return (
                                  <button
                                    key={username}
                                    onClick={() => handleToggleStaffInAutoAssign(username)}
                                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-white text-left transition-colors"
                                  >
                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${included ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                                      {included && <Icons.Check className="w-2.5 h-2.5 text-white" />}
                                    </div>
                                    <span className={`text-xs font-semibold ${included ? 'text-slate-700' : 'text-slate-400'}`}>{username}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {isLeadsTableView ? (
          <>
            {!isHr && (currentView === 'dashboard' || currentView === 'transferred') && (
              <div className={`px-4 sm:px-6 pt-4 sm:pt-6 -mb-2 shrink-0 flex items-center gap-2 ${selectedLead ? 'hidden lg:flex' : ''}`}>
                <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100 p-1">
                  <button
                    onClick={() => setCurrentView('dashboard')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-tight transition-all ${currentView === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Dashboard Leads
                  </button>
                  <button
                    onClick={() => setCurrentView('transferred')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-tight transition-all ${currentView === 'transferred' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <Icons.RefreshCcw className="w-3.5 h-3.5" />
                    Transferred Leads
                  </button>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setShowLeadLegend(o => !o)}
                    title="What do the colored dots mean?"
                    className={`flex items-center justify-center w-7 h-7 rounded-full border transition-all ${showLeadLegend ? 'bg-blue-50 border-blue-300 text-blue-600' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300'}`}
                  >
                    <Icons.Info className="w-4 h-4" />
                  </button>
                  {showLeadLegend && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowLeadLegend(false)} />
                      <div className="absolute top-9 left-0 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl p-3 w-64 animate-in fade-in zoom-in-95 duration-150">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Dot Color Guide</p>
                        <ul className="space-y-2">
                          <li className="flex items-start gap-2">
                            <span className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
                            <span className="text-xs text-slate-600"><span className="font-bold text-slate-800">Red</span> — Site Visit Booked</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                            <span className="text-xs text-slate-600"><span className="font-bold text-slate-800">Green</span> — Responded after follow-up</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]"></span>
                            <span className="text-xs text-slate-600"><span className="font-bold text-slate-800">Purple</span> — Replied to a campaign</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="mt-1 flex-shrink-0 w-2 h-2 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></span>
                            <span className="text-xs text-slate-600"><span className="font-bold text-slate-800">Amber</span> — Referral lead</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]"></span>
                            <span className="text-xs text-slate-600"><span className="font-bold text-slate-800">Cyan</span> — Auto-transferred</span>
                          </li>
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
            <div className={`grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 p-4 sm:p-6 shrink-0 overflow-x-auto pb-4 custom-scrollbar ${selectedLead ? 'hidden lg:grid' : 'grid'}`}>
              <div className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-current/10 shadow-sm flex-shrink-0 bg-slate-100 text-slate-600`}>
                <span className="text-[9px] sm:text-[10px] font-bold uppercase opacity-60 tracking-wider leading-none block">Results</span>
                <span className="text-lg sm:text-xl font-black block leading-none mt-1.5">{stats.total}</span>
              </div>
              {[
                { label: 'Hot', val: stats.hot, color: 'bg-red-50 text-red-600', key: 'hot' },
                { label: 'Warm', val: stats.warm, color: 'bg-orange-50 text-orange-600', key: 'warm' },
                { label: 'Cold', val: stats.cold, color: 'bg-blue-50 text-blue-600', key: 'cold' },
                { label: 'No Remarks', val: stats.noRemarks, color: 'bg-yellow-50 text-yellow-700', key: 'no-remarks' },
                { label: 'Responded', val: stats.responded, color: 'bg-green-50 text-green-700', key: 'responded' },
                { label: 'Qualified Lead', val: stats.qualified, color: 'bg-emerald-50 text-emerald-600', key: 'qualified' }
              ].map((stat) => (
                <button key={stat.key} onClick={() => handleStatusFilterClick(stat.key as any)} className={`${stat.color} p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-current/10 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-95 text-left flex-shrink-0 ${filters.statusFilter === stat.key ? 'ring-2 ring-current/40 ring-offset-2 scale-[1.02] shadow-md' : 'opacity-80'}`}><span className="text-[9px] sm:text-[10px] font-bold uppercase opacity-60 tracking-wider leading-none block whitespace-nowrap">{stat.label}{filters.statusFilter === stat.key && <span className="ml-1 inline-block">✓</span>}</span><span className="text-lg sm:text-xl font-black block leading-none mt-1.5">{stat.val}</span></button>
              ))}
            </div>

            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row p-4 sm:p-6 pt-0 gap-4 sm:gap-6 relative">
              <div className={`flex-1 overflow-y-auto bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm transition-all flex flex-col ${selectedLead ? 'hidden lg:flex' : 'flex'}`}>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full min-w-full sm:min-w-[950px]">
                    <thead className="sticky top-0 bg-slate-50 border-b z-10">
                      <tr>
                        {isPickMode && (
                          <th className="px-4 py-3 w-10 text-center animate-in fade-in duration-300">
                            <Icons.Check className="w-4 h-4 text-slate-300 mx-auto" />
                          </th>
                        )}
                        <th className="px-4 sm:px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-left">Lead & Profession</th>
                        <th className="px-4 sm:px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-left hidden sm:table-cell">Program & Source</th>
                        <th className="px-4 sm:px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-left">Status & Pipeline</th>
                        <th className="px-4 sm:px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-left hidden lg:table-cell">AI assistant</th>
                        <th className="px-4 sm:px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-left hidden xl:table-cell">Activity & Remarks</th>
                        <th className="px-4 sm:px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-left hidden md:table-cell">Assigned To</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredLeads.length === 0 ? (
                        <tr><td colSpan={isPickMode ? 7 : 6} className="px-6 py-12 text-center text-slate-400 italic text-sm">No matching leads found</td></tr>
                      ) : (
                        paginatedLeads.map(lead => {
                          const latestRemark = getLatestRemark(lead.remarks);
                          return (
                          <tr key={lead._id} onClick={() => openLeadDetails(lead._id)} className={`hover:bg-slate-50 cursor-pointer transition-colors ${selectedLead?._id === lead._id ? 'bg-blue-50/50' : ''} ${selectedLeadIds.has(lead._id) ? 'bg-indigo-50/40' : ''} ${groupPickIds.has(lead._id) ? 'bg-violet-50/50' : ''}`}>
                            {isPickMode && (
                              <td className="px-4 py-4 text-center animate-in fade-in duration-300" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isGroupMode ? groupPickIds.has(lead._id) : selectedLeadIds.has(lead._id)}
                                  onChange={() => (isGroupMode ? toggleGroupPick(lead._id) : toggleLeadSelection(lead._id))}
                                  className={`w-4 h-4 rounded border-slate-300 focus:ring-2 cursor-pointer ${isGroupMode ? 'text-violet-600 focus:ring-violet-500' : 'text-blue-600 focus:ring-blue-500'}`}
                                />
                              </td>
                            )}
                            <td className="px-4 sm:px-6 py-4">
                              <div className="font-bold text-slate-800 flex items-center gap-2"><span className="truncate max-w-[150px]">{lead.userName}</span>{lead.demoBooked && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" title="Demo Booked"></span>}{lead.respondedAfterFollowUp && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" title="Responded"></span>}{(lead.campaignHistory || []).some(c => c.repliedAt) && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]" title={`Replied to campaign: ${[...(lead.campaignHistory || [])].reverse().find(c => c.repliedAt)?.campaignName || ''}`}></span>}{(lead.leadfrom || '').toLowerCase() === 'referral' && <span className="flex-shrink-0 w-2 h-2 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" title="Referral"></span>}{(lead.autoReassignHistory || []).length > 0 && (() => { const h = lead.autoReassignHistory![lead.autoReassignHistory!.length - 1]; return <span className="flex-shrink-0 w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]" title={`Auto-transferred${h?.from ? ` from ${h.from}` : ''}${h?.to ? ` → ${h.to}` : ''}${h?.reason ? ` (${h.reason})` : ''}`}></span>; })()}</div>
                              <div className="text-xs text-slate-500 flex items-center gap-2">
                                <span>{lead.userNumber}</span>
                                <span
                                  role="button"
                                  title="Open in WhatsApp"
                                  onClick={(e) => { e.stopPropagation(); const num = (lead.userNumber || '').replace(/\D/g, ''); if (num) window.open(`https://wa.me/${num}`, '_blank', 'noopener'); }}
                                  className="text-green-500 hover:text-green-600 cursor-pointer"
                                >
                                  <Icons.WhatsApp className="w-4 h-4" />
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-1">Created: {formatDateTime(lead.datecreated)}</div>
                              {lead.profession && <div className="text-[10px] font-semibold text-blue-600 uppercase mt-1 opacity-70 truncate max-w-[120px]">{lead.profession}</div>}
                            </td>
                            <td className="px-4 sm:px-6 py-4 hidden sm:table-cell">
                              <div className="text-sm font-semibold text-slate-700 truncate max-w-[150px]">{lead.course || 'General'}</div>
                              <div className="flex items-center gap-2 mt-1"><span className="text-[10px] text-slate-400 font-bold uppercase">{lead.programType || 'N/A'}</span><span className="text-slate-300">•</span><span className="text-[10px] text-slate-500 italic truncate max-w-[80px]">{lead.leadfrom}</span></div>
                              <LeadGroupChips groups={groupsByLeadId.get(lead._id) ?? []} onOpen={openGroupPopup} />
                              {lead.referralCode && (
                                <ReferralCodeChip code={lead.referralCode} onOpen={() => openReferralPopupByCode(lead.referralCode!, lead.referredBy)} />
                              )}
                            </td>
                            <td className="px-4 sm:px-6 py-4"><div className="flex flex-col gap-1.5 items-start"><span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight ${lead.status.toLowerCase() === 'hot' ? 'bg-red-100 text-red-700' : lead.status.toLowerCase() === 'warm' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{lead.status}</span><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px] font-bold border border-slate-200 uppercase whitespace-nowrap">{lead.pipeline}</span></div></td>
                            
                            {/* REACTIVE AI CELL */}
                            <td className="px-4 sm:px-6 py-4 hidden lg:table-cell">
                              <AIAnalysisCell lead={lead} onOpenAssistant={openAssistantForLead} />
                            </td>

                            <td className="px-4 sm:px-6 py-4 hidden xl:table-cell"><div className="flex flex-col gap-1"><div className="text-[10px] text-slate-400 font-medium">Added: {formatDateTime(lead.datecreated)}</div>{latestRemark && <div className="text-[10px] text-slate-500">Latest: {formatDateTime(latestRemark.timestamp)}{latestRemark.addedBy ? ` by ${latestRemark.addedBy}` : ''}</div>}<div className="flex items-center gap-2"><span className={`flex items-center gap-1 text-[10px] font-black uppercase ${lead.remarks.length > 0 ? 'text-blue-600' : 'text-slate-300'}`}><Icons.Plus className="w-3 h-3" /> {lead.remarks.length} Remarks</span>{latestRemark && (<div className="relative group/remark"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /><div className="absolute left-0 bottom-full mb-2 hidden group-hover/remark:block w-52 p-2 bg-slate-800 text-white text-[9px] rounded-lg shadow-xl z-30"><p className="font-black uppercase text-blue-400 mb-1 border-b border-white/10 pb-1">Latest Remark</p><p className="line-clamp-2">{latestRemark.remark}</p><p className="mt-1 text-blue-200">{formatDateTime(latestRemark.timestamp)}{latestRemark.addedBy ? ` by ${latestRemark.addedBy}` : ''}</p></div></div>)}</div></div></td>
                            <td className="px-4 sm:px-6 py-4 text-sm font-medium text-slate-600 hidden md:table-cell"><div className="flex items-center gap-2">{lead.assignedto ? (<><div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200 uppercase shrink-0">{lead.assignedto.charAt(0)}</div><span className="truncate max-w-[80px]">{lead.assignedto}</span></>) : (<span className="text-slate-300 italic text-xs">Unassigned</span>)}</div></td>
                          </tr>
                        )})
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination controls — only shown when not searching/filtering */}
                {!isSearchOrFilterActive && totalPages > 1 && (
                  <div className="shrink-0 sticky bottom-0 bg-white border-t border-slate-100 px-4 sm:px-6 py-3 flex items-center justify-between z-10">
                    <span className="text-xs text-slate-500 font-medium">
                      Showing&nbsp;
                      <span className="font-bold text-slate-700">
                        {(currentPage - 1) * LEADS_PER_PAGE + 1}–{Math.min(currentPage * LEADS_PER_PAGE, leadsTotal)}
                      </span>
                      &nbsp;of&nbsp;
                      <span className="font-bold text-slate-700">{leadsTotal}</span>
                      &nbsp;leads
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        ← Prev
                      </button>
                      <span className="text-xs font-black text-slate-700 px-2 tabular-nums">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {selectedLead && (
                <div className="w-full lg:w-96 lg:shrink-0 h-full">
                  <LeadDetails lead={selectedLead} users={users} currentUserRole={currentUser?.role} onUpdate={(l) => { const norm = normalizeLead(l); setLeads(prev => prev.map(p => p._id === norm._id ? norm : p)); setSelectedLead(norm); }} onDelete={handleDeleteLead} onEdit={(l) => { setEditingLead(l); setIsEditModalOpen(true); }} onClose={() => setSelectedLead(null)} />
                </div>
              )}
            </div>
          </>
        ) : currentView === 'notes' ? (
          <NotesView currentUser={currentUser} />
        ) : currentView === 'daily-report' ? (
          <DailyReportView currentUser={currentUser} />
        ) : currentView === 'weekly-ai-report' ? (
          <WeeklyAIReportView currentUser={currentUser} />
        ) : currentView === 'user-management' ? (
          <UserManagementView />
        ) : currentView === 'hr-portal' ? (
          <HrPortalView currentUser={currentUser} />
        ) : currentView === 'review-meeting' ? (
          <ReviewMeetingView />
        ) : currentView === 'cowork' ? (
          <CoworkView isAdmin={currentUser?.role === 'admin'} />
        ) : currentView === 'sales-training' ? (
          <SalesTrainingView currentUser={currentUser} />
        ) : currentView === 'google-analytics' ? (
          <GoogleAnalyticsView />
        ) : currentView === 'group-chat' ? (
          <GroupChatView currentUser={currentUser} />
        ) : currentView === 'bulk-msg' ? (
          <BulkMsgView currentUser={currentUser} />
        ) : currentView === 'release-notes' ? (
          <ReleaseNotesView />
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div><h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Follow-up Dashboard</h3><p className="text-sm text-slate-500">Reminders categorized by assigned staff member.</p></div>
              <div className="bg-blue-600 text-white px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-lg self-start sm:self-auto">{remindersList.length} Reminders</div>
            </div>

            {remindersList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 sm:py-32 text-slate-400"><Icons.Calendar className="w-16 h-16 sm:w-20 sm:h-20 opacity-10 mb-6" /><p className="text-lg sm:text-xl font-bold">No active reminders</p><p className="text-sm opacity-60">Follow-ups set by staff will appear here.</p></div>
            ) : (
              <div className="space-y-8 sm:space-y-12 pb-10">
                {(Object.entries(categorizedReminders) as [string, Lead[]][]).map(([staff, staffLeads]) => (
                  <div key={staff} className="space-y-4">
                    <div className="flex items-center gap-3 border-b border-slate-200 pb-2"><div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center font-black text-xs uppercase">{staff.charAt(0)}</div><h4 className="text-base sm:text-lg font-black text-slate-800 uppercase tracking-tight truncate">{staff}</h4><span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-[10px] font-black">{staffLeads.length}</span></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {staffLeads.map(lead => {
                        const diff = getDaysRemaining(parseMongoDate(lead.reminder));
                        return (
                          <div key={lead._id} onClick={() => { setCurrentView('dashboard'); openLeadDetails(lead._id); }} className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col group cursor-pointer overflow-hidden">
                            <div className="p-4 sm:p-5 flex-1">
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">{lead.userName.charAt(0)}</div>
                                  <div className="overflow-hidden">
                                    <h4 className="font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors text-sm sm:text-base">{lead.userName}</h4>
                                    <p className="text-[10px] text-slate-500 font-black flex items-center gap-2">
                                      <span>{lead.userNumber}</span>
                                      <span
                                        role="button"
                                        title="Open in WhatsApp"
                                        onClick={(e) => { e.stopPropagation(); const num = (lead.userNumber || '').replace(/\D/g, ''); if (num) window.open(`https://wa.me/${num}`, '_blank', 'noopener'); }}
                                        className="text-green-500 hover:text-green-600 cursor-pointer"
                                      >
                                        <Icons.WhatsApp className="w-4 h-4" />
                                      </span>
                                    </p>
                                  </div>
                                </div>
                                <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ${diff.color}`}>{diff.text}</span>
                              </div>
                              <div className="space-y-3 text-left">
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                  <Icons.Calendar className="w-4 h-4 text-slate-400" />
                                  <span className="font-bold">{new Date(parseMongoDate(lead.reminder)).toLocaleDateString()}</span>
                                  <span className="text-slate-400 hidden sm:inline">at</span>
                                  <span className="font-bold hidden sm:inline">{new Date(parseMongoDate(lead.reminder)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                  <Icons.Settings className="w-4 h-4 text-slate-400" />
                                  <span className="truncate font-semibold text-slate-700">{lead.course || 'General Enquiry'}</span>
                                </div>
                              </div>
                            </div>
                            <div className="p-3 sm:p-4 border-t bg-slate-50 flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 group-hover:text-blue-700 flex items-center gap-1">Open History <Icons.Plus className="w-3 h-3 rotate-45" /></span>
                              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => { const currentVal = lead.reminder ? new Date(parseMongoDate(lead.reminder)).toISOString().slice(0, 16) : ''; const newDate = prompt('Update Follow-up Date (YYYY-MM-DDTHH:MM)', currentVal); if (newDate) handleUpdateReminder(lead._id, newDate); }} className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-slate-800 transition-colors border border-transparent hover:border-slate-200"><Icons.Edit className="w-4 h-4" /></button>
                                <button onClick={() => { if (confirm('Clear this reminder?')) handleUpdateReminder(lead._id, null); }} className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-red-500 transition-colors border border-transparent hover:border-red-100"><Icons.Trash className="w-4 h-4" /></button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <MessageModal isOpen={isMessageModalOpen} onClose={() => { setIsMessageModalOpen(false); exitMessagingMode(); }} recipientCount={selectedLeadIds.size} onSend={handleSendMessage} isSending={isSendingMessage} campaignNames={campaignNames} />
      <FilterPanel isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} filters={filters} users={users} onFilterChange={setFilters} onReset={() => setFilters(initialFilters)} campaignNames={campaignNames} />
      <LeadFormModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSubmit={handleAddLead} title="Register New Lead" />
      <LeadFormModal key={editingLead?._id ?? 'edit'} isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingLead(null); }} onSubmit={async (d) => { try { setLoading(true); await apiService.editLeadDetails(d); setIsEditModalOpen(false); await fetchDashboardMeta(); await fetchLeadsForCurrentView({ forceLoadAll: true }); } finally { setLoading(false); } }} initialData={editingLead} title="Edit Lead Details" currentUserRole={currentUser?.role} />
      <LeadAssistantChatbot leads={leads} openLeadId={assistantOpenLeadId} onClose={() => setAssistantOpenLeadId(null)} />

      {isGroupsPanelOpen && (
        <GroupsPanel
          groups={leadGroups}
          onOpen={openGroupPopup}
          onNewGroup={() => { setIsGroupsPanelOpen(false); setCurrentView('dashboard'); setIsGroupMode(true); }}
          onClose={() => setIsGroupsPanelOpen(false)}
        />
      )}

      <CreateGroupModal
        open={isCreateGroupOpen}
        selectedCount={groupPickIds.size}
        busy={isCreatingGroup}
        onCreate={handleCreateGroup}
        onClose={() => setIsCreateGroupOpen(false)}
      />

      {activeGroup && (
        <LeadGroupPopup
          group={activeGroup}
          members={groupMembers}
          loading={isLoadingGroupMembers}
          canManage={canManageGroup(activeGroup)}
          onClose={() => setOpenGroupId(null)}
          onRename={handleRenameGroup}
          onRecolor={handleRecolorGroup}
          onDelete={handleDeleteGroup}
          onRemoveMember={handleRemoveGroupMember}
          onAddMembers={handleAddGroupMembers}
          onOpenLead={(id) => { setOpenGroupId(null); openLeadDetails(id); }}
        />
      )}

      {isReferralPanelOpen && (
        <ReferralGroupsPanel
          groups={referralGroups}
          onOpen={openReferralPopup}
          onClose={() => setIsReferralPanelOpen(false)}
        />
      )}

      {openReferralGroup && (
        <ReferralGroupPopup
          group={openReferralGroup}
          members={referralMembers}
          loading={isLoadingReferralMembers}
          onClose={() => setOpenReferralGroup(null)}
          onOpenLead={(id) => { setOpenReferralGroup(null); openLeadDetails(id); }}
        />
      )}
    </div>
  );
};

export default App;

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { FilterState } from '../App';
import { Lead, Installment, User } from '../types';
import { apiService } from '../services/api';
import FilterPanel from './FilterPanel';
import { Icons } from './Icons';
import { isConvertedStage } from '../utils/pipeline';

interface FeesViewProps {
    leads: Lead[];
    users: User[];
    currentUser?: User | null;
    searchQuery?: string;
    onSearchQueryChange?: React.Dispatch<React.SetStateAction<string>>;
    onUpdateLead: (lead: Lead) => void;
    initialLeadId?: string | null;
}

interface MonthStats {
    month: string;
    year: number;
    monthName: string;
    billed: number;
    paid: number;
    pending: number;
    installmentCount: number;
}

const FeesView: React.FC<FeesViewProps> = ({ leads, users, currentUser, onUpdateLead, initialLeadId, searchQuery }) => {
    const initialFilters: FilterState = {
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
    };

    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(initialLeadId ?? null);
    const [feesLeads, setFeesLeads] = useState<Lead[]>(leads);
    const [isFetchingFeesLeads, setIsFetchingFeesLeads] = useState(false);
    const feesRequestIdRef = useRef(0);
    const [billedAmount, setBilledAmount] = useState<string>('0');
    const [installments, setInstallments] = useState<Installment[]>([]);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isEditingInstallments, setIsEditingInstallments] = useState(false);
    const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false);
    const [filters, setFilters] = useState<FilterState>(initialFilters);

    const parseMongoDate = (date: any): string => {
        if (!date) return new Date().toISOString();
        if (typeof date === 'string') return date;
        if (date.$date) return date.$date;
        return new Date().toISOString();
    };

    useEffect(() => {
        const requestId = ++feesRequestIdRef.current;

        const fetchAllFeesLeads = async () => {
            try {
                setIsFetchingFeesLeads(true);

                const limit = 500; // backend caps this to 500
                let page = 1;
                let total = Number.POSITIVE_INFINITY;
                let all: Lead[] = [];

                while (all.length < total) {
                    const res = await apiService.queryLeads({
                        view: 'fees',
                        page,
                        limit,
                        includeStats: false,
                        mode: 'summary',
                        // Fetch all; we do filtering client-side in this view.
                        searchQuery: '',
                        filters: {},
                    });

                    if (requestId !== feesRequestIdRef.current) return;

                    if (!res?.success) break;

                    total = typeof res.total === 'number' ? res.total : all.length + res.leads.length;
                    all = all.concat(res.leads || []);

                    if (!res.leads || res.leads.length < limit) break;
                    page += 1;

                    // Safety guard against runaway pagination if backend total is inconsistent.
                    if (page > 200) break;
                }

                setFeesLeads(all);
            } catch (error) {
                console.error('Failed to fetch fees leads:', error);
                // Fall back to the leads passed from parent (may be partial).
                setFeesLeads(leads);
            } finally {
                if (requestId === feesRequestIdRef.current) setIsFetchingFeesLeads(false);
            }
        };

        void fetchAllFeesLeads();
    }, []);

    // Filter for enrolled students
    const enrolledLeads = feesLeads.filter(l => isConvertedStage(l.pipeline));
    const selectedLead = enrolledLeads.find(l => l._id === selectedLeadId);

    const filteredEnrolledLeads = useMemo(() => {
        return enrolledLeads.filter(lead => {
            const q = (searchQuery || '').trim().toLowerCase();
            const matchesSearch =
                q === '' ||
                (lead.userName || '').toLowerCase().includes(q) ||
                (lead.userNumber || '').toLowerCase().includes(q);
            const matchesCourse = filters.courses.length === 0 || (lead.course && filters.courses.some(c => c.toLowerCase() === lead.course?.toLowerCase()));
            const matchesStatus = filters.statuses.length === 0 || filters.statuses.some(s => s.toLowerCase() === (lead.status || '').toLowerCase());
            const matchesAssigned = filters.assignedUsers.length === 0 || (lead.assignedto && filters.assignedUsers.includes(lead.assignedto));
            const matchesProgram = filters.programTypes.length === 0 || (lead.programType && filters.programTypes.some(p => p.toLowerCase() === lead.programType?.toLowerCase()));
            const matchesSource = filters.sources.length === 0 || filters.sources.some(s => (lead.leadfrom || '').toLowerCase().includes(s.toLowerCase()));
            const matchesProfession = filters.professions.length === 0 || (lead.profession && filters.professions.some(p => p.toLowerCase() === lead.profession?.toLowerCase()));
            const matchesPipeline = filters.pipelines.length === 0 || filters.pipelines.some(p => p.toLowerCase() === (lead.pipeline || '').toLowerCase());

            const leadDate = new Date(parseMongoDate(lead.datecreated)).getTime();
            const matchesFromDate = !filters.fromDate || leadDate >= new Date(filters.fromDate).getTime();
            const matchesToDate = !filters.toDate || leadDate <= new Date(filters.toDate).getTime() + 86400000;

            return matchesSearch && matchesCourse && matchesStatus && matchesAssigned &&
                matchesProgram && matchesSource && matchesProfession && matchesPipeline &&
                matchesFromDate && matchesToDate;
        });
    }, [
        enrolledLeads,
        searchQuery,
        filters.courses,
        filters.programTypes,
        filters.professions,
        filters.sources,
        filters.statuses,
        filters.pipelines,
        filters.assignedUsers,
        filters.fromDate,
        filters.toDate
    ]);

    const hasActiveFilters = useMemo(() => {
        const { statusFilter, fromDate, toDate, courses, programTypes, professions, sources, statuses, pipelines, assignedUsers } = filters;
        const arrayFiltersActive =
            courses.length > 0 ||
            programTypes.length > 0 ||
            professions.length > 0 ||
            sources.length > 0 ||
            statuses.length > 0 ||
            pipelines.length > 0 ||
            assignedUsers.length > 0;
        return arrayFiltersActive || fromDate !== '' || toDate !== '' || statusFilter !== null;
    }, [filters]);

    // Sync state when selected lead changes
    useEffect(() => {
        if (selectedLead) {
            setBilledAmount(selectedLead.fees?.billedAmount?.toString() || '0');
            setInstallments(selectedLead.fees?.installments || []);
            setIsEditing(false);
            setIsEditingInstallments(false);
        }
    }, [selectedLead]);

    // Get month name from index
    const getMonthName = (monthIndex: number) => {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return months[monthIndex];
    };

    // Get months for dropdown
    const getMonths = () => {
        const currentYear = new Date().getFullYear();
        const months = [];

        // Current year months
        for (let i = 0; i < 12; i++) {
            months.push({
                value: i,
                label: `${getMonthName(i)} ${currentYear}`,
                year: currentYear
            });
        }

        // Previous year months
        for (let i = 0; i < 12; i++) {
            months.push({
                value: i,
                label: `${getMonthName(i)} ${currentYear - 1}`,
                year: currentYear - 1
            });
        }

        return months;
    };

    // Get years for dropdown
    const getYears = () => {
        const currentYear = new Date().getFullYear();
        return [
            { value: currentYear, label: currentYear.toString() },
            { value: currentYear - 1, label: (currentYear - 1).toString() }
        ];
    };

    // --- Calculate Monthly Statistics ---
    const calculateMonthlyStats = useMemo(() => {
        const stats: MonthStats[] = [];
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();

        // Calculate for current month and previous 5 months
        for (let i = 0; i < 6; i++) {
            const date = new Date(currentYear, currentMonth - i, 1);
            const month = date.getMonth();
            const year = date.getFullYear();
            const monthName = getMonthName(month);
            const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

            let monthBilled = 0;
            let monthPaid = 0;
            let monthPending = 0;
            let monthInstallmentCount = 0;

            // Calculate stats for each lead
            filteredEnrolledLeads.forEach(lead => {
                const leadBilled = lead.fees?.billedAmount || 0;
                const leadInstallments = lead.fees?.installments || [];

                // Filter installments for this month
                const monthInstallments = leadInstallments.filter(inst => {
                    if (!inst.dueDate) return false;

                    // Parse the due date
                    let dueDateStr;
                    if (typeof inst.dueDate === 'string') {
                        dueDateStr = inst.dueDate;
                    } else if (inst.dueDate?.$date) {
                        dueDateStr = inst.dueDate.$date;
                    } else {
                        return false;
                    }

                    const dueDate = new Date(dueDateStr);
                    if (isNaN(dueDate.getTime())) return false;

                    return dueDate.getFullYear() === year && dueDate.getMonth() === month;
                });

                // Calculate month totals
                monthInstallments.forEach(inst => {
                    const amount = Number(inst.amount) || 0;
                    monthInstallmentCount++;

                    if (inst.status === 'Paid') {
                        monthPaid += amount;
                    } else {
                        monthPending += amount;
                    }
                });

                // For billed amount, we need a different approach
                // Since billed amount is set once per lead, we need to attribute it to months
                // We'll attribute billed amount to the month of the first installment or lead creation
                if (leadInstallments.length > 0) {
                    // Get the first installment date
                    let firstInstDate;
                    const firstInst = leadInstallments[0];

                    if (typeof firstInst.dueDate === 'string') {
                        firstInstDate = new Date(firstInst.dueDate);
                    } else if (firstInst.dueDate?.$date) {
                        firstInstDate = new Date(firstInst.dueDate.$date);
                    } else if (lead.datecreated) {
                        // Fallback to lead creation date
                        firstInstDate = new Date(parseMongoDate(lead.datecreated));
                    }

                    if (firstInstDate && !isNaN(firstInstDate.getTime())) {
                        if (firstInstDate.getFullYear() === year && firstInstDate.getMonth() === month) {
                            monthBilled += leadBilled;
                        }
                    }
                } else if (lead.datecreated) {
                    // If no installments, use lead creation date
                    const createdDate = new Date(parseMongoDate(lead.datecreated));
                    if (createdDate.getFullYear() === year && createdDate.getMonth() === month) {
                        monthBilled += leadBilled;
                    }
                }
            });

            stats.push({
                month: monthKey,
                year,
                monthName: `${monthName} ${year}`,
                billed: monthBilled,
                paid: monthPaid,
                pending: monthPending,
                installmentCount: monthInstallmentCount
            });
        }

        return stats;
    }, [filteredEnrolledLeads]);

    // --- Calculate Selected Month Statistics ---
    const selectedMonthStats = useMemo(() => {
        const currentStats = calculateMonthlyStats.find(stat =>
            stat.year === selectedYear &&
            getMonthName(selectedMonth) === stat.monthName.split(' ')[0]
        );

        if (currentStats) return currentStats;

        // If not found in calculated stats, calculate on the fly
        let billed = 0;
        let paid = 0;
        let pending = 0;
        let installmentCount = 0;

        filteredEnrolledLeads.forEach(lead => {
            const leadBilled = lead.fees?.billedAmount || 0;
            const leadInstallments = lead.fees?.installments || [];

            // Filter installments for selected month
            const monthInstallments = leadInstallments.filter(inst => {
                if (!inst.dueDate) return false;

                let dueDateStr;
                if (typeof inst.dueDate === 'string') {
                    dueDateStr = inst.dueDate;
                } else if (inst.dueDate?.$date) {
                    dueDateStr = inst.dueDate.$date;
                } else {
                    return false;
                }

                const dueDate = new Date(dueDateStr);
                if (isNaN(dueDate.getTime())) return false;

                return dueDate.getFullYear() === selectedYear && dueDate.getMonth() === selectedMonth;
            });

            monthInstallments.forEach(inst => {
                const amount = Number(inst.amount) || 0;
                installmentCount++;

                if (inst.status === 'Paid') {
                    paid += amount;
                } else {
                    pending += amount;
                }
            });

            // Attribute billed amount
            if (leadInstallments.length > 0) {
                let firstInstDate;
                const firstInst = leadInstallments[0];

                if (typeof firstInst.dueDate === 'string') {
                    firstInstDate = new Date(firstInst.dueDate);
                } else if (firstInst.dueDate?.$date) {
                    firstInstDate = new Date(firstInst.dueDate.$date);
                } else if (lead.datecreated) {
                    firstInstDate = new Date(parseMongoDate(lead.datecreated));
                }

                if (firstInstDate && !isNaN(firstInstDate.getTime())) {
                    if (firstInstDate.getFullYear() === selectedYear && firstInstDate.getMonth() === selectedMonth) {
                        billed += leadBilled;
                    }
                }
            } else if (lead.datecreated) {
                const createdDate = new Date(parseMongoDate(lead.datecreated));
                if (createdDate.getFullYear() === selectedYear && createdDate.getMonth() === selectedMonth) {
                    billed += leadBilled;
                }
            }
        });

        return {
            month: `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`,
            year: selectedYear,
            monthName: `${getMonthName(selectedMonth)} ${selectedYear}`,
            billed,
            paid,
            pending,
            installmentCount
        };
    }, [filteredEnrolledLeads, selectedMonth, selectedYear, calculateMonthlyStats]);

    // --- Calculate Overall Totals ---
    const overallStats = useMemo(() => {
        let totalBilled = 0;
        let totalPaid = 0;
        let totalPending = 0;
        let totalInstallments = 0;

        filteredEnrolledLeads.forEach(lead => {
            const billed = lead.fees?.billedAmount || 0;
            const installments = lead.fees?.installments || [];

            totalBilled += billed;
            totalInstallments += installments.length;

            installments.forEach(inst => {
                const amount = Number(inst.amount) || 0;
                if (inst.status === 'Paid') {
                    totalPaid += amount;
                }
            });
        });

        totalPending = totalBilled - totalPaid;

        return {
            billed: totalBilled,
            paid: totalPaid,
            pending: totalPending,
            installmentCount: totalInstallments
        };
    }, [filteredEnrolledLeads]);

    // --- Handlers for Sidebar ---

    const handleAddInstallment = () => {
        const nextNumber = installments.length > 0 ? Math.max(...installments.map(i => i.number)) + 1 : 1;
        setInstallments([
            ...installments,
            {
                number: nextNumber,
                dueDate: new Date().toISOString().split('T')[0],
                amount: 0,
                status: 'Pending'
            }
        ]);
        setIsEditingInstallments(true);
        setIsEditing(true);
    };

    const handleInstallmentChange = async (index: number, field: keyof Installment, value: any) => {
        const newInstallments = [...installments];
        newInstallments[index] = { ...newInstallments[index], [field]: value };
        setInstallments(newInstallments);

        // If status changed, persist immediately so backend reflects Paid status
        if (field === 'status') {
            if (!selectedLeadId) return;
            try {
                setLoading(true);
                const payload = {
                    billedAmount: parseFloat(billedAmount) || 0,
                    installments: newInstallments.map((inst, idx) => ({
                        ...inst,
                        number: idx + 1
                    }))
                };

                const response = await apiService.updateLeadFees(selectedLeadId, payload);
                if (response && response.lead) {
                    onUpdateLead(response.lead);
                    setFeesLeads(prev => {
                        const idx = prev.findIndex(l => l._id === response.lead._id);
                        if (idx === -1) return [response.lead, ...prev];
                        const copy = [...prev];
                        copy[idx] = response.lead;
                        return copy;
                    });
                    setIsEditing(false);
                    setIsEditingInstallments(false);
                } else {
                    // If API didn't return updated lead, still mark as not editing
                    setIsEditing(false);
                    setIsEditingInstallments(false);
                }
            } catch (error) {
                console.error('Failed to update installment status', error);
                alert('Failed to update installment status. Please try saving.');
                // keep editing state so user can retry
                setIsEditingInstallments(true);
                setIsEditing(true);
            } finally {
                setLoading(false);
            }
        } else {
            setIsEditingInstallments(true);
            setIsEditing(true);
        }
    };

    const handleDeleteInstallment = (index: number) => {
        setInstallments(installments.filter((_, i) => i !== index));
        setIsEditingInstallments(true);
        setIsEditing(true);
    };

    const handleSave = async () => {
        if (!selectedLeadId) return;

        // Don't save if nothing has changed
        if (!isEditing && !isEditingInstallments) return;

        try {
            setLoading(true);

            // Parse billedAmount to number, default to 0 if empty or invalid
            const parsedBilledAmount = parseFloat(billedAmount) || 0;

            const response = await apiService.updateLeadFees(selectedLeadId, {
                billedAmount: parsedBilledAmount,
                installments: installments.map((inst, idx) => ({
                    ...inst,
                    number: idx + 1 // Recalculate numbers after deletions
                }))
            });

            if (response && response.lead) {
                onUpdateLead(response.lead);
                setFeesLeads(prev => {
                    const idx = prev.findIndex(l => l._id === response.lead._id);
                    if (idx === -1) return [response.lead, ...prev];
                    const copy = [...prev];
                    copy[idx] = response.lead;
                    return copy;
                });
                setIsEditing(false);
                setIsEditingInstallments(false);
                alert('Fees updated successfully!');
            } else {
                alert('Fees updated, but could not refresh data automatically. Please reload.');
            }
        } catch (error) {
            console.error(error);
            alert('Failed to update fees.');
        } finally {
            setLoading(false);
        }
    };

    const parseDate = (date: any) => {
        if (!date) return '';
        if (typeof date === 'string') return date.split('T')[0];
        if (date.$date) return date.$date.split('T')[0];
        return '';
    };

    const formatDateTime = (dateValue: any) => {
        if (!dateValue) return '';
        const date = new Date(parseMongoDate(dateValue));
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleGenerateBill = async (index: number, sendEmail = false) => {
        if (!selectedLeadId) return;
        setGeneratingIndex(index);
        try {
            const response = await apiService.generateBill(selectedLeadId, index, sendEmail);

            // Update local installments state with billing info
            const updatedInstallments = installments.map((it, idx) => {
                if (idx === index) {
                    return {
                        ...it,
                        billGenerated: response.billGenerated ?? true,
                        billUrl: response.details?.billUrl || response.details?.billFile || it.billUrl,
                        billGeneratedAt: new Date().toISOString()
                    } as Installment;
                }
                return it;
            });

            setInstallments(updatedInstallments);

            // Notify parent to update lead in list
            if (selectedLead) {
                const updatedLead = {
                    ...selectedLead,
                    fees: {
                        ...(selectedLead.fees || {}),
                        billedAmount: response.totalBilledAmount ?? selectedLead.fees?.billedAmount,
                        installments: updatedInstallments
                    }
                } as Lead;
                onUpdateLead(updatedLead);
                setFeesLeads(prev => {
                    const idx = prev.findIndex(l => l._id === updatedLead._id);
                    if (idx === -1) return [updatedLead, ...prev];
                    const copy = [...prev];
                    copy[idx] = updatedLead;
                    return copy;
                });
            }

            if (response.details?.billUrl) {
                window.open(response.details.billUrl, '_blank', 'noopener');
            }

            alert(response.message || 'Bill generated');
        } catch (error) {
            console.error('Generate bill error', error);
            alert('Failed to generate bill');
        } finally {
            setGeneratingIndex(null);
        }
    };

    // --- Calculations for individual leads ---

    const getStats = (lead: Lead) => {
        const billed = lead.fees?.billedAmount || 0;
        const insts = lead.fees?.installments || [];

        const paid = insts.filter(i => i.status === 'Paid').reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
        const pending = billed - paid;
        const pendingInstallments = insts.filter(i => i.status === 'Pending');
        const overdueInstallments = pendingInstallments.filter(inst => {
            if (!inst?.dueDate || inst.amount <= 0) return false;

            // normalize dueDate
            const dueDateValue =
                typeof inst.dueDate === "string"
                    ? inst.dueDate
                    : inst.dueDate.$date;

            const dueDate = new Date(dueDateValue);
            if (isNaN(dueDate.getTime())) return false;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            return dueDate < today;
        });

        return {
            billed,
            paid,
            pending,
            count: insts.length,
            pendingCount: pendingInstallments.length,
            overdueCount: overdueInstallments.length
        };
    };

    // Stats for the currently selected lead (for the sidebar)
    const currentPaid = installments.filter(i => i.status === 'Paid').reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const currentBalance = (parseFloat(billedAmount) || 0) - currentPaid;
    const pendingInstallments = installments.filter(i => i.status === 'Pending');
    const overdueInstallments = pendingInstallments.filter(inst => {
        if (!inst.dueDate) return false;
        const dueDate = new Date(parseMongoDate(inst.dueDate));
        return dueDate < new Date() && inst.amount > 0;
    });

    // Billed amount is locked for non-admins once a value has been saved
    const isBilledAmountLocked =
        currentUser?.role !== 'admin' && (selectedLead?.fees?.billedAmount ?? 0) > 0;

    // Handle billed amount change
    const handleBilledAmountChange = (value: string) => {
        if (isBilledAmountLocked) return;
        // Allow empty string (for deletion) or numeric values
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            setBilledAmount(value);
            setIsEditing(true);
        }
    };

    // Reset to original values
    const handleCancel = () => {
        if (selectedLead) {
            setBilledAmount(selectedLead.fees?.billedAmount?.toString() || '0');
            setInstallments(selectedLead.fees?.installments || []);
            setIsEditing(false);
            setIsEditingInstallments(false);
        }
    };

    return (
        <div className="flex h-full bg-slate-50 overflow-hidden relative">

            {/* Main Table Area */}
            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${selectedLeadId ? 'mr-0 md:mr-[400px]' : ''}`}>
                <div className="p-6 pb-2">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-black text-slate-800">Fee Management</h1>
                            <p className="text-slate-500 text-sm">
                                Overview of student fees and payment status.
                                {isFetchingFeesLeads && <span className="ml-2 text-xs font-bold text-slate-400">Syncing…</span>}
                            </p>
                        </div>
                        <button
                            onClick={() => setIsFilterOpen(true)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${hasActiveFilters ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                            <Icons.Filter className="w-4 h-4" />
                            <span className="hidden sm:inline">Filters</span>
                            {hasActiveFilters && <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>}
                        </button>
                    </div>

                    {/* Monthly Stats Summary */}
                    <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setIsSummaryCollapsed(prev => !prev)}
                            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                        >
                            <div>
                                <h2 className="text-sm font-bold text-slate-800">Fee Summary Overview</h2>
                                <p className="text-xs text-slate-500">Overall, selected month, and previous month stats.</p>
                            </div>
                            <div className="flex items-center gap-2 text-slate-500">
                                <span className="text-xs font-bold">{isSummaryCollapsed ? 'Show' : 'Hide'}</span>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className={`w-4 h-4 transition-transform ${isSummaryCollapsed ? '' : 'rotate-180'}`}
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="m6 9 6 6 6-6" />
                                </svg>
                            </div>
                        </button>

                        {!isSummaryCollapsed && (
                            <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-4 gap-4">
                                {/* Overall Summary */}
                                {/* <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-bold text-slate-700">Overall Summary</h3>
                                        <span className="text-xs text-slate-400">All Time</span>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Billed</div>
                                            <div className="text-lg font-black text-slate-800">₹{overallStats.billed.toLocaleString()}</div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <div className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Paid</div>
                                                <div className="text-sm font-bold text-green-600">₹{overallStats.paid.toLocaleString()}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Pending</div>
                                                <div className="text-lg font-bold text-red-600">₹{overallStats.pending.toLocaleString()}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div> */}

                                {/* Selected Month Summary */}
                                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-bold text-slate-700">Selected Month</h3>
                                        <div className="flex gap-1">
                                            <select
                                                value={selectedMonth}
                                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                                className="text-xs bg-slate-50 border-none rounded focus:ring-1 focus:ring-blue-500 py-1 px-1.5"
                                            >
                                                {getMonths().map((month, idx) => (
                                                    <option key={idx} value={month.value}>{month.label}</option>
                                                ))}
                                            </select>
                                            <select
                                                value={selectedYear}
                                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                                className="text-xs bg-slate-50 border-none rounded focus:ring-1 focus:ring-blue-500 py-1 px-1.5"
                                            >
                                                {getYears().map((year, idx) => (
                                                    <option key={idx} value={year.value}>{year.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Month Billed</div>
                                            <div className="text-lg font-black text-slate-800">₹{selectedMonthStats.billed.toLocaleString()}</div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <div className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Paid</div>
                                                <div className="text-sm font-bold text-green-600">₹{selectedMonthStats.paid.toLocaleString()}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Pending</div>
                                                <div className="text-sm font-bold text-red-600">₹{selectedMonthStats.pending.toLocaleString()}</div>
                                            </div>
                                        </div>
                                        <div className="pt-2 border-t border-slate-100">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Installments</div>
                                            <div className="text-sm font-bold text-slate-600">{selectedMonthStats.installmentCount}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Previous Months Summary */}
                                <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                                    <h3 className="text-sm font-bold text-slate-700 mb-3">Previous Months</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="py-2 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Month</th>
                                                    <th className="py-2 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Billed</th>
                                                    <th className="py-2 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Paid</th>
                                                    <th className="py-2 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Pending</th>
                                                    <th className="py-2 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Inst.</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {calculateMonthlyStats.slice(1, 4).map((stat, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50">
                                                        <td className="py-2 px-3">
                                                            <div className="text-xs font-medium text-slate-700">{stat.monthName}</div>
                                                        </td>
                                                        <td className="py-2 px-3">
                                                            <div className="text-xs font-bold text-slate-800">₹{stat.billed.toLocaleString()}</div>
                                                        </td>
                                                        <td className="py-2 px-3">
                                                            <div className="text-xs font-bold text-green-600">₹{stat.paid.toLocaleString()}</div>
                                                        </td>
                                                        <td className="py-2 px-3">
                                                            <div className="text-xs font-bold text-red-600">₹{stat.pending.toLocaleString()}</div>
                                                        </td>
                                                        <td className="py-2 px-3">
                                                            <div className="text-xs font-bold text-slate-600">{stat.installmentCount}</div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 pt-4 flex-1 overflow-hidden">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col overflow-hidden">
                        <div className="overflow-auto flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">Student</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">Course</th>
                                        <th className="px6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">Billed Amount</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">Paid</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">Pending</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 text-center">Installments</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredEnrolledLeads.map(lead => {
                                        const stats = getStats(lead);
                                        return (
                                            <tr key={lead._id} className={`hover:bg-slate-50 transition-colors ${selectedLeadId === lead._id ? 'bg-blue-50/50' : ''}`}>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-sm">{lead.userName}</div>
                                                        <div className="text-xs text-slate-500 flex items-center gap-2">
                                                            <span>{lead.userNumber}</span>
                                                            <span role="button" title="Open in WhatsApp" onClick={(e) => { e.stopPropagation(); const num = (lead.userNumber || '').replace(/\D/g, ''); if (num) window.open(`https://wa.me/${num}`, '_blank', 'noopener'); }} className="text-green-500 hover:text-green-600 cursor-pointer">
                                                                <Icons.WhatsApp className="w-4 h-4" />
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded">
                                                        {lead.course}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-mono font-medium text-slate-700">₹{stats.billed.toLocaleString()}</td>
                                                <td className="px-6 py-4 font-mono font-medium text-green-600">₹{stats.paid.toLocaleString()}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="font-mono font-medium text-red-600">₹{stats.pending.toLocaleString()}</span>
                                                        {stats.overdueCount > 0 && (
                                                            <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded">
                                                                {stats.overdueCount} overdue
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                                            {stats.count}
                                                        </span>
                                                        {stats.pendingCount > 0 && (
                                                            <span className="text-xs text-amber-600">{stats.pendingCount} pending</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setSelectedLeadId(lead._id); }}
                                                        className="text-blue-600 hover:text-blue-700 text-xs font-bold hover:underline"
                                                    >
                                                        Manage Fees
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredEnrolledLeads.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">No enrolled students found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sidebar Overlay (Mobile) */}
            {selectedLeadId && (
                <div
                    className="md:hidden fixed inset-0 bg-black/20 z-20 backdrop-blur-sm"
                    onClick={() => setSelectedLeadId(null)}
                />
            )}

            {/* Right Sidebar Panel */}
            <div className={`fixed inset-y-0 right-0 w-full md:w-[450px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-30 flex flex-col border-l border-slate-200 ${selectedLeadId ? 'translate-x-0' : 'translate-x-full'}`}>
                {selectedLead ? (
                    <>
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h2 className="text-lg font-black text-slate-800">{selectedLead.userName}</h2>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                        <span>{selectedLead.userNumber}</span>
                                        <span role="button" title="Open in WhatsApp" onClick={(e) => { e.stopPropagation(); const num = (selectedLead.userNumber || '').replace(/\D/g, ''); if (num) window.open(`https://wa.me/${num}`, '_blank', 'noopener'); }} className="text-green-500 hover:text-green-600 cursor-pointer">
                                            <Icons.WhatsApp className="w-4 h-4" />
                                        </span>
                                        <span>•</span>
                                        <span>{selectedLead.course}</span>
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${selectedLead.status === 'Hot' ? 'bg-red-100 text-red-700' :
                                            selectedLead.status === 'Warm' ? 'bg-amber-100 text-amber-700' :
                                                'bg-blue-100 text-blue-700'}`}>
                                            {selectedLead.status}
                                        </span>
                                    </div>
                            </div>
                            <button onClick={() => setSelectedLeadId(null)} className="text-slate-400 hover:text-slate-600">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-6">
                            {/* Lead Details Section */}
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <h3 className="text-sm font-bold text-slate-700 mb-3">Lead Details</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] text-slate-400 mb-0.5">Lead Source</label>
                                        <p className="text-xs font-medium text-slate-700">{selectedLead.leadfrom || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-400 mb-0.5">Assigned To</label>
                                        <p className="text-xs font-medium text-slate-700">{selectedLead.assignedto || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-400 mb-0.5">Plan Duration</label>
                                        <p className="text-xs font-medium text-slate-700">{selectedLead.programType || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-400 mb-0.5">Profession</label>
                                        <p className="text-xs font-medium text-slate-700">{selectedLead.profession || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-400 mb-0.5">Location</label>
                                        <p className="text-xs font-medium text-slate-700">{selectedLead.location || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-400 mb-0.5">Pipeline</label>
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${isConvertedStage(selectedLead.pipeline) ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {selectedLead.pipeline}
                                        </span>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-[10px] text-slate-400 mb-0.5">Date Created</label>
                                        <p className="text-xs font-medium text-slate-700">
                                            {formatDateTime(selectedLead.datecreated)}
                                        </p>
                                    </div>
                                    {selectedLead.remarks && selectedLead.remarks.length > 0 && (
                                        <div className="col-span-2">
                                            <label className="block text-[10px] text-slate-400 mb-0.5">Latest Remark</label>
                                            <p className="text-xs font-medium text-slate-700 bg-slate-100 p-2 rounded">
                                                {selectedLead.remarks[selectedLead.remarks.length - 1].remark}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Summary Cards */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className={`p-3 rounded-xl border ${isBilledAmountLocked ? 'bg-slate-100 border-slate-200' : 'bg-slate-50 border-slate-100'}`}>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        Billed Amount
                                        {isBilledAmountLocked && (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                        )}
                                    </label>
                                    <div className="flex items-center mt-1">
                                        <span className="text-slate-400 mr-1">₹</span>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={billedAmount}
                                            onChange={(e) => handleBilledAmountChange(e.target.value)}
                                            onFocus={(e) => !isBilledAmountLocked && e.target.select()}
                                            readOnly={isBilledAmountLocked}
                                            className={`bg-transparent border-none p-0 w-full font-black text-slate-800 text-lg focus:ring-0 ${isBilledAmountLocked ? 'cursor-not-allowed' : ''}`}
                                            placeholder="0"
                                            title={isBilledAmountLocked ? 'Only admins can change the billed amount once set' : undefined}
                                        />
                                    </div>
                                </div>
                                <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                                    <label className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Paid</label>
                                    <div className="mt-1 font-black text-green-700 text-lg">₹{currentPaid.toLocaleString()}</div>
                                </div>
                                <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                                    <label className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Pending</label>
                                    <div className="mt-1 font-black text-red-700 text-lg">₹{currentBalance.toLocaleString()}</div>
                                </div>
                            </div>

                            {/* Overdue Alert */}
                            {overdueInstallments.length > 0 && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-xs font-bold text-red-700">
                                            {overdueInstallments.length} installment(s) overdue
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Installments List */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-700">Installments</h3>
                                        <p className="text-xs text-slate-500">
                                            {installments.length} total • {pendingInstallments.length} pending
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        {isEditing && (
                                            <button
                                                onClick={handleCancel}
                                                className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded hover:bg-slate-300 transition"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                        <button onClick={handleAddInstallment} className="text-xs bg-slate-800 text-white px-2 py-1 rounded hover:bg-slate-700 transition">
                                            + Add Installment
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                    {installments.map((inst, index) => {
                                        const isOverdue = inst.status === 'Pending' && inst.dueDate && new Date(parseMongoDate(inst.dueDate)) < new Date() && inst.amount > 0;
                                        return (
                                            <div key={index} className={`p-3 rounded-xl border ${isOverdue ? 'border-red-300 bg-red-50/50' : 'border-slate-200'} bg-white shadow-sm hover:border-blue-300 transition-colors group`}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-slate-400">#{index + 1}</span>
                                                        {isOverdue && (
                                                            <span className="text-xs font-bold text-red-500 bg-red-100 px-2 py-0.5 rounded">
                                                                Overdue
                                                            </span>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteInstallment(index)}
                                                        className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M3 6h18" />
                                                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                                        </svg>
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3 mb-2">
                                                    <div>
                                                        <label className="block text-[10px] text-slate-400 mb-0.5">Due Date</label>
                                                        <input
                                                            type="date"
                                                            value={parseDate(inst.dueDate)}
                                                            onChange={(e) => handleInstallmentChange(index, 'dueDate', e.target.value)}
                                                            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border-none rounded focus:ring-1 focus:ring-blue-500 py-1 px-1.5"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] text-slate-400 mb-0.5">Amount</label>
                                                        <input
                                                            type="number"
                                                            value={inst.amount}
                                                            onChange={(e) => handleInstallmentChange(index, 'amount', Number(e.target.value))}
                                                            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border-none rounded focus:ring-1 focus:ring-blue-500 py-1 px-1.5"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] text-slate-400 mb-0.5">Status</label>
                                                    <select
                                                        value={inst.status}
                                                        onChange={(e) => handleInstallmentChange(index, 'status', e.target.value)}
                                                        className={`w-full text-xs font-bold py-1 px-1.5 rounded border-none focus:ring-1 ${inst.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}
                                                    >
                                                        <option value="Pending">Pending</option>
                                                        <option value="Paid">Paid</option>
                                                    </select>
                                                </div>
                                                <div className="mt-2 flex items-center justify-between gap-2">
                                                    {inst.billGenerated ? (
                                                        inst.billUrl ? (
                                                            <a onClick={(e)=>e.stopPropagation()} href={inst.billUrl} target="_blank" rel="noopener" className="text-xs text-blue-600 font-bold">View Bill</a>
                                                        ) : (
                                                            <span className="text-xs text-slate-500">Bill generated</span>
                                                        )
                                                    ) : (
                                                        // Only show Generate Bill when installment is marked as Paid
                                                        inst.status === 'Paid' ? (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleGenerateBill(index, false); }}
                                                                disabled={generatingIndex === index}
                                                                className={`text-xs px-2 py-1 rounded font-bold ${generatingIndex === index ? 'bg-slate-300 text-slate-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                                                            >
                                                                {generatingIndex === index ? 'Generating...' : 'Generate Bill'}
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs text-slate-400"> </span>
                                                        )
                                                    )}
                                                    {inst.billGenerated && inst.billGeneratedAt && (
                                                        <div className="text-xs text-slate-400">{formatDateTime(String(inst.billGeneratedAt))}</div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {installments.length === 0 && (
                                        <div className="text-center py-6 text-slate-400 text-xs italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                            No installments added. Click "Add Installment" to create one.
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                            <button
                                onClick={handleSave}
                                disabled={loading || !isEditing}
                                className={`w-full py-2.5 font-bold rounded-lg shadow-md transition-all ${isEditing ? 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg active:scale-95' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
                            >
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center p-6 text-center text-slate-400">
                        <p>Select a student to manage fees</p>
                    </div>
                )}
            </div>

            <FilterPanel
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                filters={filters}
                users={users}
                onFilterChange={setFilters}
                onReset={() => setFilters(initialFilters)}
            />

        </div>
    );
};

export default FeesView;


import { Lead, DashboardResponse, CombinedCertificateResult, LeadsQueryResponse, DashboardMetaResponse, FeesStatsResponse, TodayUserActivityResponse, MonthlyReportResponse, PipelineDistributionResponse, UserTargetsResponse, GA4AcquisitionResponse, GA4SessionSourceResponse, GA4OrganicLandingPagesResponse, GA4EngagementOverviewResponse, TempLead, LeadGroup, LeadGroupsResponse, LeadGroupResponse, LeadGroupMembersResponse, LeadGroupSearchResponse, ReferralGroup, ReferralGroupsResponse, ReferralGroupMembersResponse } from '../types';
import type { CoworkingSpace, Booking } from '../cowork/types';

// https://ask4people.in/crmapi

// const BASE_URL = 'http://localhost:4000'

// const BASE_URL = 'https://ask4people.in/crmapi';

const BASE_URL = 'https://betaspace.botkovai.in/crmbeta'

const getHeaders = () => {
  const token = localStorage.getItem('crm_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

export const apiService = {
  async login(credentials: any) {
    const response = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    return response.json();
  },

  async fetchDashboardData(username: string): Promise<DashboardResponse> {
    const response = await fetch(`${BASE_URL}/dashboard`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ username }),
    });
    if (!response.ok) throw new Error('Session expired or unauthorized');
    return response.json();
  },

  async fetchDashboardMeta(username: string): Promise<DashboardMetaResponse> {
    const response = await fetch(`${BASE_URL}/dashboard`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ username, includeLeads: false }),
    });
    if (!response.ok) throw new Error('Session expired or unauthorized');
    return response.json();
  },

  async queryLeads(params: {
    view: string;
    searchQuery?: string;
    filters?: Record<string, any>;
    page?: number;
    limit?: number;
    includeStats?: boolean;
    mode?: 'summary' | 'full';
  }): Promise<LeadsQueryResponse> {
    const response = await fetch(`${BASE_URL}/leads/query`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });
    if (!response.ok) throw new Error('Failed to query leads');
    return response.json();
  },

  async fetchLeadById(leadId: string): Promise<{ success: boolean; lead: Lead }> {
    const response = await fetch(`${BASE_URL}/leads/${leadId}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch lead');
    return response.json();
  },

  async fetchFeesStats(params: { searchQuery?: string; filters?: Record<string, any> }): Promise<FeesStatsResponse> {
    const response = await fetch(`${BASE_URL}/fees/stats`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });
    if (!response.ok) throw new Error('Failed to fetch fees stats');
    return response.json();
  },

  async getSettings(): Promise<{ success: boolean; autoAssign: boolean }> {
    const response = await fetch(`${BASE_URL}/settings`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return response.json();
  },

  async updateSettings(autoAssign: boolean): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${BASE_URL}/settings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ autoAssign }),
    });
    return response.json();
  },

  async getAutoAssignStaffs(): Promise<{ success: boolean; staffs: string[]; excludedStaffs: string[] }> {
    const response = await fetch(`${BASE_URL}/settings/auto-assign-staffs`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return response.json();
  },

  async updateAutoAssignStaffs(excludedStaffs: string[]): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${BASE_URL}/settings/auto-assign-staffs`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ excludedStaffs }),
    });
    if (!response.ok) throw new Error('Failed to update auto-assign staffs');
    return response.json();
  },

  async triggerAutoAssign(leadId: string): Promise<{ success: boolean; lead: Lead }> {
    const response = await fetch(`${BASE_URL}/leads/auto-assign/${leadId}`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return response.json();
  },

  async distributeLeads(): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${BASE_URL}/leads/distribute`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return response.json();
  },

  async addLead(leadData: Partial<Lead>): Promise<{ success: boolean; user: Lead }> {
    const response = await fetch(`${BASE_URL}/add`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(leadData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add lead');
    }
    return response.json();
  },

  async updateLead(leadData: Partial<Lead>): Promise<Lead> {
    const response = await fetch(`${BASE_URL}/Users`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(leadData),
    });
    if (!response.ok) throw new Error('Failed to update lead');
    return response.json();
  },

  async editLeadDetails(leadData: Partial<Lead>): Promise<Lead> {
    const response = await fetch(`${BASE_URL}/Users/edit`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(leadData),
    });
    if (!response.ok) throw new Error('Failed to edit lead details');
    return response.json();
  },

  async sendLeadToMeta(leadId: string): Promise<{ success: boolean; message: string; lead: Lead }> {
    const response = await fetch(`${BASE_URL}/leads/${leadId}/send-to-meta`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return response.json();
  },

  async deleteLead(id: string): Promise<{ success: boolean }> {
    const response = await fetch(`${BASE_URL}/leads/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete lead');
    return response.json();
  },

  async addRemark(leadId: string, remark: string): Promise<Lead> {
    const username = JSON.parse(localStorage.getItem('crm_user') || '{}')?.username;
    const remarkWithUser = username ? `(${username}'s remark) ${remark}` : remark;
    const response = await fetch(`${BASE_URL}/Users/remarks`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ _id: leadId, remark: remarkWithUser }),
    });
    if (!response.ok) throw new Error('Failed to add remark');
    return response.json();
  },

  async deleteRemark(leadId: string, remarkId: string): Promise<Lead> {
    const response = await fetch(`${BASE_URL}/Users/remarks`, {
      method: 'DELETE',
      headers: getHeaders(),
      body: JSON.stringify({ _id: leadId, remarkId }),
    });
    if (!response.ok) throw new Error('Failed to delete remark');
    return response.json();
  },


  async sendMessageToLeads(
    leadIds: string[],
    message: string,
    campaignName?: string
  ): Promise<{ success: boolean; message: string }> {
    const couns_number = JSON.parse(localStorage.getItem("crm_user") || "{}")?.userNumber;
    const response = await fetch(`${BASE_URL}/leads/send-message`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ leadIds, message, couns_number, ...(campaignName ? { campaignName } : {}) }),
    });

    if (!response.ok) throw new Error('Failed to send messages');

    const result = await response.json();

    return {
      success: result.success,
      message: result.data?.message ?? 'Messages sent'
    };
  },

  async getCampaignNames(): Promise<string[]> {
    try {
      const response = await fetch(`${BASE_URL}/leads/campaigns`, {
        method: 'GET',
        headers: getHeaders(),
      });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data.campaigns) ? data.campaigns : [];
    } catch (err) {
      console.error('Failed to fetch campaign names', err);
      return [];
    }
  },

  async sendBulkCampaign(
    contacts: { userName?: string; userNumber: string }[],
    message: string,
    campaignName: string
  ): Promise<{ success: boolean; total: number; sent: number; failed: number; skippedExisting: number; message: string }> {
    const response = await fetch(`${BASE_URL}/leads/bulk-campaign`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ contacts, message, campaignName }),
    });

    if (!response.ok) throw new Error('Failed to send bulk campaign');

    const result = await response.json();
    const inner = result.data || {};

    return {
      success: !!result.success,
      total: inner.total ?? contacts.length,
      sent: inner.success ?? 0,
      failed: inner.failed ?? 0,
      skippedExisting: inner.skippedExisting ?? 0,
      message: inner.message ?? inner.error ?? 'Bulk campaign sent',
    };
  },

  async getTempCampaignLeads(): Promise<TempLead[]> {
    try {
      const response = await fetch(`${BASE_URL}/leads/temp-campaigns`, {
        method: 'GET',
        headers: getHeaders(),
      });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data.tempLeads) ? data.tempLeads : [];
    } catch (err) {
      console.error('Failed to fetch temp campaign leads', err);
      return [];
    }
  },
  async updateDateScheduled(leadId: string, date_scheduled: string | null): Promise<any> {
    const response = await fetch(`${BASE_URL}/leads/${leadId}/date-scheduled`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ date_scheduled }),
    });
    if (!response.ok) throw new Error('Failed to update date scheduled');
    return response.json();
  },

  async updateLeadFees(leadId: string, fees: any): Promise<any> {
    const response = await fetch(`${BASE_URL}/leads/${leadId}/fees`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(fees),
    });
    if (!response.ok) throw new Error('Failed to update fees');
    return response.json();
  },

  async generateBill(leadId: string, installmentIndex: number, sendEmail = false): Promise<any> {
    const response = await fetch(`${BASE_URL}/leads/${leadId}/generate-bill`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ installmentIndex, sendEmail }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to generate bill');
    }

    return response.json();
  },

  async saveInternCertificateDetails(data: Record<string, any>): Promise<any> {
    const response = await fetch(`${BASE_URL}/intern/certificate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to save intern certificate details');
    }
    return response.json();
  },

  async generateInternCertificate(userNumber: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/intern/certificate/generate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ userNumber }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to generate intern certificate');
    }
    return response.json();
  },

  async printAllCertificates(userNumber: string): Promise<CombinedCertificateResult> {
    const response = await fetch(`${BASE_URL}/intern/certificates/print-all`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ userNumber }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to generate combined certificate');
    }
    return response.json();
  },

  async generateCombinedInternCertificate(userNumber: string): Promise<CombinedCertificateResult> {
    const endpoints = [
      `${BASE_URL}/intern/certificate/generate-combined`,
      `${BASE_URL}/intern/certificate/combined`,
    ];

    let lastError: any = null;

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ userNumber }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          lastError = new Error(err.message || 'Failed to generate combined certificate');
          continue;
        }

        return response.json();
      } catch (error: any) {
        lastError = error;
      }
    }

    throw lastError || new Error('Failed to generate combined certificate');
  },

  async saveCourseCertificateDetails(data: Record<string, any>): Promise<any> {
    const response = await fetch(`${BASE_URL}/course/certificate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to save course certificate details');
    }
    return response.json();
  },

  async generateCourseCompletionCertificate(userNumber: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/course/certificate/generate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ userNumber }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to generate course certificate');
    }
    return response.json();
  },

  async printAllCourseCertificates(userNumber: string): Promise<CombinedCertificateResult> {
    const response = await fetch(`${BASE_URL}/course/certificates/print-all`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ userNumber }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to generate combined course certificate');
    }
    return response.json();
  },

  async saveIdCardDetails(data: Record<string, any>): Promise<any> {
    const response = await fetch(`${BASE_URL}/idcard/details`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to save ID card details');
    }
    return response.json();
  },

  async uploadIdCardPhoto(leadId: string, file: File): Promise<{ success: boolean; url?: string; message?: string }> {
    const token = localStorage.getItem('crm_token');
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('leadId', leadId);
    const response = await fetch(`${BASE_URL}/idcard/photo`, {
      method: 'POST',
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to upload photo');
    }
    return response.json();
  },

  async generateIdCard(_id: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/idcard/generate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ _id }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to generate ID card');
    }
    return response.json();
  },

  async generateBatchCode(chatId: string, internIndex?: number): Promise<any> {
    const body: Record<string, any> = {};
    if (internIndex !== undefined) body.internIndex = internIndex;
    const response = await fetch(`${BASE_URL}/intern/${chatId}/generate-batch`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to generate batch code');
    }
    return response.json();
  },

  async analyzeLead(leadId: string): Promise<{ success: boolean; analysis: any }> {
    const response = await fetch(`${BASE_URL}/leads/analyze/${leadId}`, {
      method: 'POST',
      headers: getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to analyze lead');
    }

    const data = await response.json();
    return { success: true, analysis: data.analysis || data };
  },

  async summarizeLeadConversation(
    leadId: string
  ): Promise<{ success: boolean; lead?: Lead; alreadySummarized?: boolean; skipped?: boolean; message?: string }> {
    const response = await fetch(`${BASE_URL}/leads/${leadId}/summarize-conversation`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to summarize conversation');
    }
    return response.json();
  },

  async askLeadAssistant(payload: { lead: Lead; question: string; history: { role: 'user' | 'assistant'; content: string }[]; }): Promise<{ success: boolean; reply: any }> {
    const response = await fetch(`${BASE_URL}/leads/assistant/ask`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to get assistant reply');
    }

    const data = await response.json();
    return { success: true, reply: data.reply || data };
  },
  async fetchTodayUserActivityReport(): Promise<TodayUserActivityResponse> {
    const response = await fetch(`${BASE_URL}/reports/today-user-activity`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch daily report');
    return response.json();
  },

  async fetchUserActivityReport(date: string): Promise<TodayUserActivityResponse> {
    const response = await fetch(`${BASE_URL}/reports/user-activity?date=${encodeURIComponent(date)}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch daily report');
    return response.json();
  },

  async fetchMonthlyActivityReport(year: number, month: number): Promise<MonthlyReportResponse> {
    const response = await fetch(`${BASE_URL}/reports/monthly-activity?year=${year}&month=${month}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch monthly report');
    return response.json();
  },

  async fetchMonthlyPipelineBySource(year: number, month: number, assignedto?: string): Promise<PipelineDistributionResponse> {
    const params = new URLSearchParams({ year: String(year), month: String(month) });
    if (assignedto) {
      params.append('assignedto', assignedto);
      params.append('counsellor', assignedto);
      params.append('username', assignedto);
    }
    const response = await fetch(`${BASE_URL}/reports/monthly-pipeline-by-source?${params}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch pipeline by source report');
    return response.json();
  },

  async fetchMonthlyPipelineByCourse(year: number, month: number, assignedto?: string): Promise<PipelineDistributionResponse> {
    const params = new URLSearchParams({ year: String(year), month: String(month) });
    if (assignedto) {
      params.append('assignedto', assignedto);
      params.append('counsellor', assignedto);
      params.append('username', assignedto);
    }
    const response = await fetch(`${BASE_URL}/reports/monthly-pipeline-by-course?${params}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch pipeline by course report');
    return response.json();
  },

  async fetchMonthlyPipelineQualifiedVsResponded(year: number, month: number, assignedto?: string): Promise<PipelineDistributionResponse> {
    const params = new URLSearchParams({ year: String(year), month: String(month) });
    if (assignedto) {
      params.append('assignedto', assignedto);
      params.append('counsellor', assignedto);
      params.append('username', assignedto);
    }
    const response = await fetch(`${BASE_URL}/reports/monthly-pipeline-qualified-vs-responded?${params}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch qualified vs responded report');
    return response.json();
  },

  async fetchUserTargets(year: number, month: number): Promise<UserTargetsResponse> {
    const response = await fetch(`${BASE_URL}/reports/user-targets?year=${year}&month=${month}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch user targets');
    return response.json();
  },

  async setUserTarget(username: string, year: number, month: number, target: number): Promise<{ success: boolean }> {
    const response = await fetch(`${BASE_URL}/reports/user-targets`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ username, year, month, target }),
    });
    if (!response.ok) throw new Error('Failed to set user target');
    return response.json();
  },

  async getStaff(): Promise<{ success: boolean; staff: any[] }> {
    const response = await fetch(`${BASE_URL}/staff`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch staff');
    return response.json();
  },

  async createStaff(data: { username: string; useremail: string; userNumber: string; password: string; role: string }): Promise<{ success: boolean; user: any; message?: string }> {
    const response = await fetch(`${BASE_URL}/staff`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to create user');
    return result;
  },

  async updateStaff(id: string, data: Partial<{ username: string; useremail: string; userNumber: string; password: string; role: string }>): Promise<{ success: boolean; user: any; message?: string }> {
    const response = await fetch(`${BASE_URL}/staff/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to update user');
    return result;
  },

  async deleteStaff(id: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${BASE_URL}/staff/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to delete user');
    return result;
  },

  async fetchWeeklyAIReports(): Promise<{ success: boolean; reports: any[] }> {
    const response = await fetch(`${BASE_URL}/reports/weekly-ai`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch weekly AI reports');
    return response.json();
  },

  async fetchMinminiSummary(weekStart?: string, weekEnd?: string, refresh?: boolean): Promise<any> {
    const params = new URLSearchParams();
    if (weekStart) params.set('weekStart', weekStart);
    if (weekEnd) params.set('weekEnd', weekEnd);
    if (refresh) params.set('refresh', 'true');
    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`${BASE_URL}/reports/whatsapp-minmini${qs}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch Minmini summary');
    return response.json();
  },

  async fetchMonthlyAIReports(): Promise<{ success: boolean; reports: any[] }> {
    const response = await fetch(`${BASE_URL}/reports/monthly-ai`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch monthly AI reports');
    return response.json();
  },

  async fetchMonthlyMinminiSummary(monthStart?: string, monthEnd?: string, refresh?: boolean): Promise<any> {
    const params = new URLSearchParams();
    if (monthStart) params.set('monthStart', monthStart);
    if (monthEnd) params.set('monthEnd', monthEnd);
    if (refresh) params.set('refresh', 'true');
    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`${BASE_URL}/reports/monthly-whatsapp-minmini${qs}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch Monthly Minmini summary');
    return response.json();
  },

  async fetchGA4Acquisition(startDate?: string, endDate?: string): Promise<GA4AcquisitionResponse> {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`${BASE_URL}/analytics/acquisition${qs}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch GA4 acquisition report');
    return response.json();
  },

  async fetchGA4SessionSource(startDate?: string, endDate?: string): Promise<GA4SessionSourceResponse> {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`${BASE_URL}/analytics/session-source${qs}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch GA4 session source report');
    return response.json();
  },

  async fetchGA4OrganicLandingPages(startDate?: string, endDate?: string): Promise<GA4OrganicLandingPagesResponse> {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`${BASE_URL}/analytics/organic-landing-pages${qs}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch GA4 organic landing pages report');
    return response.json();
  },

  async fetchGA4EngagementOverview(startDate?: string, endDate?: string): Promise<GA4EngagementOverviewResponse> {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`${BASE_URL}/analytics/engagement-overview${qs}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch GA4 engagement overview report');
    return response.json();
  },

  // ─── Lead Groups ──────────────────────────────────────────────────────────
  // ── Co-working spaces & seat bookings ──
  async getCoworkSpaces(): Promise<CoworkingSpace[]> {
    const response = await fetch(`${BASE_URL}/cowork/spaces`, { headers: getHeaders() });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Failed to load spaces');
    return data.spaces;
  },

  async saveCoworkSpace(space: CoworkingSpace): Promise<CoworkingSpace> {
    const response = await fetch(`${BASE_URL}/cowork/spaces/${encodeURIComponent(space.id)}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(space),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Failed to save space');
    return data.space;
  },

  async deleteCoworkSpace(spaceId: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/cowork/spaces/${encodeURIComponent(spaceId)}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Failed to delete space');
  },

  async getCoworkBookings(): Promise<Booking[]> {
    const response = await fetch(`${BASE_URL}/cowork/bookings`, { headers: getHeaders() });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Failed to load bookings');
    return data.bookings;
  },

  async createCoworkBooking(booking: Booking): Promise<Booking> {
    const response = await fetch(`${BASE_URL}/cowork/bookings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(booking),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Failed to create booking');
    return data.booking;
  },

  async updateCoworkBookingStatus(bookingId: string, status: 'checked_in' | 'completed' | 'cancelled'): Promise<Booking> {
    const response = await fetch(`${BASE_URL}/cowork/bookings/${encodeURIComponent(bookingId)}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Failed to update booking');
    return data.booking;
  },

  async getLeadGroups(): Promise<LeadGroup[]> {
    try {
      const response = await fetch(`${BASE_URL}/lead-groups`, {
        method: 'GET',
        headers: getHeaders(),
      });
      if (!response.ok) return [];
      const data: LeadGroupsResponse = await response.json();
      return Array.isArray(data.groups) ? data.groups : [];
    } catch (err) {
      console.error('Failed to fetch lead groups', err);
      return [];
    }
  },

  async createLeadGroup(name: string, color: string, memberIds: string[]): Promise<LeadGroup> {
    const response = await fetch(`${BASE_URL}/lead-groups`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, color, memberIds }),
    });
    const result: LeadGroupResponse = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'Failed to create group');
    return result.group;
  },

  async updateLeadGroup(id: string, changes: { name?: string; color?: string }): Promise<LeadGroup> {
    const response = await fetch(`${BASE_URL}/lead-groups/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(changes),
    });
    const result: LeadGroupResponse = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'Failed to update group');
    return result.group;
  },

  async deleteLeadGroup(id: string): Promise<{ success: boolean }> {
    const response = await fetch(`${BASE_URL}/lead-groups/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.message || 'Failed to delete group');
    return result;
  },

  async updateLeadGroupMembers(id: string, changes: { add?: string[]; remove?: string[] }): Promise<LeadGroup> {
    const response = await fetch(`${BASE_URL}/lead-groups/${id}/members`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(changes),
    });
    const result: LeadGroupResponse = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'Failed to update group members');
    return result.group;
  },

  async getLeadGroupMembers(id: string): Promise<LeadGroupMembersResponse['members']> {
    const response = await fetch(`${BASE_URL}/lead-groups/${id}/members`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch group members');
    const data: LeadGroupMembersResponse = await response.json();
    return Array.isArray(data.members) ? data.members : [];
  },

  async searchLeadsForGroup(q: string): Promise<LeadGroupSearchResponse['leads']> {
    try {
      const response = await fetch(`${BASE_URL}/lead-groups/search/leads?q=${encodeURIComponent(q)}`, {
        method: 'GET',
        headers: getHeaders(),
      });
      if (!response.ok) return [];
      const data: LeadGroupSearchResponse = await response.json();
      return Array.isArray(data.leads) ? data.leads : [];
    } catch (err) {
      console.error('Failed to search leads for group', err);
      return [];
    }
  },

  // ─── External Referral Groups ────────────────────────────────────────────
  async getReferralGroups(): Promise<ReferralGroup[]> {
    try {
      const response = await fetch(`${BASE_URL}/external/referral/groups`, {
        method: 'GET',
        headers: getHeaders(),
      });
      if (!response.ok) return [];
      const data: ReferralGroupsResponse = await response.json();
      return Array.isArray(data.groups) ? data.groups : [];
    } catch (err) {
      console.error('Failed to fetch referral groups', err);
      return [];
    }
  },

  async getReferralGroupMembers(code: string): Promise<ReferralGroupMembersResponse['members']> {
    const response = await fetch(`${BASE_URL}/external/referral/groups/${encodeURIComponent(code)}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch referral group members');
    const data: ReferralGroupMembersResponse = await response.json();
    return Array.isArray(data.members) ? data.members : [];
  },

  // ── HR Portal ──────────────────────────────────────────────────────────
  async hrListEmployees(q = ''): Promise<any[]> {
    const url = q ? `${BASE_URL}/hr/employees?q=${encodeURIComponent(q)}` : `${BASE_URL}/hr/employees`;
    const response = await fetch(url, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to load employees');
    const data = await response.json();
    return Array.isArray(data.employees) ? data.employees : [];
  },

  async hrGetEmployee(id: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/hr/employees/${id}`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to load employee');
    const data = await response.json();
    return data.employee;
  },

  async hrCreateEmployee(payload: any): Promise<any> {
    const response = await fetch(`${BASE_URL}/hr/employees`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data.message || 'Failed to create employee');
    return data.employee;
  },

  async hrUpdateEmployee(id: string, payload: any): Promise<any> {
    const response = await fetch(`${BASE_URL}/hr/employees/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data.message || 'Failed to update employee');
    return data.employee;
  },

  async hrDeleteEmployee(id: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/hr/employees/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data.message || 'Failed to delete employee');
  },

  async hrUploadPhoto(id: string, file: File): Promise<any> {
    const token = localStorage.getItem('crm_token');
    const fd = new FormData();
    fd.append('photo', file);
    const response = await fetch(`${BASE_URL}/hr/employees/${id}/photo`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: fd,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data.message || 'Failed to upload photo');
    return data.photo;
  },

  async hrUploadDocument(id: string, file: File, docType: string, label = ''): Promise<any> {
    const token = localStorage.getItem('crm_token');
    const fd = new FormData();
    fd.append('document', file);
    fd.append('docType', docType);
    if (label) fd.append('label', label);
    const response = await fetch(`${BASE_URL}/hr/employees/${id}/documents`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: fd,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data.message || 'Failed to upload document');
    return data.document;
  },

  async hrDeleteDocument(id: string, docId: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/hr/employees/${id}/documents/${docId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data.message || 'Failed to delete document');
  },

  // Fetch a protected file (photo/document) as an object URL for viewing/downloading.
  async hrFetchFile(path: string): Promise<string> {
    const token = localStorage.getItem('crm_token');
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!response.ok) throw new Error('Failed to fetch file');
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  },

  // ── Review Meeting (read-only view over the daily manager check-in data) ──
  async getReviewMeetingDates(): Promise<any[]> {
    const response = await fetch(`${BASE_URL}/review-meetings/dates`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to load review meeting dates');
    const data = await response.json();
    return Array.isArray(data.dates) ? data.dates : [];
  },

  async getReviewMeetingsForDate(date?: string): Promise<{ date: string; checkIns: any[] }> {
    const url = date ? `${BASE_URL}/review-meetings?date=${encodeURIComponent(date)}` : `${BASE_URL}/review-meetings`;
    const response = await fetch(url, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to load review meeting');
    const data = await response.json();
    return { date: data.date, checkIns: Array.isArray(data.checkIns) ? data.checkIns : [] };
  },

  // Manually kicks off today's manager check-ins right now, instead of waiting
  // for the 5 PM cron. Safe to call more than once — counsellors who already
  // have a check-in started today are skipped by the backend, never restarted.
  async triggerReviewMeeting(): Promise<{ eligible: number; started: number; alreadyStarted: number; failed: number }> {
    const response = await fetch(`${BASE_URL}/review-meetings/trigger`, { method: 'POST', headers: getHeaders() });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Failed to trigger review meeting');
    return data;
  },

  // ── Sales Training (read-only view over the daily WhatsApp training quiz,
  // plus an AI assistant scoped to the signed-in counsellor's own sessions) ──
  async getSalesTrainingDates(): Promise<any[]> {
    const response = await fetch(`${BASE_URL}/training/dates`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to load training dates');
    const data = await response.json();
    return Array.isArray(data.dates) ? data.dates : [];
  },

  async getSalesTrainingSessions(date?: string): Promise<{ date: string; sessions: any[] }> {
    const url = date ? `${BASE_URL}/training/sessions?date=${encodeURIComponent(date)}` : `${BASE_URL}/training/sessions`;
    const response = await fetch(url, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to load training sessions');
    const data = await response.json();
    return { date: data.date, sessions: Array.isArray(data.sessions) ? data.sessions : [] };
  },

  async getSalesTrainingHistory(username?: string): Promise<any[]> {
    const url = username ? `${BASE_URL}/training/history?username=${encodeURIComponent(username)}` : `${BASE_URL}/training/history`;
    const response = await fetch(url, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to load training history');
    const data = await response.json();
    return Array.isArray(data.sessions) ? data.sessions : [];
  },

  async askTrainingAssistant(payload: { question: string; history: { role: 'user' | 'assistant'; content: string }[] }): Promise<{ success: boolean; reply: any }> {
    const response = await fetch(`${BASE_URL}/training/assistant/ask`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to get assistant reply');
    }

    return response.json();
  },

  // Manually kicks off today's WhatsApp sales training right now, instead of
  // waiting for the 3:30 PM cron. Safe to call more than once — counsellors
  // who already have a training session started today are skipped by the
  // backend, never resent.
  async triggerSalesTraining(): Promise<{ eligible: number; started: number; alreadyStarted: number; failed: number; disabled?: boolean }> {
    const response = await fetch(`${BASE_URL}/training/trigger`, { method: 'POST', headers: getHeaders() });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Failed to trigger sales training');
    return data;
  },
};

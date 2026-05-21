import { api } from 'lwc';
import LightningModal from 'lightning/modal';
import getEditSetupData from '@salesforce/apex/CKS_CTRL_DataMigrationRequest.getEditSetupData';
import getMigrationTypeMasters from '@salesforce/apex/CKS_CTRL_DataMigrationRequest.getMigrationTypeMasters';
import getScheduleSteps from '@salesforce/apex/CKS_CTRL_DataMigrationRequest.getScheduleSteps';

/**
 * LWC Modal for creating/editing/copying DataMigrationRequest__c records
 * Can be used:
 * 1. As a modal window from parent components
 * 2. As a Quick Action in Lightning Experience list views
 */
export async function openCreateModal(recordId = null, isCopy = false) {
    const result = await LightningModal.open({
        label: isCopy ? 'データ移行依頼コピー作成' : 'データ移行依頼新規作成',
        description: 'DataMigrationRequest__c record creation/edit',
        componentParams: {
            isCreate: !recordId || isCopy,
            isCopy: isCopy,
            recordId: recordId
        }
    });
    return result;
}

/** 各項目のJSキー → DataMigrationRequest__c項目APIの対応定義 */
const FIELD_API_MAP = {
    migrationAssociateCode:              'MigrationAssociateCode__c',
    existingContractCustomerNotes:       'ExistingContractCustomerNotes__c',
    individual:                          'Individual__c',
    masterGroupCustomerNotes:            'MasterGroupCustomerNotes__c',
    childGroup:                          'ChildGroup__c',
    user:                                'User__c',
    recordTypeMaster:                    'RecordTypeMaster__c',
    associateBranchMaster:               'AssociateBranchMaster__c',
    masterGroup:                         'MasterGroup__c',
    childGroupOnly:                      'ChildGroupOnly__c',
    household:                           'Household__c',
    individualOnly:                      'IndividualOnly__c',
    existingContract:                    'ExistingContract__c',
    clientClassificationMaster:          'ClientClassificationMaster__c',
    customerNotes:                       'CustomerNotes__c',
    relative:                            'Relative__c',
    accountContactRelation:              'AccountContactRelation__c',
    campaignOnly:                        'CampaignOnly__c',
    campaignMember:                      'CampaignMember__c',
    campaign:                            'Campaign__c',
    otherCompany:                        'OtherCompany__c',
    ownCompany:                          'OwnCompany__c',
    riderOwnCompany:                     'RiderOwnCompany__c',
    riderOtherCompany:                   'RiderOtherCompany__c',
    incomingChannelLeadsMaster:          'IncomingChannel_LeadsMaster__c',
    opportunity:                         'Opportunity__c',
    opportunityInsurancePolicyAssociation: 'OpportunityInsurancePolicyAssociation__c',
    designDocument:                      'DesignDocument__c',
    graspIntention:                      'GraspIntention__c',
    comparisonRecommendedProduct:        'ComparisonRecommendedProduct__c',
    bringOut:                            'BringOut__c',
    shipping:                            'Shipping__c',
    receipt:                             'Receipt__c',
    storage:                             'Storage__c',
    personalInformationHandling:         'PersonalInformationHandling__c',
    dailyReport:                         'DailyReport__c',
    contactClassMaster:                  'ContactClassMaster__c',
    event:                               'Event__c',
    texttemplate:                        'Texttemplate__c',
    task:                                'Task__c',
    attachmentDoc:                       'AttachmentDoc__c',
    planningTargetClassification:        'PlanningTargetClassification__c',
    agencyContactMaster:                 'AgencyContactMaster__c',
    targetManagement:                    'TargetManagement__c',
    contact:                             'Contact__c',
    status:                              'Status__c',
    product2:                            'Product2__c',
    productCommissionPercent:            'ProductCommissionPercent__c',
    analyticsPermissionMaster:           'AnalyticsPermissionMaster__c',
    contentDocumentLink:                 'ContentDocumentLink__c',
    contentVersion:                      'ContentVersion__c',
    cksDesignDocumentDivision:           'CKS_DesignDocumentDivision__c',
    otherRequest:                        'OtherRequest__c',
};

export default class CksDataMigrationRequestRecordCreateEdit extends LightningModal {
    @api isCreate = false;
    @api isCopy = false;
    @api recordId = null;
    @api launchContext = '';

    isLoading = false;
    isSaving = false;
    activeSections = ['A', 'B'];
    error;

    migrationTypeMasterId = null;
    migrationTypeMasterOptions = [];
    migrationTypeMasterList = [];
    targetObjectSet = new Set();
    migrationTypeDefaultCheck = false;
    migrationTypeUserChanged = false;
    sectionBVisible = true;
    scheduleStepsData = [];
    migrationDate = null;
    copySourceData;

    connectedCallback() {
        this.init();
    }

    async init() {
        this.isLoading = true;
        try {
            const masters = await getMigrationTypeMasters();
            this.migrationTypeMasterList = masters;
            this.migrationTypeMasterOptions = masters.map(m => ({
                label: m.StandardDays__c != null ? `${m.Name} [${m.StandardDays__c}営業日]` : m.Name,
                value: m.Id
            }));

            if (this.recordId) {
                const data = await getEditSetupData({ recordId: this.recordId });
                this.migrationTypeMasterId = data?.MigrationTypeLookUp__c || null;
                const raw = data?.MigrationTypeLookUp__r?.TargetObject__c || '';
                this.targetObjectSet = new Set(raw ? raw.split(';') : []);
                this.migrationDate = data?.MigrationDate__c || null;
                if (this.isCopy) {
                    this.copySourceData = data;
                }
                await this.fetchScheduleSteps();
            }
        } catch (error) {
            this.error = error;
        } finally {
            this.isLoading = false;
        }
    }

    get disabled() {
        return this.isSaving;
    }

    get formRecordId() {
        return this.isCreate ? null : this.recordId;
    }

    get headerLabel() {
        if (this.isCopy) {
            return 'データ移行依頼コピー作成';
        }
        return this.isCreate ? 'データ移行依頼新規作成' : 'データ移行依頼編集';
    }

    get fieldValues() {
        // 移行種別をユーザーが切り替えた場合は全モードでデフォルト値を適用
        if (this.migrationTypeUserChanged) {
            if (!this.migrationTypeDefaultCheck) {
                return {};
            }
            const defaults = {};
            const excluded = new Set(['migrationAssociateCode', 'otherRequest']);
            Object.entries(FIELD_API_MAP).forEach(([key, apiName]) => {
                if (!excluded.has(key) && this.targetObjectSet.has(apiName)) {
                    defaults[apiName] = true;
                }
            });
            return defaults;
        }
        if (this.isCopy && this.copySourceData) {
            const s = this.copySourceData;
            return {
                Name: s.Name,
                MigrationTypeLookUp__c: s.MigrationTypeLookUp__c,
                MigrationDate__c: s.MigrationDate__c,
                AssociateCode__c: s.AssociateCode__c,
                MigrationAssociateCode__c: s.MigrationAssociateCode__c,
                ExistingContractCustomerNotes__c: s.ExistingContractCustomerNotes__c,
                Individual__c: s.Individual__c,
                MasterGroupCustomerNotes__c: s.MasterGroupCustomerNotes__c,
                ChildGroup__c: s.ChildGroup__c,
                Household__c: s.Household__c,
                Relative__c: s.Relative__c,
                Campaign__c: s.Campaign__c,
                OtherCompany__c: s.OtherCompany__c,
                RiderOtherCompany__c: s.RiderOtherCompany__c,
                Opportunity__c: s.Opportunity__c,
                GraspIntention__c: s.GraspIntention__c,
                PersonalInformationHandling__c: s.PersonalInformationHandling__c,
                DailyReport__c: s.DailyReport__c,
                Event__c: s.Event__c,
                Task__c: s.Task__c,
                AttachmentDoc__c: s.AttachmentDoc__c,
                TargetManagement__c: s.TargetManagement__c,
                User__c: s.User__c,
                RecordTypeMaster__c: s.RecordTypeMaster__c,
                AssociateBranchMaster__c: s.AssociateBranchMaster__c,
                MasterGroup__c: s.MasterGroup__c,
                ChildGroupOnly__c: s.ChildGroupOnly__c,
                IndividualOnly__c: s.IndividualOnly__c,
                ExistingContract__c: s.ExistingContract__c,
                ClientClassificationMaster__c: s.ClientClassificationMaster__c,
                CustomerNotes__c: s.CustomerNotes__c,
                AccountContactRelation__c: s.AccountContactRelation__c,
                CampaignOnly__c: s.CampaignOnly__c,
                CampaignMember__c: s.CampaignMember__c,
                OwnCompany__c: s.OwnCompany__c,
                RiderOwnCompany__c: s.RiderOwnCompany__c,
                IncomingChannel_LeadsMaster__c: s.IncomingChannel_LeadsMaster__c,
                OpportunityInsurancePolicyAssociation__c: s.OpportunityInsurancePolicyAssociation__c,
                DesignDocument__c: s.DesignDocument__c,
                ComparisonRecommendedProduct__c: s.ComparisonRecommendedProduct__c,
                BringOut__c: s.BringOut__c,
                Shipping__c: s.Shipping__c,
                Receipt__c: s.Receipt__c,
                Storage__c: s.Storage__c,
                ContactClassMaster__c: s.ContactClassMaster__c,
                Texttemplate__c: s.Texttemplate__c,
                PlanningTargetClassification__c: s.PlanningTargetClassification__c,
                AgencyContactMaster__c: s.AgencyContactMaster__c,
                Contact__c: s.Contact__c,
                Status__c: s.Status__c,
                Product2__c: s.Product2__c,
                ProductCommissionPercent__c: s.ProductCommissionPercent__c,
                AnalyticsPermissionMaster__c: s.AnalyticsPermissionMaster__c,
                ContentDocumentLink__c: s.ContentDocumentLink__c,
                ContentVersion__c: s.ContentVersion__c,
                CKS_DesignDocumentDivision__c: s.CKS_DesignDocumentDivision__c,
                OtherRequest__c: s.OtherRequest__c
            };
        }
        // 編集モード: LDS が値をロードするため undefined を返す
        return {};
    }

    get visibility() {
        const visObj = {};
        Object.keys(FIELD_API_MAP).forEach((key) => {
            visObj[key] = this.targetObjectSet.has(FIELD_API_MAP[key]);
        });
        return visObj;
    }

    get hasVisibleTargetFields() {
        return Object.values(this.visibility).some(Boolean);
    }

    get modalContentClass() {
        if (this.isCreate && !this.isCopy && !this.hasVisibleTargetFields) {
            return 'modal-content modal-content_empty-targets';
        }
        return 'modal-content';
    }

    get modalBodyClass() {
        if (this.isCreate && !this.isCopy && !this.hasVisibleTargetFields) {
            return 'modal-body modal-body_empty-targets';
        }
        return 'modal-body';
    }

    get showBlankRowsInSectionB() {
        return !this.migrationTypeMasterId;
    }

    handleMigrationTypeChange(event) {
        const selectedId = event.detail.value;
        this.migrationTypeMasterId = selectedId;
        const master = this.migrationTypeMasterList.find(m => m.Id === selectedId);
        const raw = master?.TargetObject__c || '';
        this.migrationTypeDefaultCheck = master?.DefaultCheck__c || false;
        this.migrationTypeUserChanged = true;
        // 一度セクションBをアンマウントして再マウントし、fieldValuesの新しい値を確実に反映する
        this.sectionBVisible = false;
        this.targetObjectSet = new Set(raw ? raw.split(';') : []);
        this.fetchScheduleSteps();
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            this.sectionBVisible = true;
        }, 0);
    }

    handleDateChange(event) {
        this.migrationDate = event.detail.value;
        this.fetchScheduleSteps();
    }

    async fetchScheduleSteps() {
        if (!this.migrationTypeMasterId || !this.migrationDate) {
            this.scheduleStepsData = [];
            return;
        }
        try {
            this.scheduleStepsData = await getScheduleSteps({ migrationTypeMasterId: this.migrationTypeMasterId });
        } catch (error) {
            this.scheduleStepsData = [];
        }
    }

    get scheduleSteps() {
        const data = this.scheduleStepsData;
        const baseDate = this.parseDate(this.migrationDate);
        if (!data || data.length === 0 || !baseDate) {
            return { hasSchedule: false, steps: [] };
        }
        const clipDefault = 'clip-path:polygon(0 0, calc(100% - 18px) 0, 100% 50%, calc(100% - 18px) 100%, 0 100%, 18px 50%)';
        const clipFirst   = 'clip-path:polygon(0 0, calc(100% - 18px) 0, 100% 50%, calc(100% - 18px) 100%, 0 100%)';
        const chevronBase  = `flex:0 0 220px; min-height:88px; background:#d9e3ef; color:#2a3b4f; margin-right:2px; padding:10px 24px 10px 20px; ${clipDefault}`;
        const chevronFirst = `flex:0 0 220px; min-height:88px; background:#d9e3ef; color:#2a3b4f; margin-right:2px; padding:10px 24px 10px 14px; ${clipFirst}`;
        const chevronFinal = `flex:0 0 220px; min-height:88px; background:#c7d7e8; color:#2a3b4f; margin-right:2px; padding:10px 24px 10px 20px; ${clipDefault}`;
        const steps = data.map((item, index) => {
            const businessDaysBefore = item.RequiredDays__c || 0;
            const targetDate = this.subtractBusinessDays(baseDate, businessDaysBefore);
            const outputs = item.Output__c ? [{ id: `out_${index}_0`, text: item.Output__c }] : [];
            return {
                id: `schedule_${index}`,
                label: item.Name,
                deadlineLabel: `移行日-${businessDaysBefore}営業日`,
                dateLabel: this.formatDate(targetDate),
                outputs,
                hasOutputs: outputs.length > 0,
                itemClass: index === 0 ? 'schedule-chevron schedule-chevron-first' : 'schedule-chevron',
                itemStyle: index === 0 ? chevronFirst : chevronBase
            };
        });
        steps.push({
            id: `schedule_${steps.length}`,
            label: '移行実施',
            deadlineLabel: '移行日',
            dateLabel: this.formatDate(baseDate),
            outputs: [],
            hasOutputs: false,
            itemClass: 'schedule-chevron schedule-chevron-final',
            itemStyle: chevronFinal
        });
        return { hasSchedule: true, steps };
    }

    parseDate(value) {
        if (!value) return null;
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            return new Date(value.getFullYear(), value.getMonth(), value.getDate());
        }
        if (typeof value === 'string') {
            const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (match) {
                const [, year, month, day] = match;
                return new Date(Number(year), Number(month) - 1, Number(day));
            }
        }
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return null;
        return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }

    subtractBusinessDays(date, businessDays) {
        const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        let remain = businessDays;
        while (remain > 0) {
            result.setDate(result.getDate() - 1);
            const day = result.getDay();
            if (day !== 0 && day !== 6) remain -= 1;
        }
        return result;
    }

    formatDate(date) {
        if (!date) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}/${month}/${day}`;
    }

    handleClick(event) {
        if (event.target.name === 'cancel') {
            if (this.launchContext === 'listViewNew') {
                this.notifyListViewHost('cancel');
                return;
            }
            this.close({ status: 'cancel' });
        }
    }

    handleSubmit(event) {
        event.preventDefault();
        this.isSaving = true;

        const form = this.template.querySelector('lightning-record-edit-form');
        const fields = { ...event.detail.fields };

        if (this.isCopy && this.copySourceData) {
            Object.assign(fields, this.createCopyFields(), fields);
        }

        if (!this.isCreate) {
            fields.Id = this.recordId;
        }

        if (this.migrationTypeMasterId) {
            fields.MigrationTypeLookUp__c = this.migrationTypeMasterId;
        }

        form.submit(fields);
    }

    handleSuccess(event) {
        const newRecordId = event.detail.id;

        if (this.launchContext === 'listViewNew') {
            this.notifyListViewHost('success', newRecordId);
            return;
        }

        if (this.isCopy && newRecordId) {
            window.location.assign(`/lightning/r/DataMigrationRequest__c/${newRecordId}/view`);
            return;
        }

        this.isSaving = false;
        this.close({
            isSuccess: true,
            status: 'success',
            recordId: newRecordId
        });
    }

    handleError(event) {
        this.isSaving = false;
        this.error = event.detail;
    }

    createCopyFields() {
        const src = this.copySourceData || {};
        return {
            MigrationTypeLookUp__c: src.MigrationTypeLookUp__c,
            MigrationDate__c: src.MigrationDate__c,
            AssociateCode__c: src.AssociateCode__c,
            MigrationAssociateCode__c: src.MigrationAssociateCode__c,
            ExistingContractCustomerNotes__c: src.ExistingContractCustomerNotes__c,
            Individual__c: src.Individual__c,
            ChildGroup__c: src.ChildGroup__c,
            Household__c: src.Household__c,
            Relative__c: src.Relative__c,
            Campaign__c: src.Campaign__c,
            OtherCompany__c: src.OtherCompany__c,
            RiderOtherCompany__c: src.RiderOtherCompany__c,
            Opportunity__c: src.Opportunity__c,
            GraspIntention__c: src.GraspIntention__c,
            PersonalInformationHandling__c: src.PersonalInformationHandling__c,
            DailyReport__c: src.DailyReport__c,
            Event__c: src.Event__c,
            Task__c: src.Task__c,
            AttachmentDoc__c: src.AttachmentDoc__c,
            TargetManagement__c: src.TargetManagement__c,
            User__c: src.User__c,
            RecordTypeMaster__c: src.RecordTypeMaster__c,
            AssociateBranchMaster__c: src.AssociateBranchMaster__c,
            MasterGroup__c: src.MasterGroup__c,
            ChildGroupOnly__c: src.ChildGroupOnly__c,
            IndividualOnly__c: src.IndividualOnly__c,
            ExistingContract__c: src.ExistingContract__c,
            ClientClassificationMaster__c: src.ClientClassificationMaster__c,
            CustomerNotes__c: src.CustomerNotes__c,
            AccountContactRelation__c: src.AccountContactRelation__c,
            CampaignOnly__c: src.CampaignOnly__c,
            CampaignMember__c: src.CampaignMember__c,
            OwnCompany__c: src.OwnCompany__c,
            RiderOwnCompany__c: src.RiderOwnCompany__c,
            IncomingChannel_LeadsMaster__c: src.IncomingChannel_LeadsMaster__c,
            OpportunityInsurancePolicyAssociation__c: src.OpportunityInsurancePolicyAssociation__c,
            DesignDocument__c: src.DesignDocument__c,
            ComparisonRecommendedProduct__c: src.ComparisonRecommendedProduct__c,
            BringOut__c: src.BringOut__c,
            Shipping__c: src.Shipping__c,
            Receipt__c: src.Receipt__c,
            Storage__c: src.Storage__c,
            ContactClassMaster__c: src.ContactClassMaster__c,
            Texttemplate__c: src.Texttemplate__c,
            PlanningTargetClassification__c: src.PlanningTargetClassification__c,
            AgencyContactMaster__c: src.AgencyContactMaster__c,
            Contact__c: src.Contact__c,
            Status__c: src.Status__c,
            Product2__c: src.Product2__c,
            ProductCommissionPercent__c: src.ProductCommissionPercent__c,
            AnalyticsPermissionMaster__c: src.AnalyticsPermissionMaster__c,
            ContentDocumentLink__c: src.ContentDocumentLink__c,
            ContentVersion__c: src.ContentVersion__c,
            CKS_DesignDocumentDivision__c: src.CKS_DesignDocumentDivision__c,
            OtherRequest__c: src.OtherRequest__c
        };
    }

    notifyListViewHost(status, recordId) {
        const url = status === 'success'
            ? `/lightning/r/DataMigrationRequest__c/${recordId}/view`
            : '/lightning/o/DataMigrationRequest__c/list';

        // sforce.one を window 自身および親フレームから探す（VF Lightning Out では window に存在）
        try {
            const frames = [window, window.parent, window.top];
            for (const f of frames) {
                if (f && f.sforce && f.sforce.one) {
                    f.sforce.one.navigateToURL(url);
                    return;
                }
            }
        } catch (e) {
            // クロスオリジンアクセス時は無視して次の手段へ
        }

        // postMessage: window 自身へ送信（VF ページのリスナーが同一ウィンドウで待機）
        const msg = { type: 'cksDataMigrationRequestCreateEditResult', status, recordId: recordId || null };
        try { window.postMessage(msg, '*'); } catch (e) {}
        try { window.parent.postMessage(msg, '*'); } catch (e) {}

        // 最終フォールバック
        try { window.top.location.assign(url); } catch (e) {}
        try { window.location.assign(url); } catch (e) {}
    }
}